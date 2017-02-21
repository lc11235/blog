'use strict';

var fs = require('fs');
var accessLog = fs.createWriteStream('access.log', { flag: 'a' });
var errorLog = fs.createWriteStream('error.log', { flag: 'a' });
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var EventEmitter = require('events');

var routes = require('./routes/index');
var users = require('./routes/users');
var settings = require('./settings');//导入数据库连接
var flash = require('connect-flash');//用于存储信息的特殊区域
var session = require('express-session');//导入会话支持
var MongoStore = require('connect-mongo')(session);//导入数据库对会话的支持中间件

class MyEmitter extends EventEmitter { }

// 生成一个express实例
var app = express();

// view engine setup
//设置view文件夹存放视图文件的目录，即存放模板文件的地方，__dirname为全局变量，存储当前正在执行
//的脚本所在的目录
app.set('views', path.join(__dirname, 'views'));
//设置视图模板引擎为ejs
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//设置/public/favicon.ico为favicon图标
app.use(favicon(__dirname + '/public/favicon.ico'));
//加载日志中间件,日志级别为dev
app.use(logger('dev'));
//将日志保存为文件
app.use(logger({ stream: accessLog }));
//加载解析json的中间件
app.use(bodyParser.json());
//加载解析urlencoded请求体的中间件
app.use(bodyParser.urlencoded({ extended: false }));
//加载解析cookie的中间件
app.use(cookieParser());
//设置public文件夹为存放静态文件的目录。
app.use(express.static(path.join(__dirname, 'public')));
//添加一个中间件用来记录express的错误，记录在error.log文件中
app.use(function (err, req, res, next) {
  var meta = '[' + new Date() + ']' + req.url + '\n';
  errorLog.write(meta + err.stack + '\n');
  next();
});
//路由控制器
//app.use('/', routes);
//app.use('/users', users);

//最大的事件监听数，默认是10，超过10 node会报出警告
const myEmitter = new MyEmitter();
myEmitter.setMaxListeners(30);

app.use(session({
  secret: settings.cookieSecret,
  key: settings.db, //cookie name
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 }, //30 days
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({ //新的连接方式（connect-mongo）
    //db: settings.db,
    //host: settings.host,
    //port: settings.port
    url: 'mongodb://localhost/blog'
  })
}));

//添加flash功能
//因为flash是依靠session来实现的，因此需要先使用session组件再使用Flash组件，否则会报错
app.use(flash());

//将所有的路由事件都转发到路由文件处理，app.js中只保存一个总的路由接口
routes(app);

// catch 404 and forward to error handler
//捕获404错误并转发到错误处理器
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
//开发环境下的错误处理器，将错误渲染到error模板并显示到浏览器中。
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
//生产环境下的错误处理器，将错误信息渲染到error模板并显示到浏览器中。
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

//导出app实例供其他模块调用
module.exports = app;
