/**
 * @author yangyufei
 * @date 2019-03-07 14:17:35
 * @desc
 */
const path      = require('path');
const common    = require('@nodejs/spider-common');
const logLoader = require('@nodejs/spider-logger');

const lib = module.exports = {
    config  : common.configLoader(path.join(__dirname, '..', 'config'))
};

lib.logger = logLoader.getLogger(lib.config.log);

lib.redisManager = common.getRedisManager(lib.config.redis, lib.logger);

lib.common = common;

lib.keyManager = common.keyManager.getInstance(lib.redisManager.redis, lib.config.NAME);