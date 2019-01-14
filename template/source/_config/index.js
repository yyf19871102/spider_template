/**
 * @author yangyufei
 * @date 2019-01-12 11:17:45
 * @desc
 */
const fs        = require('fs');
const path      = require('path');
const Ajv       = require('ajv');
const ajv       = new Ajv({useDefaults: true});
const _         = require('lodash');

const dateFormat= require('../common/date_format');

const ENV       = process.env.NODE_ENV || 'development';

const config = module.exports = {
    ENV,

    // 错误相关信息
    ERROR_OBJ   : {
        SUCCESS     : {code: 0, msg: '操作成功！'},

        DEFAULT     : {code: 100, msg: '系统错误！'},
        TIMEOUT     : {code: 101, msg: '请求访问超时！'},
        RETRYOUT    : {code: 102, msg: '超过最大重试次数！'},
        PARSEJSON   : {code: 103, msg: '异常非json数据！'},
        BAD_REQUEST : {code: 104, msg: 'uri请求错误！'},
        BAD_CONFIG  : {code: 105, msg: '配置错误！'},
        CHECK_RULE  : {code: 106, msg: '网站接口/页面规则校验不通过！'},
        BAD_OUTPUT  : {code: 107, msg: '输出数据校验失败！'}
    },

    // 网络监控相关keys
    NET_MONITOR_KEYS: {
        STATE_NET   : 'network:connect:state', // 当前网络基本状态
        NET_LAST_TEST: 'network:connect:lastTestTime', // 上次检查网络状态时间
        POOL        : 'network:proxy:pool', // 代理池
    },

    // 网络状态
    NET_STATE       : {
        DISCONNECT  : -1, // 网络不通
        GOOD        : 1, // 通畅
    },

    // 任务状态
    TASK_STATUS     : {
        BIG_RECORD  : -2, // 查询条件下数据过多，需要再次分割
        ERROR       : -1, // 失败
        WAITING     : 0, // 等待
        RUNNING     : 1, // 运行中
        SUCCESS     : 2, // 成功
    },

    // 过滤器类型
    FILTER_TYPE     : {
        SIMPLE      : 1, // 简单过滤器
        EXPIRE      : 2, // 带过期的过滤器
    },
};

// 校验文件夹是否存在
ajv.addKeyword('checkDir', {
    validate: function(check, filePath) {
        return check !== true || check === true && fs.existsSync(filePath);
    }
});

const loadCfg = (cfgPath, subProp = true) => {
    let {name: cfgName, ext} = path.parse(cfgPath);

    if (ext === '.json') {
        let schemaPath = path.join(__dirname, 'schema', `${cfgName}.js`);
        if (fs.existsSync(schemaPath)) {
            let schema = require(schemaPath);

            let cfg = require(cfgPath);

            cfgName === 'redis' && (schema = typeof cfg === 'object' ? schema.single : schema.cluster);
            cfgName === 'spider' && cfg.run.type === 'cron' && schema.properties.run.required.push('cron');

            let validate = ajv.compile(schema);

            if (validate(cfg)) {
                subProp ? (config[cfgName.toUpperCase()] = cfg) : _.merge(config, cfg);
            } else {
                console.error(`[${dateFormat.getFullDateTime()}]Init|配置文件校验失败：${cfgPath}`);
                console.error(validate.errors)
            }
        } else {
            console.warn(`[${dateFormat.getFullDateTime()}]Init-配置文件没有对应的schema校验文件：${cfgPath}`);
        }
    } else {
        console.warn(`[${dateFormat.getFullDateTime()}]Init-非json类型文件无法加载到SysConf中：${cfgPath}`);
    }
};

loadCfg(path.join(__dirname, 'system.json'), false);

let dirPath = path.join(__dirname, config.ENV);
fs.readdirSync(dirPath).forEach(fileName => {loadCfg(path.join(dirPath, fileName))});
