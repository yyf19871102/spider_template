/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc
 */
const Promise       = require('bluebird');

const {common, config: SysConf, logger, redisManager}   = require('../lib');
const {spider: SPIDER_CONF} = SysConf;
const {tools, dateFormat}   = common;
const {redis}       = redisManager;

/**
 * 获取一个代理IP源
 * @returns {Promise.<*>}
 */
exports.getOneProxy = async () => {
	if (SysConf.NET_CONNECT_TEST) {
        let loop = 1;

        let netState;

        do {
            netState = await redis.get(SysConf.NET_MONITOR_KEYS.STATE_NET);

            // 如果返回undefined或者null表示网络和代理监控程序未启动，此时强制停止程序
            if (netState === null || netState === undefined) {
                logger.error('net-monitor未启动！');
                process.exit(1);
            }

            netState = parseInt(netState);

            // 网络状态不好则进入重试状态，以指数形式重试
            if (netState === SysConf.NET_STATE.DISCONNECT ) {
                loop > 11 && (loop = 11);
                logger.warn(`网络不通畅，请求被挂起 ${Math.pow(2, loop)} 秒...`);

                await Promise.delay(Math.pow(2, loop) * 1000);
            } else if (await redis.zcard(SysConf.NET_MONITOR_KEYS.POOL) > 0) {
                // 从代理池中随机取出一个使用
                let proxyList = await redis.zrange(SysConf.NET_MONITOR_KEYS.POOL, 0, -1);
                return proxyList[Math.floor(Math.random() * proxyList.length)];
            } else {
                logger.error(`代理池为空，请求被挂起10s；`);
                await Promise.delay(10 * 1000);
            }

            loop += 1;
        } while(true);
    } else {
        while (true) {
            if (await redis.zcard(SysConf.NET_MONITOR_KEYS.POOL) > 0) {
                // 从代理池中随机取出一个使用
                let proxyList = await redis.zrange(SysConf.NET_MONITOR_KEYS.POOL, 0, -1);
                return proxyList[Math.floor(Math.random() * proxyList.length)];
            } else {
                logger.error(`代理池为空，请求被挂起10s；`);
                await Promise.delay(10 * 1000);
            }
        }
    }
};

/**
 * 获取一个代理IP
 * @returns {Promise<string>}
 */
exports.getOneProxy = async () => {
    let reqConf = {
        uri     : `http://${SysConf.spider.proxyServer}/proxy/getOne`,
        method  : 'GET',
        qs      : {signature: SysConf.spider.signature},
        json    : true,
        timeout : 1000,
    };

    let proxyObj = await tools.timeoutRequest(reqConf);

    let proxy = `${proxyObj.protocol}://`;
    proxyObj.username && proxyObj.password && (proxyObj += `${proxyObj.username}:${proxyObj.password}@`);
    proxyObj += proxyObj.host;
    proxyObj.port && (proxy += `:${proxyObj.port}`);

    return proxy;
};

/**
 * 请求url辅助方法；如果retryTimes小于1，则表示无限重试！有可能导致死循环，慎用！！
 * @param config
 * @param retryTimes
 * @param checkSuccess
 */
exports.requestUrl = async (config, retryTimes = SPIDER_CONF.fetch.retry, checkSuccess) => {
	// config也可以是方法...
	let requestOption = typeof config === "function" ? config() : config;

	!config.timeout && (config.timeout = SPIDER_CONF.fetch.timeout);

	let lastErrMsg = '';
	let loop = 0;
	while(retryTimes > 0 && loop < retryTimes || retryTimes <= 0) {
		if (retryTimes > 0 && loop > retryTimes) return;

		try {
			// 获取一个代理IP
			if (requestOption.useProxy) {
				let proxy = await exports.getOneProxy();
				requestOption.proxy = proxy;
			}


			let data = await tools.timeoutRequest(requestOption);

			// 验证通过
			if (checkSuccess && typeof checkSuccess === 'function' && checkSuccess(data) || !checkSuccess) {
				return data;
			} else {
				loop += 1;
				retryTimes <= 0 && await Promise.delay(50); // 两期请求直接间隔50毫秒
				lastErrMsg = '请求uri的校验不通过！';
			}
		} catch (err) {
		    logger.error('requestUrl 错误！');
		    logger.error(err);
			retryTimes <= 0 && await Promise.delay(50);
			lastErrMsg = err.message;
			err.data = requestOption;

			// 忽略因为代理IP不可用导致的错误
			if (config.useProxy && err.message.indexOf('socket hang up') > -1) {
			} else {
				loop += 1;
			}
		}
	}

	tools.threw(SysConf.ERROR_OBJ.BAD_REQUEST, lastErrMsg, requestOption);
};

/**
 * 生成命名空间
 */
exports.makeNameSpace = () => `spider-${SysConf.NAME}`;