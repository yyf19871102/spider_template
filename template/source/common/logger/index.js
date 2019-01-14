/**
 * @author yangyufei
 * @date 2019-01-12 17:08:27
 * @desc
 */
const fs        = require('fs');
const path      = require('path');

const ENV       = require('../../_config').ENV;
const LEVEL     = require('./level'); // 输出等级

let logger = module.exports = {};

// 加载所有实现
let managers = [];
fs.readdirSync(path.join(__dirname)).forEach(fileName => {
    if (/^impl_(.*).js$/.test(fileName)) {
        let manager = require(path.join(__dirname, fileName));
        !manager.hasOwnProperty('level') && (manager.level = {});

        manager.enable && managers.push(manager);
    }
});

for (let levelName in LEVEL) {
    let currentLevel = LEVEL[levelName];
    if (currentLevel === 0) continue;

    logger[levelName] = function (msg) {
        // 遍历所有日志实现
        managers.forEach(manager => {
            let levelObj = manager.level[ENV]; // 获取日志实现的执行等级

            (levelObj === null || levelObj === undefined) && (levelObj = 0);

            typeof levelObj === 'number' && (levelObj === currentLevel || levelObj === 0) && manager.handler[levelName](msg);

            if (Array.isArray(levelObj)) {
                let minLevel = levelObj[0], maxLevel = levelObj[1];

                !minLevel && (minLevel = 0);
                !maxLevel && (maxLevel = 10);

                typeof minLevel === 'number' && typeof maxLevel === 'number' && currentLevel >= minLevel && currentLevel <= maxLevel && manager[levelName](msg);
            }
        })
    }
}