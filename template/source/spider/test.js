/**
 * @auth yangyufei
 * @date 2018-12-12 17:34:56
 * @desc
 */
const fetcher = require('./fetcher');
const fs = require('fs');

fetcher.getAnnCount().then(data => {
    console.log(JSON.stringify(data, null, 4))
});

// fetcher.getNaviData(1, 1, 1000).then(data => {
//     fs.writeFileSync('d://getNaviData.json', JSON.stringify(data, null, 4));
// });