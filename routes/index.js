var express = require('express');
//node.js的核心模块，用来生成散列值
var crypto = require('crypto'),
    User = require('../models/user.js');

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

//路由响应
module.exports = function(app) {
  app.get('/', function(req, res) {
    res.render('index', {
      title: '主页'
    });
  });

  app.get('/reg', function(req, res) {
    res.render('reg', {
      title: '注册'
    });
  });

  app.post('/reg', function(req, res) {
    var name = req.body.name,
        password = req.body.password,
        password_re =req.body['password-repeat'];

    //检查用户两次输入的密码是否一致
    if(password_re != password){
      req.flash('error', '两次输入输入的密码不一致！');
      return res.redirect('/reg'); //返回注册页(来自express的重定向函数)
    }

    //生成密码的md5值
    var md5 = crypto.createHash('md5'),
        password = md5.update(req.body.password).digest('hex');
    var newUser = new User({
      name: name,
      password: password,
      email: req.body.email
    });

    //检查拥护名是否已经存在
    User.get(newUser.name, function(err, user){
      if(err){
        req.flash('error', err);
        return res.redirect('/');
      }

      if(user){
        req.flash('error', '用户已存在！');
        return res.redirect('/reg'); //返回注册页
      }

      //如果不存在则新增用户
      newUser.save(function(err, user){
        if(err){
          req.flash('error', err);
          return res.redirect('/reg'); //注册失败返回注册页
        }

        req.session.user = user; //用户信息存入session
        req.flash('success', '注册成功！');
        res.redirect('/'); //注册成功后返回主页
      });
    });
  });

  app.get('/login', function(req, res) {
    res.render('login', {
      title: '登录'
    });
  });

  app.post('/login', function(req, res) {

  });

  app.get('/post', function(req, res) {
    res.render('post', {
      title: '发表'
    });
  });

  app.post('/post', function(req, res) {

  });

  app.get('/logout', function(req, res) {

  });
};