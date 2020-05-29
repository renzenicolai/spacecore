/*
 * Function: HTTP frontend
 * Author: Renze Nicolai 2018
 * License: GPLv3
 */

"use strict";

const http = require('http');

class Webserver {
	constructor( opts ) {
		this._opts = Object.assign({
			port: 8080,
			host: '0.0.0.0',
			queue: 512,
			application: null,
			mime: 'text/html',
            ws: null
		}, opts);
		
		this._webserver = http.createServer(this._handle.bind(this)).listen(
			this._opts.port,
			this._opts.host,
			this._opts.queue
		);
		
		this._webserver.on('upgrade', (req, socket, head) => {
			if (this._opts.ws !== null) {
				//console.log("[HTTP] Upgrade request passed to ws!");
				this._opts.ws.handleUpgrade(req, socket, head, (ws) => {
					this._opts.ws.emit('connection', ws, req);
				});
			} else {
				//console.log("[HTTP] Upgrade request not handled!");
				socket.destroy();
			}
		});
	}
	
	_handle(req, res) {
		var rpcRequest = '';
		req.on('data', (data) => {
			rpcRequest += data;
		});
		req.on('end', () => {
			this._opts.application.handle(rpcRequest).then((result) => {
			res.writeHead(200, {'Content-Type': this._opts.mime});
			res.end(result);
			}).catch((err) => {
				if (typeof err==='string') {
					res.writeHead(400, {'Content-Type': this._opts.mime});
					res.end(err);
				} else {
					console.log(err);
					res.writeHead(500, {'Content-Type': this._opts.mime});
					if (this._opts.mime=='text/html') {
						res.end("<h1>Internal server error</h1><hr />Something went wrong while handling your request.");
					} else if (this._opts.mime=='application/json') {
						res.end(JSON.stringify({
							id: null,
							jsonrpc: "2.0",
							error: { code: -32000, message: "Internal server error" }
						}));
					} else {
						res.end("Internal server error");
					}
				}
			});
		});
	}
}

module.exports = Webserver;
