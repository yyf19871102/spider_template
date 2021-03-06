/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc
 */
const Promise       = require('bluebird');

const {common, config: SysConf, logger, redisManager}   = require('../lib');
const {TASK_STATUS} = SysConf;
const {redis}       = redisManager;
const {Progress}    = common.tools;
const keyManager    = require('./key_manager');
const utils         = require('./utils');

class Phase {
	constructor(config) {
		this.no = config.no || 1; // 该phase的索引，仅仅用于标识
		this.phaseName = config.phaseName;
		this.maxErrCount = config.maxErrCount || 4; // 最大重试次数
		this.handler = config.handler; // 每个任务的处理方法
		this.concurrency = config.concurrency || SysConf.spider.task.concurrency; // 并发数量
		this.progress = null; // 进度显示封装
		this.mode = config.mode || 'run';
		this.fth = config.fth;

		let prefix = `${utils.makeNameSpace()}:phase${this.no}@${config.phaseName}`;
		this.KEYS = {
			DATA_LIST   : `${prefix}:data`,
			READY_SET   : `${prefix}:ready`,
			ERROR_SET   : `${prefix}:error`,
			FAILED_SET  : `${prefix}:failed`,
			SUCCESS_SET : `${prefix}:successed`,
			OVER_FLAG   : `${prefix}:over`, // 暂时不用
		};
	}

	/**
	 * 初始化
	 * @return {Promise.<void>}
	 */
	async init() {
		// 将键存入keyManager中
		await keyManager.saveKeyObject(this.KEYS);

		// 判断任务是否已经执行完毕
		if (await redis.exists(this.KEYS.OVER_FLAG)) {
			logger.trace(`${this.phaseName}：该阶段已经完成~`);
			return;
		}

		let size = await redis.llen(this.KEYS.DATA_LIST); // 计算任务总数

		let successCount = await redis.scard(this.KEYS.SUCCESS_SET); // 执行成功任务数
		let failCount = await redis.scard(this.KEYS.FAILED_SET); // 执行失败任务数

		// 校验是否有丢失的任务
		if (size > successCount + failCount) {
		    logger.trace(`${this.phaseName}：校验并补充丢失的任务`);
			for (let index = 0; index < size; index ++) {
				!await redis.sismember(this.KEYS.SUCCESS_SET, index) && !await redis.sismember(this.KEYS.FAILED_SET, index) && await redis.sadd(this.KEYS.READY_SET, index);
			}
		}
	}

	/**
	 * 设置执行方法
	 * @param handler
	 */
	setHandler(handler) {
		this.handler = handler;
	}

	/**
	 * 判断该任务是否已经创建过了
	 * @return {Promise.<boolean>}
	 */
	async isCreated() {
		return await redis.llen(this.KEYS.DATA_LIST);
	}

	/**
	 * 清除中间任务数据并将设置结束标志
	 * @return {Promise<void>}
	 */
	async over() {
		await redis.set(this.KEYS.OVER_FLAG, 1);
	}

	/**
	 * 删除任务所有数据
	 * @return {Promise.<void>}
	 */
	async clear() {
		for (let key in this.KEYS) await redis.del(this.KEYS[key]);
	}

	/**
	 * 获取一个任务
	 * @return {Promise<null>}
	 */
	async getOnTask() {
		let taskIndex = await redis.spop(this.KEYS.READY_SET);

		if (taskIndex === null || taskIndex === undefined) {
			return {index: null, task: null};
		} else {
			taskIndex = parseInt(taskIndex);

			let task = await redis.lindex(this.KEYS.DATA_LIST, taskIndex);

			logger.trace(`执行任务：${task}`);
			return {index: taskIndex, task: JSON.parse(task)}
		}
	}

