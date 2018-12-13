/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc 邮箱配置
 */
module.exports = {
	cronTab     : '0 0 8 * * *', // 发送邮件时间
	// 邮箱代理
	transporter : {
		host    : 'smtp.163.com', // 代理邮箱域名
		port:    465, // 端口号
		secure  :true,
		auth    : {
			user: 'yyf19871102@163.com', // 邮箱号
			pass: '0601114034' // 密码
		}
	},

	from        : 'yyf19871102@163.com', // 发送人
	to          : 'yyf19871102@163.com', // 接受人，多个收件人之间使用英文逗号分隔
};