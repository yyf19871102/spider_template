/**
 * @author yangyufei
 * @date 2019-01-12 17:45:09
 * @desc
 */
const fs        = require('fs');
const path      = require('path');
const uuid      = require('uuid/v4');
const moment    = require('moment');

const dateFormat= require('../../common/date_format');
const LEVEL     = require('./level');

const config    = {
    dest    : path.join(__dirname, '..', '..', '..', 'logs'),
    byDate  : true,
    fileLines: '2000',
};

const makeFileName = () => `${moment().format('YYYYMMDDHHmmssSSS')}-${uuid()}.log`;

exports.enable = true;

let handler = exports.handler = {};

let dateDir, fileName, lineCount = 0;

!fs.existsSync(config.dest) && fs.mkdirSync(config.dest);

dateDir = path.join(config.dest, dateFormat.getDate());
!fs.existsSync(dateDir) && fs.mkdirSync(dateDir);

fileName = fs.readdirSync(dateDir).length > 0 ? fs.readdirSync(dateDir).filter(file => fs.statSync(path.join(dateDir, file)).isFile()).sort().pop() : makeFileName();
fileName = path.join(dateDir, fileName);

Object.keys(LEVEL).forEach(action => {
    handler[action] = msg => {
        fs.appendFileSync(fileName, JSON.stringify({msg, level: action, dateTime: dateFormat.getFullDateTime()}).replace(/\r|\n/g, '') + '\r\n');
        lineCount += 1;

        if (lineCount >= config.fileLines) {
            lineCount = 0;
            fileName = makeFileName();
        }
    };
});