// 项目分析：
// 1 要搭建后端服务器 所以要引入express
var express = require("express");
// 2 要提供登录注册功能 这些数据要放入数据库 所以要引入mongodb
var mongodb = require("mongodb");
// 3 用户有一个头像 这个东西是注册的时候使用 该图片由用户提供 所以要将用户提供的图片上传到服务器 要引入formidable
var formid = require("formidable");
// 4 注册除了文件之外还有一些其它信息 这些信息都可以使用formidable去获取 但是普通的post请求 我们为了在express中快速获取 要使用body-parser
var bodyParser = require("body-parser");
// 5 既然要登录 就得维持住登录状态 就要使用cookie
var cookieParser = require("cookie-parser");
// 6 创建文件夹 就得引入fs模块
var fs = require("fs");
// 7 删除可能带内容的文件夹
var rmdir = require("rmdir");
// 8 要裁剪头像 需要引入gm模块
var gm = require("gm");
// 获取连接数据库的客户端
var mongo_client = mongodb.MongoClient;
// 定义连接数据库的字符串
var connect_str = "mongodb://localhost:27017/albums";
// 集合1名称
var collection_user = "user";
// 集合2名称
var collection_pic_info = "pic_info";
// 开始搭建
var app = express();
// 应用中间件
app.use(bodyParser.urlencoded({extended: false}));
// 应用cookie
app.use(cookieParser());
// 静态中间件
app.use(express.static("static"));
// 静态中间件
app.use(express.static("albums"));
// 既然要上传文件 那么一定得设置一个上传文件所用的临时文件夹
// uploads 
// 为了给前端用户显示用户名称 那么就需要借助ejs模板 既然有了ejs模板就必须有一个views文件夹
// views
// 匹配用户检测姓名路由
app.get("/check_username", function(req, res){
	// 获取前端用户的数据
	var username = req.query.username;
	// console.log(username);
	// 连接数据库
	mongo_client.connect(connect_str, function(err, db){
		// 如果出错了
		if(err){
			// 给前端一个响应
			res.send({
				error: 1, 
				data: "连接数据库失败"
			});
			// 后续代码不执行
			return;
		}
		// 第一种查询方式就是在find方法的回调函数中执行操作 结果我们发现result是一个游标对象 我们不知道该怎么使用才能得到查询的结果
		// 如果没问题 
		// db.collection("user").find({username: username}, function(err, result){
		// 	if(err){
		// 		// 给前端一个响应
		// 		res.send({
		// 			error: 2,
		// 			data: "查询数据库失败"
		// 		});
		// 		// 关闭数据库连接
		// 		db.close();
		// 		// 查询失败
		// 		return;
		// 	}
		// 	console.log(result);
		// });
		// 第二种查询方式
		db.collection("user").find({username: username}).toArray(function(err, result){
			// console.log(err, result);
			// result是一个数组
			// 如果数组是空的 说明没有查询到 反之查询到了
			if(err){
				// 给前端一个响应
				res.send({
					error: 2,
					data: "查询数据库失败"
				});
				// 关闭数据库连接
				db.close();
				// 查询失败
				return;
			}
			// 判断数组长度
			if(result.length){
				res.send({
					error: 3,
					data: "抱歉，已经被占用"
				});
				db.close();
				return;
			}
			res.json({
				error: 0,
				data: "恭喜，可以使用"
			});
			db.close();
		});
	});
});

