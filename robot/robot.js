const fs = require("fs");
const path = require("path");
const robot = require("robotjs");
const screenshot = require("desktop-screenshot");
const child_process = require("child_process"); //exec运行
const request = require("request"); //发送请求


//fs新增函数 递归创建目录
fs.mkdirsSync = function(dirname){
	if (fs.existsSync(dirname)) return; //已存在
	fs.mkdirsSync(path.dirname(dirname)); //递归创建上层目录
	fs.mkdirSync(dirname); //创建本层目录
};


const args = process.argv.slice(2);
async function run(){
	switch (args[0]){
		case "dir": //读取目录
			const input = args[1], output = args[2];

			const out = (name, text) =>
				fs.writeFileSync(path.join(output, name), text, "utf-8");

			setInterval(async ()=>{
				if ( !fs.existsSync(input) ) //不存在
					fs.mkdirsSync(input);
				if ( !fs.existsSync(output) ) //不存在
					fs.mkdirsSync(output);

				const files = fs.readdirSync(input).sort(); //所有文件
				if (files.length)
					console.log(files)

				for (const name of files){
					const file = path.join(input, name);
					try{
						out( name, await runFile(file) );
					}catch(err){
						console.error("RunFile Error:\r\n" + err)
						out(name, "RunFile Error:\r\n" + err);
					}
					fs.unlinkSync(file); //用完即删
				};
			}, 0);
			break;

		case "file": //读取文件
			console.log( await runFile(args[1]) );
			break;

		default: //运行参数
			console.log( await runLine(args) );
			break;
	}
}
run();


/* 运行一个文件 */
async function runFile(file){
	if ( !fs.existsSync(file) ) return console.error("No File:", file); //不存在
	const lines = fs.readFileSync(file, "utf-8")
		.split("\n")
		.map( v => v.trim() );
	const res = [];
	for (const line of lines){
		const ret = await runLine( line.split(" ").map(v=>v.trim()) );
		res.push(ret);
	}
	return res.join("\r\n");
}

