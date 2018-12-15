/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc 爬虫相关配置
 */
module.exports = {
    outDir  : '/wltx/home/', // 输出文件根路径

	fetch   : {
		timeout     : 20000,
		retry       : 5,
	},

	task    : {
		concurrency : 100,
		retry       : 5,
	},

	run     : {
		type: 'cron',
		cron: '0 15 0 * * *'
	},
};