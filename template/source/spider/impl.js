/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc
 */
const moment        = require('moment');

const phaseManager  = require('../core/phase');
const fetcher       = require('./fetcher');
const SysConf       = require('../config');

exports.makePhaseList = async (context) => {
	let annFilter = context.filterManager[SysConf.FILTER.annFilter];
	let output = context.outputManager[SysConf.XINYUAN.output];

	let phaseList = [];

	// 初始化阶段，主要获取各期都有多少数据
	let phaseInit = await phaseManager.getOnePhase('init', 1);

	// 生产各期导航页
	let phaseMakeNaviParams = await phaseManager.getOnePhase('makeNaviParams', 2);

	// 抓取导航页数据
	let phaseGetNavi = await phaseManager.getOnePhase('getNavi', 2);

	phaseInit.setHandler(async () => {
		let {maxNum, annList} = await fetcher.getAnnCount();

		let params = [];
		if (SysConf.SPIDER.run.type === 'cron') {
			for (let ann of annList) {
				!await annFilter.exists(ann.annNum + '') && params.push({ann: ann.annNum});
			}
		} else if (SysConf.SPIDER.run.type === 'once') {
			let testOpt = SysConf.SPIDER.test;

			for (let ann = 1; ann <= maxNum; ann ++) {
				if (!testOpt || testOpt && testOpt.enable && ann === testOpt.annNum) {
					params.push({ann});
				}
			}
		} else {
			logger.warn(`错误的run type：${SysConf.SPIDER.run.type}`);
		}

		await phaseMakeNaviParams.insertTasks(params);
	});

	phaseMakeNaviParams.setHandler(async annObj => {
		let {total, rows} = await fetcher.getNaviData(annObj.ann, 1);

		await output.write(rows);

		let endPage = Math.ceil(total / config.pageSize);
		let pageList = [];

		let testOpt = SysConf.SPIDER.test;
		testOpt && testOpt.enable && (endPage = testOpt.endPage);
		for (let page = 2; page <= endPage; page ++) {
			pageList.push({ann: annObj.ann, page});
		}

		await phaseGetNavi.insertTasks(pageList);
	});

	phaseGetNavi.setHandler(async annObj => {
		let {rows} = await fetcher.getNaviData(annObj.ann, annObj.page);

		await output.write(rows);
	});

	return [
		phaseInit,
		phaseMakeNaviParams,
		phaseGetNavi
	]
};