/**
 * @author yangyufei
 * @date 2019-03-08 15:24:55
 * @desc 任务分发器
 */
const Promise   = require('bluebird');
const moment    = require('moment');
const uuid      = require('uuid/v4');
const failedTasksHandler = require('@nodejs/spider-faith');

const {common, config: SysConf, logger, redisManager, keyManager}   = require('../lib');
const {redis}   = redisManager;
const utils     = require('./utils');
const impl      = require('../spider/impl');
const taskManager= require('./task');
const {tools}   = common;
const outputManager = require('./output');
const filterManager = require('./filter');

const defaultMakeMacroTasks = async () => [{msg: 'This is a placeholder.'}];

class Dispatcher {
	constructor() {
		let prefix = utils.makeNameSpace();
		this.KEYS = {
			DATA_LIST   : `${prefix}:dispatcher:data`,
			INDEX       : `${prefix}:dispatcher:index`,
		};

		this.context = {
			jobId           : `${moment().format('YYYYMMDDHHmmss')}@${uuid()}`,
			filterManager   : {},
			outputManager   : {}
		};
	}

	/**
	 * 初始化，主要是生成macroTasks数据
	 * @return {Promise.<void>}
	 */
	async init() {
		// 默认生成macro任务
		if (!impl.makeMacroTasks || typeof impl.makeMacroTasks !== 'function') {
			logger.trace('dispatcher init：未发现自定义makeMacroTasks，使用系统默认MacroTasks');
			impl.makeMacroTasks = defaultMakeMacroTasks;
		}

		let fthConf = {
            jobId   : this.context.jobId,
            spiderKey: SysConf.KEY,
        };
		if (SysConf.spider.run.type === 'fix') {
            !SysConf.spider.run.parentId && logger.warn(`fix模式下未指定parentId，jobId：${fthConf.jobId}`);

            fthConf.parentId = SysConf.spider.run.parentId;
        }

		this.context.fth = failedTasksHandler.getInstance(fthConf);
		this.context.fth.startJob();

		// 初始化output和filter
        logger.trace('dispatcher init：初始化output组件');
		this.context.outputManager = await outputManager.getOutputManager();
        logger.trace('dispatcher init：初始化filter组件');
		this.context.filterManager = await filterManager.get();

		// 保存key值
		await keyManager.saveKeyObject(this.KEYS);

		// 生成多个Job任务
		if(await redis.llen(this.KEYS.DATA_LIST) <= 0) {
			let taskList;

            // 如果获取不到batch数据，后面所有阶段都无法正常进行
            for (let i = 0 ; i < SysConf.spider.task.retry; i++) {
                try {
                    logger.trace('dispatcher生成macroTasks');
                    taskList = await impl.makeMacroTasks(this.context);
                    break;
                } catch (err) {
                    logger.error(err);
                    logger.warn('dispatcher init阶段无法获取macroTasks，5s后重试...');
                    await Promise.delay(5000);
                }
            }
			// while(true) {
			// 	try {
			// 	    logger.trace('dispatcher生成macroTasks');
			// 		taskList = await impl.makeMacroTasks(this.context);
			// 		break;
			// 	} catch (err) {
			// 		logger.error(err);
			// 		logger.warn('dispatcher init阶段无法获取macroTasks，5s后重试...');
			// 		await Promise.delay(5000);
			// 	}
			// }

            if (taskList) {
                taskList = taskList.map(record => JSON.stringify(record));

                await redis.lpush(this.KEYS.DATA_LIST, taskList);
            } else {
			    this.context.fth.saveTask(`${utils.makeNameSpace()}:phase0@makeMacroTasks`, {msg: 'Bad macroTasks'});
            }
		}

		// 设置执行Job任务的index
		!await redis.exists(this.KEYS.INDEX) && await redis.set(this.KEYS.INDEX, 0);

        impl.hasOwnProperty('afterInit') && typeof impl.afterInit === 'function' && await impl.afterInit(this.context);
	}

	/**
	 * 运行各个maroTask任务
	 * @return {Promise.<void>}
	 */
	async run() {
		logger.info('=============================================');

		logger.info(`开始抓取${SysConf.NAME}...`);

		await this.init();

		let len = await redis.llen(this.KEYS.DATA_LIST);
		let index = parseInt(await redis.get(this.KEYS.INDEX));

		for (; index < len; index++) {
			// 更新redis中的index的状态
			await redis.set(this.KEYS.INDEX, index);
			let seed = JSON.parse(await redis.lindex(this.KEYS.DATA_LIST, index));

			logger.info(`【总进度 ${index + 1}/${len}】：${((index + 1) / len * 100).toFixed(2)}%；==> ${JSON.stringify(seed)}`);

			let task = await taskManager.get(seed, this.context);
			await task.run();

			if (!SysConf.spider.hasOwnProperty('doNotClear') || SysConf.spider.hasOwnProperty('doNotClear') && SysConf.spider === false) {
                await task.clear();
            }
		}

		logger.info(`${SysConf.NAME}抓取结束。`);
	}

	async clear() {
	    impl.hasOwnProperty('preClear') && typeof impl.preClear === 'function' && await impl.preClear(this.context);

        if (!SysConf.spider.hasOwnProperty('doNotClear') || SysConf.spider.hasOwnProperty('doNotClear') && SysConf.spider.doNotClear === false) {
            await keyManager.clearAllKeys();
        }

        this.context.fth.endJob();
	}
}

/**
 * 获取dispatcher
 * @return {Promise.<Dispatcher>}
 */
exports.get = async () => {
	let dispatcher = new Dispatcher();
	return dispatcher;
};