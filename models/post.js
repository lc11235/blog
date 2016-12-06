'use strict';

var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, head, title, tags, post) {
    this.name = name;
    this.head = head;
    this.title = title;
    this.tags = tags;
    this.post = post;
}

module.exports = Post;

//存储一篇文章及其相关信息
Post.prototype.save = function(callback) {
    var date = new Date();
    //存储各种时间格式，方便以后扩展
    var time = {
        date: date,
        year: date.getFullYear(),
        month: date.getFullYear() + "-" + (date.getMonth() + 1),
        day: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
        date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    };

    //要存入数据库的文档
    /*reprint_info键的形式, reprint_from表示转载来的原文章的信息，reprint_to表示该文章被转载的信息。
    为了节省存储空间，我们初始设置reprint_info键为{}，而不是详情的形式。这是因为大多数文章是没有经过任何转载的，
    所以为每个文档都添加以上形式的reprint_info是有点浪费的。假如某篇文章是转载来的，我们只需给reprint_info添加上
    reprint_from键即可，假如谋篇文章被转载了，我们只需给reprint_info添加上reprint_to键即可，假如文章是转载来的且
    又被转载了，则两个键位都要加上。
    {
        reprint_from: {name: xxx, day: xxx, title: xxx},
        reprint_to: [
            {name: xxx, day: xxx, title: xxx},
            {name: xxx, day: xxx, title: xxx},
            ...
        ]
    } 
    */
    var post = {
        name: this.name,
        head: this.head,
        time: time,
        title: this.title,
        tags: this.tags,
        post: this.post,
        comments: [],
        reprint_info: {},
        pv: 0
    };

    //打开数据库
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        //读取posts集合
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            //将文档插入posts集合
            collection.insert(post, {
                safe: true
            }, function(err) {
                mongodb.close();
                if (err) {
                    return callback(err); //失败！返回err
                }

                callback(null); //返回err为null
            });
        });
    });
};

//读取所有文章及其相关信息
Post.getAll = function(name, callback) {
    //打开数据库
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        //读取posts集合
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            var query = {};
            if (name) {
                query.name = name;
            }

            //根据query对象查询文章
            collection.find(query).sort({
                time: -1
            }).toArray(function(err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err); //失败！返回err
                }

                //解析markdown为html
                docs.forEach(function(doc) {
                    doc.post = markdown.toHTML(doc.post);
                });

                callback(null, docs); //成功！ 以数组形式返回查询结果
            });
        });
    });
};

//读取十篇文章及其相关信息
Post.getTen = function(name, page, callback) {
    //打开数据库
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        //读取posts集合
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            var query = {};
            if (name) {
                query.name = name;
            }

            //使用count返回特定查询的文档数total
            collection.count(query, function(err, total) {
                //根据query对象查询，并跳过前(page - 1)*10个结果，返回之后的10个结果
                collection.find(query, {
                    skip: (page - 1) * 10,
                    limit: 10
                }).sort({
                    time: -1
                }).toArray(function(err, docs) {
                    mongodb.close();
                    if (err) {
                        return callback(err); //失败！返回err
                    }

                    //解析markdown为html
                    docs.forEach(function(doc) {
                        doc.post = markdown.toHTML(doc.post);
                    });

                    callback(null, docs, total); //成功！ 以数组形式返回查询结果
                });
            });
        });
    });
};

//获取一篇文章
Post.getOne = function(name, day, title, callback) {
    //打开数据库
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        //读取posts集合
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //根据用户名、发表日期及文章名进行查询
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            }, function(err, doc) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }

                if (doc) {
                    //每访问一次，pv值增加1
                    collection.update({
                        "name": name,
                        "time.day": day,
                        "title": title
                    }, {
                            $inc: { "pv": 1 }
                        }, function(err) {
                            mongodb.close();
                            if (err) {
                                return callback(err);
                            }
                        });
                    //解析markdown为html,增加对留言的支持
                    doc.post = markdown.toHTML(doc.post);
                    //console.log(doc.comments);
                    if (Array.isArray(doc.comments))//此处有个bug，在没有值得时候他并没有被赋予为数组类型，因此不可使用数组的相关函数，但是错误似乎不止如此，EJS也有同样地方错误
                    {
                        doc.comments.forEach(function(comment) {
                            comment.content = markdown.toHTML(comment.content);
                        });
                    }

                    callback(null, doc);//返回查询的一篇文章
                }
            });
        });
    });
};

