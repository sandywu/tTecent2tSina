var	util = require('util'),
	exec = require('child_process').exec,
	queryString = require('querystring'),
	http = require('http'),
	sign = function(){},
	timeStamp = 0,
	routine = false,
	CONFIG = {
		'debug': true,
		'port': 8080,
		'timeout': 5000,
		'threshold': 8000,
		'responseCode': {
			'SUCCESS': '1',
			'FAIL': '2',
			'TIMEOUT': '3',
			'OVERLOAD': '4'
		}
	};

function getCredential() {
	
	var	accessKey = {'token': undefined, 'secret': undefined};

	process.argv.forEach(function(parameter, index, array) {
		
		var arg = parameter.split('='),
			name = stripPrefix(arg[0]).toLowerCase(),
			val = arg[1];

		if (name in accessKey && val !== 'undefined') {
			accessKey[name] = val;
		}
	});

	if (!accessKey.token || !accessKey.secret) {
		throw new Error('getAccessKey(): Missing Token or Secret!');
	}

	return {
		'accessToken': accessKey.token,
		'tokenSecret': accessKey.secret
	}
	
	function stripPrefix(str) {
		return str && str.replace(/^\-/, '').trim();
	}
}

function initialize() {
	var credit = getCredential();
	sign = require('./mod/signature.js').generateSigner(credit.accessToken, credit.tokenSecret);
	createHttpServer(CONFIG.port);
}

function createClient(response, msg) {
	
	onClientStart(response);

	var parameters = 'format=json&content=' + msg,
		path = sign(parameters).replace(/http:\/\/.*?\.com/, ''),
		options = {
			'host': 'open.t.qq.com',
			'port': 80,
			'path': path,
			'method': 'POST',
			'headers':{
				'Content-Length': parameters.length,
				'content-type': 'application/x-www-form-urlencoded'
			}
		}

	var req = http.request(options, function(res) {
	
		if (CONFIG.debug) {
			console.log('STATUS: ' + res.statusCode);
			console.log('HEADERS: ' + JSON.stringify(res.headers));
		}

		res.setEncoding('utf8');
		res.on('data', function(chunk) {

			if (CONFIG.debug) {
				console.log('BODY: ' + chunk);
			}
			var data = JSON.parse(chunk);
			tTecentHandler(response, data, msg);
		
		});
	});
	
	req.write(parameters, 'utf8');		
	req.end();
}

function tSinaHandler(res, msg) {
	
	var CMD = 'curl -u "username:passwd" -d "status=' + msg + '" "http://api.t.sina.com.cn/statuses/update.json?source=2618146195"';

	 exec(CMD, function(error, stdout, stderr) {

		if (stdout) {

			if (CONFIG.debug) {
				console.log('stdout: ' + stdout);
			}

			onClientComplete();
			res.end(CONFIG.responseCode.SUCCESS);
			
		}

		if (error !== null) {
			console.log('exec error: ' + error);
		}	
	});
}

function tTecentHandler(res, data, msg) {

	if('msg' in data && data['msg'] == 'ok') {
		tSinaHandler(res, msg);
		return;
	}
	
	onClientComplete();
	res.end(CONFIG.responseCode.FAIL);
}

function onClientStart(response) {
	
	routine = false;
	
	setTimeout(function() {
		if (routine == false) {
			response.end(CONFIG.responseCode.TIMEOUT);
		}
	}, CONFIG.timeout);
}

function onClientComplete() {
	routine = true;
}

function createHttpServer(port) {

	http.createServer(function (req, res) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		requestHandler(req, res, prepareSync);
	}).listen(port, "16.8.124.221");

	console.log('SyncTwitter Server running at ' + port );
}

function requestHandler(request, response, callback) {
	
	var _data = ''

	request.addListener('data', function(chunk) {
		_data += chunk;
	});

	request.addListener('end', function() {
		callback(response, queryString.parse(_data));
	});
}

function prepareSync(response, data) {

	if (+new Date - timeStamp >= CONFIG.threshold) {		
	
		var msg = encodeURIComponent(data.msg);
		timeStamp = +new Date;
		createClient(response, msg);
	
	} else {
		response.end(CONFIG.responseCode.OVERLOAD);
	}
}

initialize();

