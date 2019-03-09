/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc
 */
const moment        = require('moment');

const phaseManager  = require('../core/phase');
const fetcher       = require('./fetcher');
const {config: SysConf} = require('../lib');

exports.makeMacroTasks = async () => {
    return SysConf.spider.test.channels;
};

exports.makePhaseList = async (context) => {
	let autoFilter = context.filterManager['autoFilter'];
	let output = context.outputManager['output'];

	let phaseList = [];

	// 初始化阶段，生成请求参数
	let phaseInit = await phaseManager.getOnePhase('init', 1);

	// 生产各期导航页
	let phaseGetNaviList = await phaseManager.getOnePhase('getNaviList', 2);

	// 抓取导航页数据
	let phaseGetPage = await phaseManager.getOnePhase('getPageInfo', 3);

	phaseInit.setHandler(async channel => {
        let paramsList = [];

        for (let page = channel.startPage; page <= channel.endPage; page++) {
            paramsList.push({channel: channel.id, page});
        }

		await phaseGetNaviList.insertTasks(paramsList);
	});

    phaseGetNaviList.setHandler(async param => {
		let naviList = await fetcher.getNaviData(param.channel, param.page);

        let pageList = [];
        for (let item of naviList) {
            !await autoFilter.exists(item.uri) && pageList.push(item);
        }

        await phaseGetPage.insertTasks(pageList);
	});

	phaseGetPage.setHandler(async pageObj => {
		let page = await fetcher.getPageData('https:' + pageObj.uri, pageObj.view);

		await output.write([page]);
	});

	return [
		phaseInit,
		phaseGetNaviList,
		phaseGetPage
	]
};