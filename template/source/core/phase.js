/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc
 */
const Promise       = require('bluebird');

const SysConf       = require('../config');
const {TASK_STATUS} = SysConf;
const redis         = require('../db_manager/redis').redis;
const {Progress}    = require('../common/tools');
const keyManager    = require('./key_manager');
const logger        = require('../common/logger');
const utils         = require('./utils');

class Phase {
	constructor(phaseName, no, handler, maxErrCount, concurrency, mode) {
		this.no = no || 1; // 该phase的索引，仅仅用于标识
		this.phaseName = phaseName;
		this.maxErrCount = maxErrCount || 4; // 最大重试次数
		this.handler = handler; // 每个任务的处理方法
		this.concurrency = concurrency || SysConf.SPIDER.task.concurrency; // 并发数量
		this.progress = null; // 进度显示封装
		this.mode = mode || 'run';

		let prefix = `${utils.makeNameSpace()}:phase${this.no}@${phaseName}`;
		this.KEYS = {
			DATA_LIST   : `${prefix}:data`,
			READY_SET   : `${prefix}:ready`,
			ERROR_SET   : `${prefix}:error`,
			FAILED_SET  : `${prefix}:failed`,
			SUCCESS_SET : `${prefix}:successed`,
			OVER_FLAG   : `${prefix}:over`,
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
			return;
		}

		let size = await redis.llen(this.KEYS.DATA_LIST); // 计算任务总数

		let successCount = await redis.scard(this.KEYS.SUCCESS_SET); // 执行成功任务数
		let failCount = await redis.scard(this.KEYS.FAILED_SET); // 执行失败任务数

		// 校验是否有丢失的任务
		if (size > successCount + failCount) {
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
		for (let key in this.KEYS) await redis.del(this.KEYS[key]);
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

			return {index: taskIndex, task: JSON.parse(task)}
		}
	}

	/**
	 * 完成一个任务
	 * @param index
	 * @param success
	 * @return {Promise<void>}
	 */
	async completeOneTask(index, success = true) {
		let key = success ? this.KEYS.SUCCESS_SET : this.KEYS.FAILED_SET;
		await redis.sadd(key, index);

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
		let startIndex = await redis.llen(this.KEYS.DATA_LIST);

		await redis.lpush(this.KEYS.DATA_LIST, list);

		// 生成索引
		for (let no = 0; no < taskList.length; no++) {
			await redis.sadd(this.KEYS.READY_SET, startIndex + no);
		}
	}

	/**
	 * 一个任务执行错误
	 * @param index
	 * @return {Promise<void>}
	 */
	async setError(index) {
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

				await this.completeOneTask(index);
			} catch (err) {
				console.error(err);
				await this.setError(index);
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

			// 生成进度信息
			this.progress = new Progress(total, successCount, failCount);

			let ps = [];
			for (let i = 0 ; i < SysConf.SPIDER.task.concurrency; i++) {
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
exports.getOnePhase = async (phaseName, no, handler) => {
	let phase = new Phase(phaseName, no, handler);

	await phase.init();

	return phase;
};