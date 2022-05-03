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

let win; // 保存窗口对象的全局引用, 如果不这样做, 当JavaScript对象被当做垃圾回收时，window窗口会自动关闭
let newWindows = []; //新建的窗口
let tray = null; //托盘

const CONFIG = JSON.parse(
	fs.readFileSync( path.join(__dirname, "../config.json"), "utf-8" )
); //配置文件

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
	win.loadURL(`file://${__dirname}/index.html`); //加载index.html文件
	win.webContents.openDevTools(); //打开开发工具
	win.hide(); //隐藏窗口
	
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

	/*//文件运行
	execFile(path.join(__dirname, "robot.exe"), [], function(err, stdout, stderr){
		if (err) console.error(err);
	});*/

	//请求NAME
	ipcMain.on("name", function(event){
		event.sender.send("name", CONFIG.name);
	});

	//upload获取文件
	ipcMain.on("readfile", function(event, path, arg){
		const result = fs.readFileSync(path).toString();
		event.sender.send("readfile_output", result, arg);
	});

	//electron命令
	ipcMain.on("electron", function(event, code){
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
			event.sender.send("commands_output", JSON.stringify(newWindows));

		}else if (code == "closeall"){
			newWindows.forEach(win => win.close());
			event.sender.send("commands_output", JSON.stringify(newWindows));

		}else if(code.substr(0,9) == "download "){
			const args = code.split(" "); //url path
			const req = request({
				method: "GET",
				uri: args[1]
			});
			const out = fs.createWriteStream(args[2]);
			req.pipe(out);
			req.on("end", function(){
				event.sender.send("commands_output", true);
			});

		}else{
			let result;
			try{
				result = JSON.stringify(eval(code));
			}catch(err){
				result = err;
			}
			event.sender.send("commands_output", result);
		}
	});

	//执行命令
	ipcMain.on("commands", function(event, data){
		console.log("commands", data)

		const name = +new Date() + ".txt";
		const file = path.join(__dirname, "../robot", name);
		fs.writeFileSync(file, data);
		execFile(path.join(__dirname, "../robot/node.exe"), [path.join(__dirname, "../robot/robot.js"), "file", file], function(err, stdout, stderr){
			event.sender.send("commands_output", stdout);
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