	/**
	 * 完成一个任务
	 * @param index
	 * @param success
	 * @return {Promise<void>}
	 */
	async completeOneTask(index, task, success = true) {
		let key = success ? this.KEYS.SUCCESS_SET : this.KEYS.FAILED_SET;
		await redis.sadd(key, index);
		await redis.zrem(this.KEYS.ERROR_SET, index);

		logger.trace(`完成任务：${JSON.stringify(task)}`);
		this.progress.success();
	}

	/**
	 * 插入该阶段需要执行的任务数据
	 * @param taskList
	 * @return {Promise<Array>}
	 */
	async insertTasks(taskList) {
		if (taskList.length < 1) return;

		let list = taskList.map(task => JSON.stringify(task));
		await redis.lpush(this.KEYS.DATA_LIST, list);
	}

	/**
	 * 一个任务执行错误
	 * @param index
	 * @return {Promise<void>}
	 */
	async setError(index, task) {
		let rank = await redis.zrank(this.KEYS.ERROR_SET, index);

		let errCount;
		if (rank === null || rank === undefined) {
			errCount = 1;
			await redis.zadd(this.KEYS.ERROR_SET, 1, index);
		} else {
			await redis.zincrby(this.KEYS.ERROR_SET, 1, index);
			let errCountStr = await redis.zscore(this.KEYS.ERROR_SET, index);

			errCount = parseInt(errCountStr);
		}

		// 如果错误次数过多，则将该任务放入fail队列中，并从err队列中删除
		if (errCount >= this.maxErrCount) {
		    logger.warn(`${this.phaseName}：record执行失败${JSON.stringify(task)}`);
            this.fth && this.fth.saveTask(this.phaseName, task);
            await redis.sadd(this.KEYS.FAILED_SET, index);
			await redis.zrem(this.KEYS.ERROR_SET, index);
			this.progress.fail();
		} else {
			await redis.sadd(this.KEYS.READY_SET, index);
		}
	}

	/**
	 * 一个并发运行的任务
	 * @return {Promise<void>}
	 * @private
	 */
	async _microTask() {
		while (true) {
			let {task, index} = await this.getOnTask();

			if (!task) break;

			try {
				await this.handler(task);

				await this.completeOneTask(index, task);
			} catch (err) {
			    logger.error(`${this.phaseName} record执行错误：${JSON.stringify(task)}`);
				logger.error(err);
				await this.setError(index, task);
			}
		}
	}

	/**
	 * 并发运行任务
	 * @param handler
	 * @param concurrency
	 * @return {Promise<void>}
	 */
	async run() {
		// 如果该阶段执行结束，则跳过run
		if (!await redis.exists(this.KEYS.OVER_FLAG)) {
			logger.info(`${this.no}.开始执行 ${this.phaseName} 阶段...`);

			let total = await redis.llen(this.KEYS.DATA_LIST);
			let successCount = await redis.scard(this.KEYS.SUCCESS_SET);
			let failCount = await redis.scard(this.KEYS.FAILED_SET);

            for (let index = 0; index < total; index++) {
                let inSuccessSet = await redis.sismember(this.KEYS.SUCCESS_SET, index);
                let inFailedSet = await redis.sismember(this.KEYS.FAILED_SET, index);

                if (!inSuccessSet && !inFailedSet) {
                    await redis.sadd(this.KEYS.READY_SET, index);
                }
            }

			// 生成进度信息
			this.progress = new Progress(total, successCount, failCount, undefined, logger);

            logger.trace(`${this.phaseName}：${this.concurrency}个并发`);
			let ps = [];
			for (let i = 0 ; i < this.concurrency; i++) {
				ps.push(this._microTask());
			}

			await Promise.all(ps);
		}

		await this.over();
	}
}

/**
 * 获取一个phase
 * @param phaseName 阶段名字
 * @param no 该序号
 * @param handler 任务处理方法
 * @return {Promise.<Phase>}
 */
exports.getOnePhase = async (phaseName, no, handler, maxErrCount, concurrency) => {
	let phase = new Phase(phaseName, no, handler, maxErrCount, concurrency);

	await phase.init();

	return phase;
};