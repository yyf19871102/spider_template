/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc
 */
const cheerio           = require('cheerio');

const {requestUrl}      = require('../core/utils');
const SysConf           = require('../config');
const {timeout, retry}  = SysConf.SPIDER.fetch;

/**
 * 获取一期有多少数据
 * @returns {Promise<number>}
 */
exports.getAnnCount = async () => {
	let reqConf = {
		uri     : 'http://sbgg.saic.gov.cn:9080/tmann/annInfoView/homePage.html',
		method  : 'GET',
		// useProxy: true,
		timeout,
		transform: res => cheerio.load(res),
	};

	let $ = await requestUrl(reqConf, retry, $ => $('.odd_bg').length > 0);

	let annList = [];

	$('.odd_bg').each(function () {
		let annNum = $(this).find('td:first-child').text().replace(/\r|\n|\s|第|期/g, '');
		let annDateArr = $(this).find('td:nth-child(2)').text().replace(/\r|\n|\s|初步审定公告日期：/g, '').split(/年|月|日/g);

		let annDate = new Date(parseInt(annDateArr[0]), parseInt(annDateArr[1] - 1), parseInt(annDateArr[2]));

		annList.push({annNum, annDate});
	});

	let str = $('.odd_bg:nth-child(2) > td:first-child').text().replace(/\r|\n|\s|第|期/g, '');

	return {maxNum: parseInt(str), annList};
};

/**
 * 读取指定导航页的数据
 * @param ann
 * @param page
 * @returns {Promise<*|void>}
 */
exports.getNaviData = async (ann, page) => {
	let reqConf = {
		uri     : 'http://sbgg.saic.gov.cn:9080/tmann/annInfoView/annSearchDG.html',
		method  : 'POST',
		useProxy: true,
		timeout,
		form    : {
			page,
			rows: SysConf.SPIDER.navi_page_size,
			annNum: ann
		},
		json    : true,
	};

	return await requestUrl(reqConf, 5, res => res.hasOwnProperty('rows'));
};