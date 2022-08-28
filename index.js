const {
	app,
	BrowserWindow,
	Menu, //菜单
	Tray, //托盘
	ipcMain //交互通信
} = require("electron");
const {exec, execFile} = require("child_process"); //命令
const fs = require("fs"); //文件处理
const path = require("path"); //路径处理
const http = require("http"); //服务器&请求
const https = require("https"); //请求
const URL = require("url"); //解析url



let win; // 保存窗口对象的全局引用, 如果不这样做, 当JavaScript对象被当做垃圾回收时，window窗口会自动关闭
let display = true;
let newWindows = []; //新建的窗口
let tray = null; //托盘

const CONFIG = JSON.parse(
	fs.readFileSync( path.join(__dirname, "../config.json"), "utf-8" )
); //配置文件


/* 服务器 */
if (CONFIG.server){
	http.createServer(function(req, res) {
		const path = req.url.substr(1);
		console.log("------------------------------------\n", path, req.headers)

		//请求头处理
		/*const headers = {};
		for (const [i,v] of Object.entries(req.headers))
			headers[i] = v;
		headers.host = URL.parse(path).host;
		console.log(URL.parse(path).host)
		console.log(headers)*/

		const parse = URL.parse(path);
		switch (parse.protocol){
			case "https:":
				https.get({
					hostname: parse.host,
					port: parse.port,
					path: parse.path,
					rejectUnauthorized: false, // 忽略安全警告
					headers: {
						"user-agent": req.headers["user-agent"],
						"cookie": req.headers.cookie || ""
					}
				}, function(result){
					const mime = result.req.res.headers["content-type"];
					console.log(mime)
					res.writeHead(200, {"Content-Type": mime});
					result.on("data", data=>{
						if ( mime.indexOf("text/html") != -1 ||
							mime.indexOf("application/javascript") != -1 ||
							mime.indexOf("text/css") != -1
						){
							res.write( data.toString()
								.replace(/http:/g, `http://${req.headers.host}/http:`)
								.replace(/https:/g, `http://${req.headers.host}/https:`)
								.replace(/src\=\"\/\//g, `src=\"http://${req.headers.host}/https://`)
								.replace(/src\=\"\//g, `src=\"http://${req.headers.host}/${parse.protocol}//${parse.host}/`)
								.replace(/href\=\"\/\//g, `href=\"http://${req.headers.host}/https://`)
								.replace(/href\=\"\//g, `href=\"http://${req.headers.host}/${parse.protocol}//${parse.host}/`)
							);
						}else{
							res.write(data);
						}
					});
					result.on("end", ()=>{
						console.log("end")
						res.end();
					});
				}).on("error", err=>{
					console.error(err)
					res.writeHead(500, {"Content-Type": "text/plain"});
					res.end(err.message);
				});
				break;

			case "http:":
				http.request({
					hostname: parse.host,
					port: parse.port,
					path: parse.path,
					rejectUnauthorized: false, // 忽略安全警告
					headers: {
						"user-agent": req.headers["user-agent"],
						"cookie": req.headers.cookie || ""
					}
				}, function(result){
					const mime = result.req.res.headers["content-type"];
					console.log(mime)
					res.writeHead(200, {"Content-Type": mime});
					result.on("data", data=>{
						if ( mime.indexOf("text/html") != -1 ||
							mime.indexOf("application/javascript") != -1 ||
							mime.indexOf("text/css") != -1
						){
							res.write( data.toString()
								.replace(/http:/g, `http://${req.headers.host}/http:`)
								.replace(/https:/g, `http://${req.headers.host}/https:`)
								.replace(/src\=\"\/\//g, `src=\"http://${req.headers.host}/http://`)
								.replace(/src\=\"\//g, `src=\"http://${req.headers.host}/${parse.protocol}//${parse.host}/`)
								.replace(/href\=\"\/\//g, `href=\"http://${req.headers.host}/http://`)
								.replace(/href\=\"\//g, `href=\"http://${req.headers.host}/${parse.protocol}//${parse.host}/`)
							);
						}else{
							res.write(data);
						}
					});
					result.on("end", ()=>{
						console.log("end")
						res.end();
					});
				}).on("error", err=>{
					console.error(err)
					res.writeHead(500, {"Content-Type": "text/plain"});
					res.end(err.message);
				});
				break;

			default:
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.end("Invalid Protocol");
				return;
		}

		/*request({
			url: path,
			method: "GET",
			headers: { 
				"user-agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36"
			}
		}, function(error, response, body){
			if (error){
				console.log("error:", error)
				res.writeHead(500, {"Content-Type": "text/plain"});
				return res.end(error);
			}
			const mime = response.caseless.dict["content-type"].split(";")[0];
			console.log("mime:", mime)
			// console.log("body:", body)
			res.writeHead(200, {"Content-Type": mime});
			if (mime.substr(0,5) == "text/"){
				res.end(
					body.replace(/http:/g, `http://${req.headers.host}/http:`)
					.replace(/https:/g, `http://${req.headers.host}/https:`)
					.replace(/src\=\"\//g, `src=\"http://${req.headers.host}/${URL.parse(path).protocol}//${URL.parse(path).host}/`)
					.replace(/href\=\"\//g, `href=\"http://${req.headers.host}/${URL.parse(path).protocol}//${URL.parse(path).host}/`)
				);
			}else{
				res.end(body);
			}
		});*/
	}).listen(CONFIG.server);
}




//fs新增函数 递归创建目录
fs.mkdirsSync = function(dirname){
	if (fs.existsSync(dirname)) return; //已存在
	fs.mkdirsSync(path.dirname(dirname)); //递归创建上层目录
	fs.mkdirSync(dirname); //创建本层目录
};


//下载
function download(url, path, referer=""){
	return new Promise((resolve, reject)=>{
		const parse = URL.parse(url);
		console.log(parse)
		switch (parse.protocol){
			case "http:":
				http.get({
					hostname: parse.host,
					port: parse.port,
					path: parse.path,
					rejectUnauthorized: false, // 忽略安全警告
					headers: {
						"Host": parse.host,
						"Referer": referer
					}
				}, function(result){
					const file = fs.createWriteStream(path);
					result.pipe(file);
					file.on("finish", ()=>{
						file.close();
						resolve(true);
					});
				}).on("error", reject);
				break;

			case "https:":
				https.get({
					hostname: parse.host,
					port: parse.port,
					path: parse.path,
					rejectUnauthorized: false, // 忽略安全警告
					headers: {
						"Host": parse.host,
						"Referer": referer
					}
				}, function(result){
					const file = fs.createWriteStream(path);
					result.pipe(file);
					file.on("finish", ()=>{
						file.close();
						resolve(true);
					});
				}).on("error", reject);
				break;

			default:
				reject("Invalid Protocol");
				break;
		}
	});
}



//运行命令 .cmd
function runCommands(code){
	return new Promise((resolve, reject)=>{
		const name = +new Date() + ".txt";
		const file = path.join(__dirname, "../robot", name);
		fs.writeFileSync(file, code);
		execFile(path.join(__dirname, "../robot/node.exe"), [path.join(__dirname, "../robot/robot.js"), "file", file], function(err, stdout, stderr){
			resolve( stdout );
			fs.unlinkSync(file); //删除文件
		});
		
		/*const dir = process.env.ProgramData + "\\robot\\input";
		const name = +new Date() + ".txt";
		if ( !fs.existsSync(dir) )
			fs.mkdirSync( dir );
		fs.writeFileSync(path.join(dir, name), data); //input

		const id = setInterval(()=>{
			const file = process.env.ProgramData + "\\robot\\output\\" + name;
			if ( !fs.existsSync(file) )
				return;
			setTimeout(()=>{
				const output = fs.readFileSync(file, "utf-8");
				console.log("output:", output.substr(0,100))
				event.sender.send("commands_output", output);
				console.log(file)
				fs.unlinkSync(file); //删除文件 （等到写完后）
			}, 300);
			clearInterval(id);
		}, 0);*/
	});
}


//运行Electron .elec
function runElectron(code){
	return new Promise((resolve, reject)=>{
		if (code.substr(0,5) == "open "){
			const args = code.split(" "); //url width height fullscreen
			newWindows.push( new BrowserWindow({
				width: args[2] || 800,
				height: args[3] || 600,
				fullscreen: args[4]=="true",
				icon: "window.ico",
				autoHideMenuBar: true, //隐藏菜单
				webPreferences: {
					nodeIntegration: true,
					nodeIntegrationInWorker: true,
					contextIsolation: false
				}
			}).loadURL(args[1]) );
			resolve( JSON.stringify(newWindows) );

		}else if (code == "closeall"){
			newWindows.forEach(win => {try{
				win.close();
			}catch(err){
				resolve( JSON.stringify(err) );
			}});
			resolve( JSON.stringify(newWindows) );

		}else if(code.substr(0,9) == "download "){
			const args = code.split(" "); //url path referer
			download(args[1], args.slice(2).join(" ")).then(()=>resolve(true));
			/*const req = request({
				method: "GET",
				uri: args[1]
			});
			const out = fs.createWriteStream(args[2]);
			req.pipe(out);
			req.on("end", function(){
				resolve(true);
			});*/

		}else{
			let result;
			try{
				result = JSON.stringify(eval(code));
			}catch(err){
				result = err;
			}
			resolve(result);
		}
	});
	
}


//运行Javascript .js
let javascriptCallback = ()=>{};
function runJs(code){
	return new Promise((resolve, reject)=>{
		win.webContents.send("javascript", code);
		javascriptCallback = resolve;
	});
}



function createWindow(){
	// 创建浏览器窗口
	win = new BrowserWindow({
		width: 600,
		height: 500,
		autoHideMenuBar: true, //隐藏菜单
		webPreferences: {
			nodeIntegration: true,
			nodeIntegrationInWorker: true,
			contextIsolation: false
		}
	});
	
	//win.setProgressBar(0.5); //进度条
	win.setMenu(null); //隐藏菜单
	win.loadFile("index.html"); //加载index.html文件
	win.webContents.openDevTools(); //打开开发工具
	win.hide(); //隐藏窗口
	display = false;
	
	//托盘
	if (CONFIG.tray){
		tray = new Tray(path.join(__dirname, "tray.ico"));

		let contextMenu1, contextMenu2;
		let label_display1, label_display2, label_exit;
		if (CONFIG.tray.display){
			label_display1 = {
				label: "Show",
				click: ()=>{
					win.show();
					tray.setContextMenu(contextMenu2);
				}
			};
			label_display2 = {
				label: "Hide",
				click: ()=>{
					win.hide();
					tray.setContextMenu(contextMenu1);
				}
			};
		}

		if (CONFIG.tray.exit){ //true
			label_exit = {
				label: "Exit",
				click: ()=> exec("taskkill /f /im node.exe&taskkill /f /im RemoteControl.exe")
			};
		}else if (CONFIG.tray.exit === false){ //false
			label_exit = {
				label: "Exit",
				click: ()=> app.quit()
			};
		}else{ //null
			label_exit = {
				label: "Exit"
			};
		}

		contextMenu1 = Menu.buildFromTemplate(
			label_display1? [label_display1, label_exit]: [label_exit]
		);
		contextMenu2 = Menu.buildFromTemplate(
			label_display2? [label_display2, label_exit]: [label_exit]
		);
		tray.setToolTip("RemoteControl"); //提示
		tray.setContextMenu(contextMenu1);
	}
	
	//参数运行
	/*ipcMain.on("command_args", function(event, data){
		console.log("command_args", data)
		workerProcess = execFile(`"js/node.exe" robot.js ${data}`)
		workerProcess.stdout.on("data", function(data){
			console.log("stdout: " + data);
			event.sender.send("command_stdout", data);
		});
		workerProcess.stderr.on("data", function(data){
			console.log("stderr: " + data);
			event.sender.send("command_stderr", data);
		});
		workerProcess.on("close", function(code){
			console.log("close: " + code);
			event.sender.send("command_stdclose", code);
		});
	});*/

	//开机自启
	if (CONFIG.startup){
		execFile("wscript.exe", [path.join(__dirname, "../startup.vbs")], function(err, stdout, stderr){
			if (err) console.error(err);
		});
	}

	/*//robot.exe 文件运行
	execFile(path.join(__dirname, "robot.exe"), [], function(err, stdout, stderr){
		if (err) console.error(err);
	});*/

	//状态检测
	(function (){
		show = win.show;
		hide = win.hide; //重写
		win.show = ()=>{
			show();
			display = true;
		}
		win.hide = ()=>{
			hide();
			display = false;
		}
	})();
	setInterval(()=>{
		const dir = path.join(process.env.ProgramData, "RemoteControl");
		if (!fs.existsSync(dir))
			fs.mkdirsSync(dir);
		fs.writeFileSync(path.join(dir, "status.dat"), +new Date());
		fs.writeFileSync(path.join(dir, "display.dat"), display);
	}, 3*1000);
	//操作监听
	setInterval(()=>{
		const dir = path.join(process.env.ProgramData, "RemoteControl", "control");
		if (!fs.existsSync(dir))
			fs.mkdirsSync(dir);
		
		const files = fs.readdirSync(dir).sort(); //所有输入
		if (files.length <= 0) return;
		
		for (const name of files){
			const file = path.join(dir, name);
			switch ( fs.readFileSync(file).toString() ){
				case "show":
					win.show();
					break;
				case "hide":
					win.hide();
					break;
			}
			fs.unlinkSync(file); //用完即删
		}
	}, 500);


	//请求NAME
	ipcMain.on("name", function(event){
		event.sender.send("name", CONFIG.name);
	});

	//upload获取文件
	ipcMain.on("readfile", function(event, path){
		const result = fs.readFileSync(path).toString();
		event.sender.send("readfile_output", result);
	});

	//download
	ipcMain.on("download", function(event, url, path, referer){
		download(url, path, referer).then(()=>{
			event.sender.send("download_output", true);
		}).catch(err => {
			console.error(err)
			event.sender.send("download_error", ""+err);
		});
		/*const req = request({
			method: "GET",
			uri: url,
			referer
		});
		const out = fs.createWriteStream(path);
		req.pipe(out);
		req.on("end", function(){
			event.sender.send("download_output", true);
		});*/
	});

	//运行Electron .elec
	ipcMain.on("electron", function(event, code){
		runElectron(code).then((...data)=>{
			event.sender.send("electron_output", ...data);
		}).catch(err => {
			event.sender.send("electron_error", ...data);
		});
	});

	//运行Commands .cmd
	ipcMain.on("commands", function(event, code){
		runCommands(code).then((...data)=>{
			event.sender.send("commands_output", ...data);
		}).catch(err => {
			event.sender.send("commands_error", ...data);
		});
	});

	//运行Javascript输出
	ipcMain.on("javascript_output", function(event, ...data){
		javascriptCallback(...data);
	});

	/* 本地控制 */
	if (CONFIG.local_path)
		setTimeout(()=>{
			const INPUT = path.join(CONFIG.local_path, "input");
			const OUTPUT = path.join(CONFIG.local_path, "output");

			//获取输入命令
			setInterval(function(){
				if ( !fs.existsSync(INPUT) ) //不存在
					fs.mkdirsSync(INPUT);
				if ( !fs.existsSync(OUTPUT) ) //不存在
					fs.mkdirsSync(OUTPUT);

				const inputs = fs.readdirSync(INPUT).sort(); //所有输入
				if (inputs.length)
					console.log(inputs)

				for (const name of inputs){
					const type = name.split(".").slice(-1)[0]; //后缀类型
					const file = path.join(INPUT, name);
					switch (type){
						case "cmd":
							runCommands( fs.readFileSync(file).toString() ).then((...data)=>{
								fs.writeFileSync(path.join(OUTPUT, name+".cb"), data);
							}).catch(err => {
								fs.writeFileSync(path.join(OUTPUT, name+".cb"), "[ERROR]"+err);
							});
							break;

						case "js":
							runJs( fs.readFileSync(file).toString() ).then((...data)=>{
								fs.writeFileSync(path.join(OUTPUT, name+".cb"), JSON.stringify(data));
							}).catch(err => {
								fs.writeFileSync(path.join(OUTPUT, name+".cb"), "[ERROR]"+err);
							});
							break;

						case "elec":
							runElectron( fs.readFileSync(file).toString() ).then((...data)=>{
								fs.writeFileSync(path.join(OUTPUT, name+".cb"), JSON.stringify(data));
							}).catch(err => {
								fs.writeFileSync(path.join(OUTPUT, name+".cb"), "[ERROR]"+err);
							});
							break;

						default:
							fs.writeFileSync(path.join(OUTPUT, name+".cb"), "Invalid Type: " + type);
					}
					fs.unlinkSync(file); //用完即删
				};
			}, 0);

			//删除超时文件
			setInterval(function(){
				if ( !fs.existsSync(INPUT) ) //不存在
					fs.mkdirsSync(INPUT);
				if ( !fs.existsSync(OUTPUT) ) //不存在
					fs.mkdirsSync(OUTPUT);

				const outputs = fs.readdirSync(OUTPUT); //所有输出
				for (const name of outputs){
					const file = path.join(OUTPUT, name);
					const stats = fs.statSync(file);
					console.log(stats.mtime, +new Date(stats.mtime))
					if (new Date()-new Date(stats.mtime) > 3600*1000){ //1h有效期
						fs.unlinkSync(file);
					}
				}
			}, 1000);
		}, 5000); //内网连接延时

	//关闭窗口
	win.on("closed", () => {
		// 取消引用窗口对象, 如果你的应用程序支持多窗口，通常你会储存windows在数组中，这是删除相应元素的时候。
		console.log("closed");
		
		win = null;
	});
	
}

app.on("activate", () => {
	console.log("activate")
	if (win === null){
		createWindow();
	}else{
		win.show();
	}
});

// 当Electron完成初始化并准备创建浏览器窗口时，将调用此方法
// 一些api只能在此事件发生后使用。
app.on("ready", createWindow);

// 当所有窗口关闭时退出。
app.on("window-all-closed", ()=>{
	// 在macOS上，用得多的是应用程序和它们的菜单栏，用Cmd + Q退出。
	if (process.platform !== "darwin"){
		console.log("window-all-closed");
		app.quit();
	}
});

app.on("activate", ()=>{
	console.log("activate");
	// 在macOS上，当点击dock图标并且没有其他窗口打开时，通常会在应用程序中重新创建一个窗口。
	if (win === null) {
		createWindow();
	}
});
