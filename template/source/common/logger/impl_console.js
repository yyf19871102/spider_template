/**
 * @author yangyufei
 * @date 2019-01-12 16:57:50
 * @desc
 */
const log4js	= require('log4js');
const path      = require('path');

/**
 * 输出配置
 * @type {{production: number}}
 */
exports.level = {production  : 3};

exports.enable = true;

// log4js配置
let config	= {
    appenders   : {
        console : { type: 'console' },  //控制台输出
    },
    categories: {
        default     : {appenders: ['console'], level: 'all'}
    }
};

log4js.configure(config);

exports.handler = log4js.getLogger();