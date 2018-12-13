/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc
 */
const schedule      = require('node-schedule');

const dispatcher    = require('./core/dispatcher');
const SysConf       = require('./config');

const run = async () => {
	let spider = await dispatcher.get();
	await spider.init();
	await spider.run();
	await spider.clear();
};

if (SysConf.SPIDER.run.type === 'once') {
	run();
} else if (SysConf.SPIDER.run.type === 'cron') {
	schedule.scheduleJob(SysConf.SPIDER.run.cron, run);
} else {
	logger.warn(`错误的run type选项：${SysConf.SPIDER.run.type}`);
}