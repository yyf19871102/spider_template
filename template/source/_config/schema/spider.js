/**
 * @author yangyufei
 * @date 2019-01-12 15:54:27
 * @desc
 */
module.exports = {
    type    : 'object',
    properties: {
        outDir  : {type: 'string', checkDir: true}, // 输出文件根路径
        threadNum: {type: 'integer', minimum: 1, default: 1}, // 开启线程数量
        keywordOfSeed: {type: 'string'}, // 打印日志时，显示当前执行的seed的关键字段

        /**
         * 默认的输出文件夹为：outDir/SysConf.NAME；
         * 但是如果dirName属性存在,则输出文件夹为：outDir/dirName；
         */
        dirName : {type: 'string'},

        // 请求接口相关配置项
        fetch   : {
            type: 'object',
            properties: {
                timeout : {type: 'integer', minimum: 1, default: 20000}, // http访问超时时间
                retry   : {type: 'integer', minimum: -1, default: 5}, // 访问错误重试次数
            },
            default: {timeout: 2000, retry: 5}
        },

        // 任务执行选项
        task    : {
            type: 'object',
            properties: {
                concurrency : {type: 'integer', minimum: 1, default: 100}, // 并发数据
                retry: {type: 'integer', minimum: 1, default: 5}, // 任务错误重试次数
            },
            default: {concurrency: 100, retry: 5}
        },

        /**
         * 运行方式，共3种，分别是
         * once     ：运行一次，用于抓取历史累积数据；
         * forever  ：一直运行，用于抓取无法估计每轮更新时间的任务；
         * cron     ：定时任务，一般是每日更新
         */
        run     : {
            type: 'object',
            properties: {
                type    : {type: 'string', enum: ['forever', 'once', 'cron']}, // 运行方式，共3种：once
                cron    : {type: 'string'}, // cron表达式
            },
            required: ['type'],
        }
    },
    required: ['outDir', 'run']
};