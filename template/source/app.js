/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc 启动爬虫启动
 */
const schedule      = require('node-schedule');

const dispatcher    = require('./core/dispatcher');
const SysConf       = require('./config');

const run = async () => {
	let spider = await dispatcher.get();
	await spider.run();
	await spider.clear();
};

const forever = async () => {
    while(true) {
        await run;
        await Promise.delay(10 * 60 * 1000);
    }
};

if (SysConf.SPIDER.run.type === 'once') {
	run();
} else if (SysConf.SPIDER.run.type === 'cron') {
	schedule.scheduleJob(SysConf.SPIDER.run.cron, run);
} else if (SysConf.SPIDER.run.type === 'forever') {
    forever();
} else {
	logger.warn(`错误的run type选项：${SysConf.SPIDER.run.type}`);
}