/**
 * @author yangyufei
 * @date 2019-01-12 10:58:07
 * @desc
 */
const request = require('request');
const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const ac = require('./application_context');

const download = async (uri, dest, i) => {
    return await new Promise((resolve, reject) => {
        const wstream = fs.createWriteStream(dest);

        request(uri).pipe(wstream);

        wstream.on('finish', resolve);
        wstream.on('error', (err) => {
            console.error(i);
        });
    });
};

const getPics = async () => {
    let ps = [];

    for (let i = 0 ; i < 10; i++) {
        ps.push(download('http://my.csdn.net/uploads/201205/16/1337135120_7984.jpg', `e://tmp/${i}.jpg`, i));
    }

    await Promise.all(ps);

    console.log('ok');
};

let {logger} = ac;
logger.debug('aaaaaaaaa')