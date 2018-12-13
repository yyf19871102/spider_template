/**
 * @auth yangyufei
 * @date 2018-12-13 09:54:12
 * @desc
 */
let person = {
	name: 'yyf',
};

person.say = async function () {
	console.log(this.name)
};

person.say();