let http = require('http')
let request = require('request')
let fs = require('fs')
let through = require('through')
let argv = require('yargs')
	.usage('Usage: $0 [options]')
	.example('$0 --url http://www.google.com --logfilename /tmp/proxyserver.log', 'Proxy the request to another server')
	.describe('host', 'Provide the host name of the server to be proxied')
	.describe('port', 'Provide the port on the server the request needs to be posted. The default is 80')
	.describe('url', 'Provide the complete the URL of the server with port')
	.describe('logfilename', 'The Log file where the server logs are recorded')
	.help('h')
    .alias('h', 'help')
    .epilog('Copyright CodePath & Walmart 2015')
    .default('loglevel', 'info')
	.default('host', '127.0.0.1')
	.argv
let scheme = 'http://'
let port = argv.port || argv.host === '127.0.0.1' ? 8000 : 80
let destinationUrl = argv.url || scheme + argv.host + ':' + port

let logStream = argv.logfilename? fs.createWriteStream(argv.logfilename) : process.stdout

let loglevelpriority = {
		info: 1,
		debug: 0
}


logMessage(destinationUrl + '\n', 'debug')

function logStreamMsg(req, level) {
	if(loglevelpriority[level] >= loglevelpriority[argv.loglevel]){
		logStream.write(level)
		through(req, logStream, {autoDestroy: false})
	}
}

function logMessage(message, level) {
	if(loglevelpriority[level] >= loglevelpriority[argv.loglevel]){
		logStream.write(level + ' ' + message)
	}
}

http.createServer((req, res) => {
	logMessage(' Echo Request: \n' + JSON.stringify(req.headers) + '\n', 'info')
	for(let header in req.headers){
		res.setHeader(header, req.headers[header])
	}
	logStreamMsg(req, 'info')
	req.pipe(res)

}).listen(8000)

logMessage('Listening at http://127.0.0.1:8000 \n', 'info')

http.createServer((req, res) => {
	let url = destinationUrl
	if(req.headers['x-destination-url']){
		url = req.headers['x-destination-url']
	}
	let options = {
		headers: req.headers,
		url: url + req.url
	}
	logMessage(' Proxy request: \n' + JSON.stringify(req.headers) + '\n', 'info')
	logStreamMsg(req, 'info')

	let destinationResponse = req.pipe(request(options))

	logMessage(' Destination Response: \n' + JSON.stringify(destinationResponse.headers) + '\n', 'debug')
	destinationResponse.pipe(res)
	logStreamMsg(destinationResponse, 'debug', logStream)

}).listen(8001)

