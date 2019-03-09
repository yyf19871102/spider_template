/**
 * @author yangyufei
 * @date 2019-03-07 15:46:49
 * @desc
 */
const cheerio           = require('cheerio');
const iconv             = require('iconv-lite');
const moment            = require('moment');

const {requestUrl}      = require('../core/utils');

/**
 * 读取导航页
 * @param channelId
 * @param page
 * @returns {Promise<Array>}
 */
exports.getNaviData = async (channelId, page) => {
    let reqConf = {
        uri     : `https://www.autohome.com.cn/${channelId}/${page}/#liststart`,
        encoding: null,
        method  : 'GET',
        useProxy: false,
        transform: res => cheerio.load(iconv.decode(res,'gbk'))
    };

    let $ = await requestUrl(reqConf, null, $ => $('.article > li').length > 0);
    
    let naviList = [];
    $('.article > li').each(function () {
        if ($(this).find('a').length > 0) {
            let uri = $(this).find('a').attr('href');
            let view = $(this).find('a .fn-right > em:first-child').text();
            if (/万/g.test(view)) {
                view = view.replace('万');
                view = parseFloat(view) * 10000;
            } else {
                view = parseFloat(view);
            }

            naviList.push({uri, view});
        }
    });

    return naviList;
};

/**
 * 读取详情页
 * @param uri
 * @param view
 * @returns {Promise<{title: jQuery, author: jQuery, postTime: jQuery, view: *, content: jQuery, uri: *, createdAt: string}>}
 */
exports.getPageData = async (uri, view) => {
    let reqConf = {
        uri,
        encoding: null,
        method  : 'GET',
        useProxy: false,
        transform: res => cheerio.load(iconv.decode(res,'gbk'))
    };

    let $ = await requestUrl(reqConf, null, $ => $('#articlewrap').length > 0);

    let data = {
        title   : $('#articlewrap h1').text().replace(/\r|\n|(^\s*)|(\s*$)/g, ''),
        author  : $('.article-info a.name').text().replace(/\r|\n|(^\s*)|(\s*$)/g, ''),
        postTime: $('.article-info .time').text().replace(/\r|\n|(^\s*)|(\s*$)/g, ''),
        view,
        content : $('#articleContent').text().replace(/\r|\n|(^\s*)|(\s*$)/g, ''),
        uri,
        createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
    };

    return data;
};