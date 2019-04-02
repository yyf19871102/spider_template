/**
 * @author yangyufei
 * @date 2019-03-07 14:14:08
 * @desc
 */
module.exports = {
    NAME        : '{{project}}', // 工程名同
    SITE_NAME   : '', // 主站中文名称

    KEY         : 'autohome', // 信源关键字

    /**
     * 每个item应该是一个对象，该对象包含2个属性，开发者名字和开始开发的时间
     * 例如：
     * {name: '张三', startAt: '2019-01-09'}
     */
    AUTHOR      : [],

    // 信源配置，每个信源对应一个接口/out文件
    XINYUAN     : {
        output  : {
            /**
             * out文件名前缀；
             * 建议和信源关键字一致
             */
            key     : 'autohome',

            /**
             * schema详细使用见 https://github.com/epoberezkin/ajv
             */
            schema  : {
                type: 'object',
                properties  : {
                    title   : {type: 'string', maxLength: 100},
                    author  : {type: 'string', maxLength: 100},
                    postTime: {type: 'string', maxLength: 100},
                    view    : {type: 'integer'},
                    content : {type: 'string'},
                    uri     : {type: 'string', maxLength: 100},
                    createdAt: {type: 'string', maxLength: 50},
                },
                required    : ['uri']
            },
            // sort    : 'asc', // 输出文件是否排序

            /**
             * 如果subDir存在，则生成一个子目录，子目录里面存放相关out文件
             */
            // subDir  : 'info', // 如果subDir存在，则生成一个子目录，子目录里面存放相关out文件
        }
    },

    // 过滤器配置
    FILTER      : {
        autoFilter   : {
            name    : 'autohomeArticleId', // 过滤器名字
            type    : 2, // 过滤器类型
        }
    }
};