/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc
 */
const _             = require('lodash');

const logger        = require('../common/logger');
const tools         = require('../common/tools');
const SysConf       = require('../config');
const {ERROR_OBJ}   = SysConf;
const impl          = require('../spider/impl');

class Task {
	constructor(seed, context = {}) {
		this.seed = seed;
		this.context = context;

		this.phaseList = [];
	}

	/**
	 * 初始化
	 * @return {Promise.<void>}
	 */
	async init() {
		if (!impl.makePhaseList || typeof impl.makePhaseList !== 'function') {
			tools.threw(ERROR_OBJ.BAD_CONFIG, 'impl中未配置makePhaseList方法！')
		}

		// 生成各个阶段
		this.phaseList = await impl.makePhaseList(this.context);

		// 初始化第一个阶段的任务集合
		this.phaseList.length > 0 && !await this.phaseList[0].isCreated() && await this.phaseList[0].insertTasks([this.seed]);
	}

	/**
	 * 运行各个阶段的任务
	 * @return {Promise.<void>}
	 */
	async run() {
		for (let no = 0 ; no < this.phaseList.length; no++) {
			let phase = this.phaseList[no];
			await phase.run();
		}

		// 清除所有output中残留的数据
		for (let output in this.context.outputManager) await output.clear();
	}

	/**
	 * 清除各个阶段中的（redis）中的任务数据
	 * @return {Promise.<void>}
	 */
	async clear() {
		for (let phase of this.phaseList) await phase.clear();
	}
}

/**
 * 获取任务管理器
 * @param seed
 * @param context
 * @return {Promise.<Task>}
 */
exports.get = async (seed, context) => {
	let task = new Task(seed, context);
	await task.init();

	return task;
};