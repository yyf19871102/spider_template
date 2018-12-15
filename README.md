# NODEJS爬虫模板工程
### 1.模板目录结构简要说明
    |docs  // 存放项目非源码的doc或是txt等说明文件
    |--|project   // 存放项目开发完毕后需要提交的文件；包括一份接口文档示例（excel）、一份开发说明示例（doc）和一份out文件示例；
    |--|website_etc   // 存放开发过程中请求的接口文件，方便查阅；
    |logs  // 日志文件存放位置，系统自动生成
    |source // 项目js源码存放位置
    |--|common  // 通用工具代码，如logger、tools等
    |--|config  // 配置文件文件夹
    |--|core    // 爬虫核心代码
    |--|db_mananger // 数据库封装
    |--|spider  // 爬虫实现
    |app.js  // 爬虫启动文件
    |clean.js    // 爬虫下线或者停止时使用的清理工具
    |package.json // npm配置
    |.gitignore // git忽略配置文件
    |--REAMME.md // 项目说明
 ### 2.示例应用
 该模板工程内自带一个简单应用：中国商标网公告爬虫。 