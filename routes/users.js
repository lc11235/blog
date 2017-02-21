'use strict';

var express = require('express');
var router = express.Router();

/* GET users listing. */
/**
 * 默认的路由借口，在这个程序中略过
 */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