// 匹配用户注册的路由
app.post("/regist", function(req, res){
	// 这里要注意一点，前端post提交上来的信息并不一定从req.body身上获取。要注意表单的enctype属性 万一是文件上传的 req.body将无法获取内容
	// 这里因为可能涉及到文件上传所以要使用formidable来获取
	var form = new formid();
	// 设置上传的路径
	form.uploadDir = "./uploads";
	// 解析req 因为前端上传来的信息都在req身上
	form.parse(req, function(err, fields, files){
		if(err){
			// 出错了，给前端返回一个信息
			res.render("error.ejs", {
				msg: "后端解析前端数据出错了"
			});
			// 停止函数的执行
			return;
		}
		// 在这里我们才能获取到用户名和密码
		var username = fields.username;
		var password = fields.password;
		// 创建一个文件夹 该文件夹以用户命名 
		fs.mkdir("albums/" + username, function(err){
			if(err){
				// 出错了，通知前端
				res.render("error.ejs", {
					msg: "创建文件夹出错"
				});
				// 停止函数的执行
				return;
			}
			// 给用户创建一个存头像的文件夹
			fs.mkdir("albums/" + username + "/" + "head_pic", function(err){
				if(err){
					// 出错了，通知前端
					res.render("error.ejs", {
						msg: "创建头像文件夹出错"
					});
					// 停止函数的执行
					return;
				}
				// 如果用户上传了头像 后续我们应该将用户的文件转移到该head_pic目录下 
				// 如果用户没有上传头像 后续我们应该使用默认的图片给用户当头像
				// 获取该文件对象的size
				var size = files.head_pic.size;
				if(!size){
					// 说明没有传递头像
					// 读取默认头像
					fs.readFile("./default/default.jpg", function(err, data){
						if(err){
							// 读取默认头像失败
							res.render("error.ejs", {
								msg: "读取默认头像失败"
							});
							return;
						}
						// 给该用户创建一个头像
						fs.appendFile("./albums/" + username +"/head_pic/" + "head_pic.jpg", data, function(err){
							if(err){
								// 复制头像失败
								res.render("error.ejs", {
									msg: "复制头像失败"
								});
								return;
							}
							// 将用户的信息放入数据库
							mongo_client.connect(connect_str, function(err, db){
								if(err){
									// 连接数据库失败
									res.render("error.ejs", {
										msg: "连接数据库失败"
									});
									return;
								}
								// 定义头像路径
								var head_pic = username + "/head_pic/head_pic.jpg";
								// 定义要被插入的对象
								var obj = {
									username: username,
									password: password,
									head_pic: head_pic  
								}
								db.collection(collection_user).insert(obj, function(err, result){
									if(err){
										// 插入数据库失败
										res.render("error.ejs", {
											msg: "插入数据库失败"
										});
										// 因为数据库连接已经打开 所以要记得关闭
										db.close();
										return;
									}
									// 设置cookie
									res.cookie("username", username, {
										maxAge: 60 * 60 * 1000
									});
									res.cookie("head_pic", head_pic, {
										maxAge: 60 * 60 * 1000
									});
									// res.send("撒的发和第三方");
									// 因为用户如果刷新了页面 此路由的逻辑会重新执行一遍。那么会卡在创建文件夹那里。必定出错。所以跳转路由
									res.redirect("/main");
								});
							});
						});
					});
				}else{
					// 说明传递头像了
					// 获取前端传递的头像
					// console.log(files.head_pic);
					// var arr = files.head_pic.name.split(".");
					// var ext = arr[arr.length - 1];
					// console.log(ext);
					var index = files.head_pic.name.lastIndexOf(".");
					var ext = files.head_pic.name.slice(index + 1);
					fs.rename(files.head_pic.path, "albums/" + username +"/head_pic/head_pic." + ext, function(err){
						if(err){
							// 重命名失败
							res.render("error.ejs", {
								msg: "重命名失败"
							});
							return;
						}
						// 将用户的信息放入数据库
						mongo_client.connect(connect_str, function(err, db){
							if(err){
								// 连接数据库失败
								res.render("error.ejs", {
									msg: "连接数据库失败"
								});
								return;
							}
							var head_pic =  username + "/head_pic/head_pic." + ext;
							// 定义要被插入的对象
							var obj = {
								username: username,
								password: password,
								head_pic: head_pic 
							}
							db.collection(collection_user).insert(obj, function(err, result){
								if(err){
									// 插入数据库失败
									res.render("error.ejs", {
										msg: "插入数据库失败"
									});
									// 因为数据库连接已经打开 所以要记得关闭
									db.close();
									return;
								}
								// 设置cookie
								res.cookie("username", username, {
									maxAge: 60 * 60 * 1000
								});
								res.cookie("head_pic", head_pic, {
									maxAge: 60 * 60 * 1000
								});
								// res.send("撒的发和第三方");
								// 因为用户如果刷新了页面 此路由的逻辑会重新执行一遍。那么会卡在创建文件夹那里。必定出错。所以跳转路由
								res.redirect("/main");
							});
						});
					});
				}
			});
		});
	});
});
// 用于显示主页的路由
app.get("/main", function(req, res){
	// 从cookie中获取用户名称
	res.render("main.ejs", {
		username: req.cookies.username,
		head_pic: req.cookies.head_pic
	});
});
// 配置用于用户登录路由
app.post("/login", function(req, res){
	// 获取用户提交的信息
	// 因为并没有改变表单的enctype属性 所以req.body中是可以获取到数据的
	var username = req.body.username;
	var password = req.body.password;
	// 连接数据库
	mongo_client.connect(connect_str, function(err, db){
		if(err){
			// 连接数据库失败
			res.render("error.ejs", {
				msg: "连接数据库失败"
			});
			// 中止函数的执行
			return;
		}
		// 定义查询对象
		var obj = {
			username: username,
			password: password
		};
		db.collection(collection_user).find(obj).toArray(function(err, arr){
			if(err){
				// 关闭数据库连接
				db.close();
				res.render("error.ejs", {
					msg: "查询数据库失败"
				});
				return;
			}
			// 关闭数据库连接
			db.close();
			if(!arr.length){
				// 密码错误
				res.render("error.ejs", {
					msg: "密码错误"
				});
				return;
			}
			// 将查询到的信息放入cookie
			res.cookie("username", username, {
				maxAge: 3600 * 1000
			});
			// console.log(arr);
			res.cookie("head_pic", arr[0].head_pic, {
				maxAge: 3600 * 1000
			});
			// 跳转到/main路由
			res.redirect("/main");
		});
	});
});
// 以上的路由用户不登录也可以看到  以下的路由用户不登录无法看到
app.get("*", function(req, res, next){
	// 此路由表示所有以下路由在被访问的时候必须经过
	// 检测 是否已经登录
	// console.log(req.cookies.username);
	// 判断
	if(req.cookies.username){
		next();
	}else{
		res.render("error.ejs", {
			msg: "请先登录"
		});
	}
	// 如果以后要改成session存储内容 那么就检测req.session.username
});
// 匹配管理相册路由
app.get("/manage_albums", function(req, res){
	// 读取当前用户的所有相册
	fs.readdir("./albums/" + req.cookies.username, function(err, arr){
		if(err){
			res.render("error.ejs", {
				msg: "读取相册失败"
			});
			return;
		}
		// 将head_pic从arr中移除
		for(var i = 0; i < arr.length; i++){
			if(arr[i] === "head_pic"){
				arr.splice(i, 1);
				break;
			}
		}
		// 展现一个新的管理页面给用户看到
		res.render("manage_album.ejs", {
			username: req.cookies.username,
			head_pic: req.cookies.head_pic,
			arr: arr
		});
	});
});
// 匹配创建相册的路由
app.get("/create_album", function(req, res){
	// 获取前端提交的数据
	var album_name = req.query.album_name;
	// 获取用户信息
	var username = req.cookies.username;
	// console.log(album_name, username);
	// 调用对应的方法创建该相册
	fs.mkdir("albums/" + username + "/" + album_name, function(err){
		if(err){
			res.json({
				error: 1,
				data: "创建失败"
			});
			return;
		}
		res.json({
			error: 0,
			data: "创建成功"
		});
	});
});
// 搭配删除相册的路由
app.get("/del_album", function(req, res){
	// 获取前端传递过来的相册名称
	var album_name = req.query.album_name;
	// 获取登录用户
	var username = req.cookies.username;
	// 移除文件夹
	try{
		// try语句表示尝试执行
		rmdir("albums/" + username + "/" + album_name);
	}catch(e){
		// 如果try中的语句执行失败 会执行这里的代码
		console.log("try中的代码块执行的时候出问题了");
		res.json({
			error: 1,
			data: "删除文件夹失败"
		})
		return;
	}
	// 如果try中的语句执行成功 会执行这里
	res.json({
		error: 0,
		data: "删除文件夹成功"
	});
});
// 对应ajax上传文件的路由
app.post("/uploads", function(req, res){
	// 获取当前操作的用户
	var username = req.cookies.username;
	// 既然是上传文件过来 那么我们就要使用formidable去解析
	var form = new formid();
	// 设置上传的路径
	form.uploadDir = "./uploads";
	// 解析
	form.parse(req, function(err, fields, files){
		if(err){
			res.json({
				error: 1,
				data: "解析失败"
			});
			return;
		}
		// console.log(files);
		// 获取用户传递的文件夹名称
		var album_name = fields.choose;
		// 获取上传过来的文件默认路径
		var oldpath = files.img.path;
		// 获取上传过来的文件的原名称
		var oldname = files.img.name;
		fs.rename(oldpath, "albums/" + username + "/" + album_name + "/" +oldname, function(err){
			if(err){
				res.json({
					error: 2,
					data: "改名失败"
				});
				return;
			}
			// 修改
			// 将这个图片改名之后 还要将它的信息放入数据库
			// 因为我们要做图片共享功能 
			// 定义信息
			var obj = {
				username: username,
				album_name: album_name,
				fileName: oldname,
				share: "true"
			};
			// 连接数据库
			mongo_client.connect(connect_str, function(err, db){
				if(err){
					// 返回信息给前端
					res.json({
						error: 3,
						data: "连接数据库失败"
					});
					return;
				}
				db.collection(collection_pic_info).insert(obj, function(err){
					if(err){
						// 给前端返回信息
						res.json({
							error: 4,
							data: "插入数据失败"
						});
						// 因为连接已经打开所以要记得关闭
						db.close();
						// 中止函数执行
						return;
					}
					db.close();
					res.json({
						error: 0,
						data: "成功"
					});
				});
			});
		});
	});
});
// 匹配获取图片的路由
app.get("/getImages", function(req, res){
	// 获取相册名称
	var album_name = req.query.album_name;
	// 获取用户名称
	var username = req.cookies.username;
	// 连接数据库
	mongo_client.connect(connect_str, function(err, db){
		if(err){
			res.json({
				error: 1,
				data: "连接数据库失败"
			});
			return;
		}
		// 定义查询对象
		var obj = {
			username: username,
			album_name: album_name
		}
		db.collection(collection_pic_info).find(obj).toArray(function(err, arr){
			if(err){
				res.json({
					error: 2,
					data: "转化成数组或者查询失败"
				});
				db.close();
				return;
			}
			// console.log(arr);
			// 循环将每一项的share属性是true的挑选到一个新的数组中 返回
			// var newArr = [];
			// for(var i = 0; i < arr.length; i++){
			// 	// 判断
			// 	if(arr[i].share === "true"){
			// 		newArr.push(arr[i]);
			// 	}
			// }
			db.close();
			res.json({
				error: 0,
				data : arr
			});
		});
	});
});
// 匹配显示所有人的相册路由
app.get("/all_albums", function(req, res){
	// 读取albums文件夹下的所有用户文件夹名称
	fs.readdir("albums", function(err, arr){
		// 因为是超级链接所以需要的是一个完整的页面 所以render
		if(err){
			res.render("error.ejs", {
				msg: "读取相册失败"
			});
			return;
		}
		res.render("all_albums.ejs", {
			username: req.cookies.username,
			head_pic: req.cookies.head_pic,
			arr: arr
		});
	});
});
// 匹配某一个用户的相册路由
app.get("/show_user_albums", function(req, res){
	// 获取要查看的用户的名称
	var targetUsername = req.query.username;
	fs.readdir("albums/" + targetUsername, function(err, arr){
		// 将head_pic从arr中移除
		for(var i = 0; i < arr.length; i++){
			if(arr[i] === "head_pic"){
				arr.splice(i, 1);
				break;
			}
		}
		res.render("show_user_albums.ejs", {
			username: req.cookies.username,
			head_pic: req.cookies.head_pic,
			arr: arr,
			targetUsername: targetUsername
		});
	}); 
});
// 匹配查看某一个用户的某一个相册
app.get("/show_user_album", function(req, res){
	// 获取目标用户
	// var targetUsername = req.query.targetUsername;
	// // 获取目标相册
	// var album_name = req.query.album_name;
	// // 读取相册中的内容
	// fs.readdir("albums/" + targetUsername + "/" + album_name, function(err, arr){
	// 	if(err){
	// 		res.render("error.ejs", {
	// 			msg: "读取" + targetUsername + "的" + album_name + "相册失败"
	// 		});
	// 		return;
	// 	}
	// 	res.render("show_user_album.ejs", {
	// 		username: req.cookies.username,
	// 		head_pic: req.cookies.head_pic,
	// 		targetUsername: targetUsername,
	// 		album_name: album_name,
	// 		arr: arr
	// 	});
	// });

	


	// 之前的写法是直接读取文件夹  现在因为有了共享这个概念 我们应该根据数据库中的标记去显示图片
  // 获取目标用户
	var targetUsername = req.query.targetUsername;
	// 获取目标相册
	var album_name = req.query.album_name;
	// 定义只查询share为true的
	var state = "true";
	// 获取登录用户
	var username = req.cookies.username;
	// 连接数据库
	mongo_client.connect(connect_str, function(err, db){
		if(err){
			res.render("error.ejs", {
				msg: "连接数据库失败"
			});
			return;
		}
		// 定义查询对象
		var findObj = {
			username: targetUsername,
			album_name: album_name,
			share: state
		}
		// 如果当前登录的用户就是目标用户 应该能够看到全部
		if(username === targetUsername){
			// 删除对象的属性share
			delete findObj.share;
		}
		db.collection(collection_pic_info).find(findObj).toArray(function(err, arr){
			if(err){
				res.render("error.ejs", {
					msg: "查询数据库失败"
				});
				db.close();
				return;
			}
			console.log(arr);
			res.render("show_user_album.ejs", {
				username: req.cookies.username,
				head_pic: req.cookies.head_pic,
				targetUsername: targetUsername,
				album_name: album_name,
				arr: arr
			});
		});
	});
});
// 当点击我的相册的时候
app.get("/my_albums", function(req, res){
	var username = req.cookies.username;
	res.redirect("/show_user_albums?username=" + username);
});
// 配置更改状态的路由
app.get("/change_state", function(req, res){
	// 获取前端的数据
	var username = req.cookies.username;
	var album_name = req.query.album_name;
	var img_name = req.query.img_name;
	var state = req.query.state;
	// 连接数据库
	mongo_client.connect(connect_str, function(err, db){
		// 如果连接失败
		if(err){
			res.json({
				error: 1,
				data: "连接数据库失败"
			});
			return;
		}
		// 定义查询条件
		var findObj = {
			username: username,
			album_name: album_name,
			fileName: img_name
		}
		/*修改之后的对象*/
		var updateObj = {
			$set: {
				share: state
			}
		}
		db.collection(collection_pic_info).update(findObj, updateObj, function(err, result){
			if(err){
				res.json({
					error: 2,
					data: "修改失败"
				});
				db.close();
				return;
			}
			db.close();
			res.json({
				error: 0,
				data: "修改成功"
			});
		});
	});
});
// 配置显示裁剪页面的路由
app.get("/head_cut", function(req, res){
	// 获取登录的用户名称
	var username = req.cookies.username;
	// 获取头像路径
	var head_pic = req.cookies.head_pic;
	// 渲染页面
	res.render("cut.ejs", {
		username: username,
		head_pic: head_pic
	});
});
// 配置裁剪功能的路由
app.get("/cut", function(req, res){
	// 获取前端传递的数据
	var x = req.query.x;
	var y = req.query.y;
	var w = req.query.w;
	var h = req.query.h;
	// 获取当前用户的头像路径
	var head_pic = "albums/" + req.cookies.head_pic;
	console.log(head_pic);
	// 功能实现
	gm(head_pic).crop(w, h, x, y).write(head_pic, function(err){
		if(err){
			console.log(err);
			res.json({
				error: 1,
				data: "裁剪失败"
			});
			return;
		}
		res.json({
			error: 0,
			data: "裁剪成功"
		});
	});
});
// 匹配退出功能
app.get("/exit", function(req, res){
	// 清空cookie
	res.clearCookie("username");
	// 跳转到别的路由
	res.redirect("/");
});
// 匹配更改用户信息路由
app.get("/update", function(req, res){
	// 用户需要的是一个页面 那么渲染一个给用户 
	res.render("update.ejs", {
		username: req.cookies.username,
		head_pic: req.cookies.head_pic
	});
});
// 匹配密码修改路由
app.post("/password_update", function(req, res){
	// 获取前端数据
	var newpassword = req.body.password;
	// 连接数据库
	mongo_client.connect(connect_str, function(err, db){
		if(err){
			res.json({
				error: 1,
				data: "连接数据库失败"
			});
			return;
		}
		// 定义查找对象
		var findObj = {
			username: req.cookies.username
		};
		// 定义修改对象
		var updateObj = {
			$set: {
				password: newpassword
			}
		}
		db.collection(collection_user).update(findObj, updateObj, function(err, result){
			if(err){
				db.close();
				res.json({
					error: 2,
					data: "修改失败"
				});
				return;
			}
			res.json({
				error: 0,
				data: "修改成功"
			})
		});
	});
});
// 修改头像路由
app.post("/change_head_pic", function(req, res){
	// 使用formidable获取上传过来的数据 并且操作文件
	var form = new formid();
	// 设置路径
	form.uploadDir = "./uploads";
	// 解析req对象
	form.parse(req, function(err, fields, files){
		if(err){
			res.json({
				error: 1,
				data: "解析req失败"
			});
			return;
		}
		// console.log(files);
		var oldname = files.head_pic.path;
		var ext = files.head_pic.name.split(".")[1];
		var newname = "albums/" + req.cookies.username + "/head_pic/head_pic." + ext; 
		fs.rename(oldname, newname, function(err){
			if(err){
				res.json({
					error: 2,
					data: "重命名失败"
				});
				return
			}
			res.json({
				error: 0,
				data: "上传成功"
			});
		});
	});
});
// 监听服务器
app.listen(3000); 