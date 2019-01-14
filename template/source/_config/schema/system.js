/**
 * @author yangyufei
 * @date 2019-01-12 11:46:14
 * @desc
 */
module.exports = {
    type        : 'object',
    properties  : {
        NAME    : {type: 'string'}, // 工程名同
        SITE_NAME: {type: 'string'}, // 主站中文名称，monitor监控时爬虫的名字
        // 开发者列表
        AUTHOR  : {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name    : {type: 'string'}, // 开发者名字
                    startAt : {type: 'string'} // 开始时间
                }
            }
        }
    },
    required    : ['NAME', 'SITE_NAME']
};