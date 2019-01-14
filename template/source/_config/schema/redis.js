/**
 * @author yangyufei
 * @date 2019-01-12 15:14:03
 * @desc
 */
const single = {
    type    : 'object',
    properties: {
        host    : {type: 'string', format: 'ipv4', default: '127.0.0.1'}, // 地址
        port    : {type: 'integer', minimum: 1, default: 6379}, // 端口号
        password: {type: 'string'}, // 密码
    }
};

module.exports = {
    single, // 单机部署
    cluster: {type: 'array', items: single} // 集群部署
};