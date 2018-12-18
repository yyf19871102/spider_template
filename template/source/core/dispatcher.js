/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc 任务分发器
 */
const Promise   = require('bluebird');

const SysConf   = require('../config');
const redis     = require('../db_manager/redis').redis;
const logger    = require('../common/logger');
const keyManager= require('./key_manager');
const utils     = require('./utils');
const impl      = require('../spider/impl');
const taskManager= require('./task');
const tools     = require('../common/tools');
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
			impl.makeMacroTasks = defaultMakeMacroTasks;
		}

		// 初始化output和filter
		this.context.outputManager = await outputManager.getOutputManager();
		this.context.filterManager = await filterManager.get();

		// 保存key值
		await keyManager.saveKeyObject(this.KEYS);

		// 生成多个Job任务
		if(await redis.llen(this.KEYS.DATA_LIST) <= 0) {
			let taskList;

			// 如果获取不到城市数据，后面所有阶段都无法正常进行
			while(true) {
				try {
					taskList = await impl.makeMacroTasks(this.context);
					break;
				} catch (err) {
					logger.error(err);
					logger.warn('dispatcher init阶段无法获取macroTasks，5s后重试...');
					await Promise.delay(5000);
				}
			}

			taskList = taskList.map(record => JSON.stringify(record));

			await redis.lpush(this.KEYS.DATA_LIST, taskList);
		}

		// 设置执行Job任务的index
		!await redis.exists(this.KEYS.INDEX) && await redis.set(this.KEYS.INDEX, 0);
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
			await task.init();
			await task.run();
			await task.clear();
		}

		logger.info(`${SysConf.NAME}抓取结束。`);
	}

	async clear() {
		await keyManager.clearAllKeys();
	}
}

/**
 * 获取dispatcher
 * @return {Promise.<Dispatcher>}
 */
exports.get = async () => {
	let dispatcher = new Dispatcher();
	await dispatcher.init();
	return dispatcher;
};