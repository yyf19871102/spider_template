/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc 启动爬虫启动
 */
const schedule      = require('node-schedule');
const Promise       = require('bluebird');

const dispatcher    = require('./core/dispatcher');
const {config: SysConf, logger}   = require('./lib');

const run = async () => {
	let spider = await dispatcher.get();
	await spider.run();
	logger.trace('爬虫抓取结束，开始清理中间数据...');
	await spider.clear();
	logger.trace('爬虫完成一轮抓取。');
};

const forever = async () => {
    while(true) {
        await run();
        await Promise.delay(10 * 60 * 1000);
    }
};

logger.trace(`启动爬虫，工程名：${SysConf.NAME}；开发人员：${SysConf.AUTHOR.join()}；输出目录：${SysConf.spider.outDir}；运行方式：${SysConf.spider.run.type}；`);
if (SysConf.spider.run.type === 'once') {
	run();
} else if (SysConf.spider.run.type === 'cron') {
	schedule.scheduleJob(SysConf.spider.run.cron, run);
} else if (SysConf.spider.run.type === 'forever') {
    forever();
} else {
	logger.warn(`错误的run type选项：${SysConf.spider.run.type}`);
}