/* 运行一行 document: http://robotjs.io/docs/syntax */
async function runLine(args){
	switch (args[0]){
		/* Key */
		case "setKeyboardDelay": //设置延时
			robot.setKeyboardDelay(args[1]);
			return true;
			break;

		case "keyTap": //keyTap(key, [modifier])
			if (args[2]){
				robot.keyTap(args[1], args[2]);
			}else if (args[1]){
				robot.keyTap(args[1]);
			}
			return true;
			break;

		case "keyToggle": //keyToggle(key, down, [modifier])
			if (args[3]){
				robot.keyToggle(args[1], args[2], args[3]);
			}else if (args[2]){
				robot.keyToggle(args[1], args[2]);
			}
			return true;
			break;

		case "typeString":
			robot.typeString(args.slice(3).join(" "));
			return true;
			break;

		case "typeStringDelayed":
			robot.typeStringDelayed(args.slice(4).join(" "), args[1]);
			return true;
			break;


		/* Mouse */
		case "setMouseDelay": //设置延时
			robot.setMouseDelay(args[1]);
			return true;
			break;

		case "moveMouse":
			robot.moveMouse(args[1], args[2]);
			return true;
			break;

		case "moveMouseDelta":{
			const {x, y} = robot.getMousePos();
			robot.moveMouse(+args[1]+x, +args[2]+y);
			return true;
			break;
		}

		case "moveMouseSmooth":
			robot.moveMouseSmooth(args[1], args[2]);
			return true;
			break;
			
		case "moveMouseSmoothDelta":{
			const {x, y} = robot.getMousePos();
			robot.moveMouseSmooth(+args[1]+x, +args[2]+y);
			return true;
			break;
		}

		case "mouseClick": //mouseClick([button(left,right,middle)], [double双击])
			robot.mouseClick(args[1], args[2]=="true");
			return true;
			break;

		case "mouseToggle": //mouseToggle([down], [button(left,right,middle)])
			robot.mouseToggle(args[1], args[2]);
			return true;
			break;

		case "dragMouse":
			robot.dragMouse(args[1], args[2]);
			return true;
			break;

		case "dragMouseDelta":{
			const {x, y} = robot.getMousePos();
			robot.dragMouse(+args[1]+x, +args[2]+y);
			return true;
			break;
		}

		case "getMousePos":{
			const {x, y} = robot.getMousePos();
			return `${x} ${y}`;
			break;
		}

		case "scrollMouse":
			robot.scrollMouse(args[1], args[2]);
			return true;
			break;


		/* Screen */
		case "getPixelColor":{
			const color = robot.getPixelColor(args[1], args[2]);
			return color;
			break;
		}

		case "getScreenSize":{
			const {width, height} = robot.getScreenSize();
			return `${width} ${height}`;
			break;
		}

		case "screenCapture":{ //screen.capture([x], [y], [width], [height])
			const data = robot.screen.capture(args[1], args[2], args[3], args[4]);
			let str = "";
			for (let i=0; i<data.width; i++){
				for (let j=0; j<data.height; j++){
					str += data.colorAt(i, j) + ",";
				}
				str = str.slice(0, -1);
				str += ";\n";
			}
			return str;
			break;
		}

		case "screenshot":
			return await (function(){
				return new Promise((resolve, reject)=>{
					screenshot("screenshot.png", function(err, complete){
						if (err){
							console.error(err);
							resolve("Screenshot Error:" + err);
						}else{
							const image = fs.readFileSync("screenshot.png");
							resolve( image.toString("base64") );
						}
					});
				});
			})();
			break;

		/* js代码 */
		case "nodejs":{
			const res = eval(args.slice(1).join(" "));
			return res;
			break;
		}
		
		case "cmd":
			return await (function(){
				return new Promise((resolve, reject)=>{
					child_process.exec(args.slice(1).join(" "), function(err, stdout, stderr){
						resolve([err, stdout, stderr]);
					});
				});
			})();
			break;

		case "msg":
			return await (function(){
				return new Promise((resolve, reject)=>{
					let time = 60, text = args.slice(1).join(" ");
					if (+args[1] > 0){ //是数字且大于0
						time = +args[1];
						text = args.slice(2).join(" ")
					}
					child_process.exec(`msg * /v /w /time:${time} ${text}`, function(err, stdout, stderr){
						resolve([err, stdout, stderr]);
					});
				});
			})();
			break;

		case "vbscript":
			return child_process.exec("mshta vbscript:" + args.slice(1).join(" "));
			break;

		case "jscript":
			return child_process.exec("mshta javascript:" + args.slice(1).join(" "));
			break;

		/* 系统操作 */
		case "di":
			process.stdout.write("\x07");
			break;

		case "search":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88AA))(window.close)"');
			break;

		case "browser":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88AC))(window.close)"');
			break;

		case "mute":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88AD))(window.close)"');
			break;

		case "volumeDown":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88AE))(window.close)"');
			break;

		case "volumeUp":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88AF))(window.close)"');
			break;

		case "next":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88B0))(window.close)"');
			break;

		case "last":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88B1))(window.close)"');
			break;

		case "stop":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88B2))(window.close)"');
			break;

		case "pause":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88B3))(window.close)"');
			break;

		case "email":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88B4))(window.close)"');
			break;

		case "player":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88B5))(window.close)"');
			break;

		case "computer":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88B6))(window.close)"');
			break;

		case "calculator":
			return child_process.exec('mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88B7))(window.close)"');
			break;

		case "pressKeycode":
			return child_process.exec(`mshta "vbscript:createobject("wscript.shell").Sendkeys(Chr(&H88${args[1]}))(window.close)"`);
			break;

		/* 网络操作 */
		case "download":
			return new Promise((resolve, reject)=>{
				const req = request({
					method: "GET",
					uri: args[1]
				});
				const out = fs.createWriteStream(args[2]);
				req.pipe(out);
				req.on("end", function(){
					resolve(true);
				});
			});
			break;

		default:
			console.error("Invalid Command: " + args[0]);
			return "Error: Invalid Command: " + args[0];
	}
}