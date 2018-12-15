/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc
 */
const moment        = require('moment');

const phaseManager  = require('../core/phase');
const fetcher       = require('./fetcher');
const SysConf       = require('../config');

const NAVI_PAGE_SIZE= 1000;

exports.makePhaseList = async (context) => {
	let annFilter = context.filterManager['annFilter'];
	let output = context.outputManager['output'];

	let phaseList = [];

	// 初始化阶段，主要获取各期都有多少数据
	let phaseInit = await phaseManager.getOnePhase('init', 1);

	// 生产各期导航页
	let phaseMakeNaviParams = await phaseManager.getOnePhase('makeNaviParams', 2);

	// 抓取导航页数据
	let phaseGetNavi = await phaseManager.getOnePhase('getNavi', 2);

	phaseInit.setHandler(async () => {
        let params = [];

        let testOpt = SysConf.SPIDER.test;
        if (testOpt && testOpt.enable === true) {
            await annFilter.exists(testOpt.annNum + '');
            params.push({ann: testOpt.annNum});
        } else {
            let {maxNum, annList} = await fetcher.getAnnCount();

            if (SysConf.SPIDER.run.type === 'cron') {
                for (let ann of annList) {
                    !await annFilter.exists(ann.annNum + '') && params.push({ann: ann.annNum});
                }
            } else if (SysConf.SPIDER.run.type === 'once') {
                for (let ann = 1; ann <= maxNum; ann ++) {
                    params.push({ann});
                }
            } else {
                logger.warn(`错误的run type：${SysConf.SPIDER.run.type}`);
            }
        }

		await phaseMakeNaviParams.insertTasks(params);
	});

	phaseMakeNaviParams.setHandler(async annObj => {
		let {total, rows} = await fetcher.getNaviData(annObj.ann, 1, NAVI_PAGE_SIZE).catch(console.error);

		await output.write(rows);

		let endPage = Math.ceil(total / NAVI_PAGE_SIZE);
		let pageList = [];

		let testOpt = SysConf.SPIDER.test;
		testOpt && testOpt.enable && (endPage = testOpt.endPage);
		for (let page = 2; page <= endPage; page ++) {
			pageList.push({ann: annObj.ann, page});
		}

		await phaseGetNavi.insertTasks(pageList);
	});

	phaseGetNavi.setHandler(async annObj => {
		let {rows} = await fetcher.getNaviData(annObj.ann, annObj.page, NAVI_PAGE_SIZE);

		await output.write(rows);
	});

	return [
		phaseInit,
		phaseMakeNaviParams,
		phaseGetNavi
	]
};