//返回原始发表的内容（markdown格式）
Post.edit = function(name, day, title, callback) {
    //打开数据库
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        //读取posts集合
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            //根据用户名、发表日期及文章名进行查询
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            }, function(err, doc) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, doc);//返回查询的一篇文章（markdown格式）
            });
        });
    });
};

//更新一篇文章及其相关信息
Post.update = function(name, day, title, post, callback) {
    //打开数据库
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        //读取posts集合
        db.collection('posts', function(err, collection) {
            if (err) {
                return callback(err);
            }
            //更新文章内容
            collection.update({
                "name": name,
                "time.day": day,
                "title": title
            }, {
                    $set: { post: post }
                }, function(err) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
        });
    });
};

//删除一篇文章
Post.remove = function(name, day, title, callback) {
    //打开数据库
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        //读取posts集合
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //根据用户名、日期和标题查找并删除一篇文章
            collection.remove({
                "name": name,
                "time.day": day,
                "title": title
            }, {
                    w: 1
                }, function(err) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }

                    callback(null);
                });
        });
    });
};

//返回所有文章的存档信息
Post.getArchive = function(callback) {
    //打开数据库
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        //读取posts集合
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            //返回只包含name、time、title属性的文档组成的存档数组
            collection.find({}, {
                "name": 1,
                "time": 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function(err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }

                callback(null, docs);
            });
        });
    });
};

//返回所有书签
Post.getTags = function(callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            //distinct 用来找出给定键的所有不同值
            collection.distinct('tags', function(err, docs) {
                mongodb.close();

                if (err) {
                    return callback(err);
                }

                callback(null, docs);
            });
        });
    });
};

//返回含有特定标签的所有文章
Post.getTag = function(tag, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //查询所有tags数组内包含tag的文档
            //并返回只含有name、time、title组成的数组
            collection.find({
                "tags": tag
            }, {
                    "name": 1,
                    "time": 1,
                    "title": 1
                }).sort({
                    time: -1
                }).toArray(function(err, docs) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }

                    callback(null, docs);
                });
        });
    });
};

//返回通过标题关键字查询的所有文章信息
Post.search = function(keyword, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            var pattern = new RegExp(keyword, "i");
            collection.find({
                "title": pattern
            }, {
                    "name": 1,
                    "time": 1,
                    "title": 1
                }).sort({
                    time: -1
                }).toArray(function(err, docs) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }

                    callback(null, docs);
                });
        });
    });
};

//转载一篇文章
Post.reprint = function(reprint_from, reprint_to, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            //找到被转载的文章的原始档
            collection.findOne({
                "name": reprint_from.name,
                "time.day": reprint_from.day,
                "title": reprint_from.title
            }, function(err, doc) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }

                var date = new Date();
                var time = {
                    date: date,
                    year: date.getFullYear(),
                    month: date.getFullYear() + "-" + (date.getMonth() + 1),
                    day: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
                    minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "" +
                    date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
                };

                delete doc._id; //注意要删掉原来的_id

                doc.name = reprint_to.name;
                doc.head = reprint_to.head;
                doc.time = time;
                doc.title = (doc.title.search(/[转载]/) > -1) ? doc.title : "[转载]" + doc.title;
                doc.comments = [];
                doc.reprint_info = {"reprint_from": reprint_from};
                doc.pv = 0;

                //更新被转载的原文档的reprint_info内的reprint_to
                collection.update({
                    "name": reprint_from.name,
                    "time.day": reprint_from.day,
                    "title": reprint_from.title
                }, {
                    $push:{
                        "reprint_info.reprint_to":{
                            "name": doc.name,
                            "day": time.day,
                            "title": doc.title
                        }
                    }
                }, function(err){
                    if(err){
                        mongodb.close();
                        return callback(err);
                    }
                });

                //将转载生成的副本修改后存入数据库，并返回存储后的文档
                collection.insert(doc, {
                    safe: true
                }, function(err, post){
                    mongodb.close();
                    if(err){
                        return callback(err);
                    }

                    callback(err, post.ops[0]);
                });
            });
        });
    });
};