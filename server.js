const {exec} = require("child_process"); //命令
const http = require("http"); //服务器&请求
const https = require("https"); //请求
const URL = require("url"); //解析url


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
}).listen(9203);

exec("ipconfig", function(err, stdout, stderr){
	console.log(stdout)
});