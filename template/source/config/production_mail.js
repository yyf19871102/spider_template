/**
 * @auth {{author}}
 * @date {{dateTime}}
 * @desc
 */
module.exports = {
	cronTab     : '0 0 8 * * *', // 发送邮件时间
	// 邮箱代理
	transporter : {
		host    : 'smtp.163.com', // 代理邮箱域名
		port:    465, // 端口号
		secure  :true,
		auth    : {
			user: 'your email account', // 邮箱号
			pass: 'your email password' // 密码
		}
	},

	from        : 'your email account', // 发送人
	to          : 'reciever', // 接受人，多个收件人之间使用英文逗号分隔
};