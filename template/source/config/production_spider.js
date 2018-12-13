/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc 爬虫相关配置
 */
module.exports = {
	out     : {
		namePrefix  : '{{project}}', // 输出文件名前缀
	},

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