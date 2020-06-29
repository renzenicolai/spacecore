'use strict';

const http = require('http');

class Webserver {
	constructor( opts ) {
		this._opts = Object.assign({
			port: 8080,
			host: '0.0.0.0',
			queue: 512,
			application: null,
            ws: null
		}, opts);
		
		this._webserver = http.createServer(this._handle.bind(this)).listen(
			this._opts.port,
			this._opts.host,
			this._opts.queue
		);
		
		this._webserver.on('upgrade', (req, socket, head) => {
			if (this._opts.ws !== null) {
				this._opts.ws.handleUpgrade(req, socket, head, (ws) => {
					this._opts.ws.emit('connection', ws, req);
				});
			} else {
				//console.log("[HTTP] Upgrade request not handled!");
				socket.destroy();
			}
		});
	}
	
	_handle(request, response) {
		const { method, url, headers } = request;
		let body = '';
		request.on('data', (data) => {
			body += data;
		});
		request.on('end', () => {
			if (url === '/') {
				if (method === 'POST') {
					this._opts.application.handle(body).then((result) => {
						response.writeHead(200, {'Content-Type': 'application/json'});
						response.end(result);
					}).catch((err) => {
						if (typeof err==='string') {
							response.writeHead(400, {'Content-Type': 'application/json'});
							response.end(err);
						} else {
							response.writeHead(500, {'Content-Type': 'text/html'});
							response.end("Internal server error");
							console.log('Application error', err);
						}
					});
				} else {
					response.writeHead(200, {'Content-Type': 'application/json'});
					response.end(application.usage());
				}
			} else {
				let rpcRequest = {
					method: url.substring(1)
				};
				if (method === 'POST') {
					try {
						rpcRequest.params = JSON.parse(body);
					} catch (error) {
						response.writeHead(400, {'Content-Type': 'text/html'});
						response.end('Invalid request');
						return;
					}
				}
				if (typeof headers.token === 'string') {
					rpcRequest.token = headers.token;
				}
				this._opts.application.handle(rpcRequest, null, false).then((result) => {
					response.writeHead(200, {'Content-Type': 'application/json'});
					response.end(result);
				}).catch((err) => {
					if (typeof err==='string') {
						response.writeHead(400, {'Content-Type': 'application/json'});
						response.end(err);
					} else {
						response.writeHead(500, {'Content-Type': 'text/html'});
						response.end("Internal server error");
						console.log('Application error', err);
					}
				});
			}
		});
	}
}

module.exports = Webserver;
