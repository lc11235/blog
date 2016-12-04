'use strict';

var express = require('express');
//node.js的核心模块，用来生成散列值
var crypto = require('crypto'),
  User = require('../models/user.js'),
  Post = require('../models/post.js'),
  Comment = require('../models/comment.js');

var router = express.Router();
var multer = require('multer'); // 导入上传组件的支持
//dest是上传的文件所在的目录，rename函数用来修改上传后的文件名，这里设置为保持原来的文件名
var upload = multer({
  dest: './public/images'
});

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
module.exports = function (app) {
  app.get('/', function (req, res) {
    //判断是否是第一页，并把请求的页数转换为number类型
    var page = req.query.p ? parseInt(req.query.p) : 1;
    Post.getTen(null, page, function (err, posts, total) {
      if (err) {
        posts = [];
      }

      res.render('index', {
        title: '主页',
        posts: posts,
        page: page,
        isFirstPage: (page - 1) == 0,
        isLastPage: ((page - 1) * 10 + posts.length) == total,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    });
  });

  app.get('/reg', checkNotLogin);
  app.get('/reg', function (req, res) {
    res.render('reg', {
      title: '注册',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/reg', checkNotLogin);
  app.post('/reg', function (req, res) {
    var name = req.body.name,
      password = req.body.password,
      password_re = req.body['password-repeat'];

    //检查用户两次输入的密码是否一致
    if (password_re != password) {
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
    User.get(newUser.name, function (err, user) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }

      if (user) {
        req.flash('error', '用户已存在！');
        return res.redirect('/reg'); //返回注册页
      }

      //如果不存在则新增用户
      newUser.save(function (err, user) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/reg'); //注册失败返回注册页
        }

        req.session.user = user; //用户信息存入session
        req.flash('success', '注册成功！');
        res.redirect('/'); //注册成功后返回主页
      });
    });
  });

  app.get('/login', checkNotLogin);
  app.get('/login', function (req, res) {
    res.render('login', {
      title: '登录',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/login', checkNotLogin);
  app.post('/login', function (req, res) {
    //生成密码的md5值
    var md5 = crypto.createHash('md5');
    password = md5.update(req.body.password).digest('hex');
    //检查用户是否存在
    User.get(req.body.name, function (err, user) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/login'); //错误则回到登录页面
      }

      if (!user) {
        req.flash('error', '用户不存在！');
        return res.redirect('/login'); //错误则回到登录页面
      }

      //检查密码是否一致
      if (user.password != password) {
        req.flash('error', '密码错误！');
        return res.redirect('/login'); //错误则回到登录页面
      }

      //用户名密码都匹配后，将用户信息存入session
      req.session.user = user;
      req.flash('success', '登录成功！');
      res.redirect('/');//登录成功后跳转到主页
    });
  });

  app.get('/post', checkLogin);
  app.get('/post', function (req, res) {
    res.render('post', {
      title: '发表',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/post', checkLogin);
  app.post('/post', function (req, res) {
    var currentUser = req.session.user,
      post = new Post(currentUser.name, req.body.title, req.body.post);

    post.save(function (err) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }

      req.flash('success', '发布成功！');
      res.redirect('/'); //发表成功跳到主页
    });
  });

  app.get('/logout', checkLogin);
  app.get('/logout', function (req, res) {
    req.session.user = null;
    req.flash('success', '登出成功！');
    res.redirect('/'); //登出成功后跳转到主页
  });

  app.get('/upload', checkLogin);
  app.get('/upload', function (req, res) {
    res.render('upload', {
      title: '文件上传',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/upload', upload.fields([
    { name: 'file1' },
    { name: 'file2' },
    { name: 'file3' },
    { name: 'file4' },
    { name: 'file5' }
  ]), function (req, res) {
    for (var i in req.files) {
      console.log(req.files[i]);
    }
    req.flash('success', '文件上传成功!');
    res.redirect('/upload');
  });

  app.get('/archive', function(req, res){
    Post.getArchive(function(err, posts){
      if(err){
        req.flash('error', err);
        return res.redirect('/');
      }

      res.render('archive', {
        title: '存档',
        posts: posts,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    });
  });

  app.get('/u/:name', function (req, res) {
    var page = req.query.p ? parseInt(req.query.p) : 1;
    //检查用户名是否已经存在
    User.get(req.params.name, function (err, user) {
      if (!user) {
        req.flash('error', '用户名不存在！');
        return res.redirect('/');//用户不存在则跳转到主页
      }
      //查询并返回该用户第page页的10篇文章
      Post.getTen(user.name, page, function (err, posts, total) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/');
        }

        res.render('user', {
          title: user.name,
          posts: posts,
          page: page,
          isFirstPage: (page - 1) == 0,
          isLastPage: ((page - 1) * 10 + posts.length) == total,
          user: req.session.user,
          success: req.flash('success').toString(),
          error: req.flash('error').toString()
        });
      });
    });
  });

  app.get('/u/:name/:day/:title', function (req, res) {
    Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
      if (err) {
        req.flash('error'.err);
        return res.redirect('/');
      }

      res.render('article', {
        title: req.params.title,
        post: post,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    });
  });

  app.post('/u/:name/:day/:title', function (req, res) {
    var date = new Date(),
      time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "-" +
        date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());

    var comment = {
      name: req.body.name,
      email: req.body.email,
      website: req.body.website,
      time: time,
      content: req.body.content
    };

    var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
    newComment.save(function (err) {
      if (err) {
        req.flash('error', err);
        return res.redirect('back');
      }

      req.flash('success', '留言成功！');
      res.redirect('back');
    });
  });

  app.get('/edit/:name/:day/:title', checkLogin);
  app.get('/edit/:name/:day/:title', function (req, res) {
    var currentUser = req.session.user;
    Post.edit(currentUser.name, req.params.day, req.params.title, function (err, post) {
      if (err) {
        req.flash('error', err);
        return res.redirect('back');
      }

      res.render('edit', {
        title: '编辑',
        post: post,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    });
  });

  app.post('/edit/:name/:day/:title', checkLogin);
  app.post('/edit/:name/:day/:title', function (req, res) {
    var currentUser = req.session.user;
    Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function (err) {
      var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
      if (err) {
        req.flash('error', err);
        return res.redirect(url); //出错！返回文章页
      }
      req.flash('success', '修改成功！');
      res.redirect(url);//成功！返回文章页
    });
  });

  app.get('/remove/:name/:day/:title', checkLogin);
  app.get('/remove/:name/:day/:title', function (req, res) {
    var currentUser = req.session.user;
    Post.remove(currentUser.name, req.params.day, req.params.title, function (err) {
      if (err) {
        req.flash('error', err);
        return res.redirect('back');
      }
      req.flash('success', '删除成功！');
      res.redirect('/');
    });
  });

  app.get('/del', function (req, res) {
    res.render('del', {
      title: '删除',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/del', function (req, res) {
    var name = req.body.name;//取的要删除的账户的名字

    User.del(name, function (err, user) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/del');
      }

      req.flash('success', '删除成功！');
      res.redirect('/');
    });
  });

  //检查是否登录
  function checkLogin(req, res, next) {
    if (!req.session.user) {
      req.flash('error', '未登录！');
      res.redirect('/login');
    }

    next();
  }

  function checkNotLogin(req, res, next) {
    if (req.session.user) {
      req.flash('error', '已登录！');
      res.redirect('back'); //返回之前的页面
    }

    next();
  }
};