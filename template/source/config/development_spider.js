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

	fetch   : {
		timeout     : 20000,
		retry       : 5,
	},

	task    : {
		concurrency : 100,
		retry       : 5,
	},

	test    : {
		enable  : true,
		annNum  : 1,
		endPage : 2,
	}, // 测试选项

	run     : {
		type: 'once', // 运行方式
	},

	navi_page_size: 10000, // 导航页每页多少数据
};