/**
 * @author yangyufei
 * @date 2019-01-12 10:36:04
 * @desc 加载所有相关对象
 */
const fs    = require('fs');
const path  = require('path');
const _     = require('lodash');

const ac = module.exports = {};

/**
 * 驼峰式命名
 * @param name
 * @returns {string}
 */
const transformName = name => {
    let res = '';
    name.replace('.js', '').split('_').forEach((str, index) => {
        str && (res += index ? str.slice(0, 1).toUpperCase() + str.slice(1) : str);
    });
    return res;
};

/**
 * 加载指定目录下的所有模块
 * @param moduleName
 */
const loadModule = moduleName => {
    let result = {};
    fs.readdirSync(path.join(__dirname, moduleName)).forEach(fileName => {
        let t = new Date().getTime();
        result[transformName(fileName)] = require(path.join(__dirname, moduleName, fileName));
    });
    return result;
};

_.merge(ac, loadModule('common'));
ac.SysConf = require('./_config');
_.merge(ac, loadModule('core'));
ac.srvRedis = require('./db_manager/redis');