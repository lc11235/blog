var express = require('express');
var router = express.Router();

/* GET home page. */
/**
 * 生成一个路由实例用来捕获访问主页的GET请求，导出这个路由并在app.js中
 * 通过app.use('/', routes);加载。
 * 模板引擎会将所有<% = title%>替换为express，然后将渲染后生成的html 显示到浏览器中。
 */
//router.get('/', function(req, res, next) {
//  res.render('index', { title: 'Express' });
//});

//module.exports = router;

module.exports = function(app){
  app.get('/', function(req, res){
    res.render('index',{title:'Express'});
  });
};
