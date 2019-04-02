const tools = require('./core/utils');

const testBaidu = async () => {
    let reqConf = {
        uri     : 'http://172.18.67.26:9110/proxy/getOne?signature=CMCC10086',
        method  : 'GET',
        json    : true
    };

    let data = await tools.requestUrl(reqConf);

    console.log(data)
    reqConf.uri = 'https://www.baidu.com';
    // reqConf.proxy = `${data.data.protocol}://${data.data.username}:${data.data.password}@${data.data.host}:${data.data.port}`;
    reqConf.useProxy = true;

    console.log(reqConf)
    console.log(await tools.requestUrl(reqConf, 1));
};

testBaidu();