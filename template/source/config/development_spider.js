/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc 爬虫相关配置
 */
module.exports = {
	outDir  : 'd://tmp/', // 输出文件根路径

	/**
	 * 默认的输出文件夹为：outDir/SysConf.NAME；
	 * 但是如果dirName属性存在,则输出文件夹为：outDir/dirName；
	 */
	// dirName : 'sbgg_ext',

    // 请求接口相关配置项
	fetch   : {
		timeout     : 20000, // http访问超时时间
		retry       : 5, // 访问错误重试次数
	},

    // 任务执行选项
	task    : {
		concurrency : 100, // 并发数据
		retry       : 5, // 任务错误重试次数
	},

	// 测试选项，自定义；在production环境中该选项不起作用；
	test    : {
		enable  : true,
		annNum  : 1,
		endPage : 2,
	},

    /**
     * 运行方式，共3种，分别是
     * once     ：运行一次，用于抓取历史累积数据；
     * forever  ：一直运行，用于抓取无法估计每轮更新时间的任务；
     * cron     ：定时任务，一般是每日更新
     */
	run     : {
		type: 'once', // 运行方式，共3种：once
	}
};