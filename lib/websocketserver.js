/*
 * Function: WS frontend
 * Author: Renze Nicolai 2018
 * License: GPLv3
 */

"use strict";

const WebSocket = require('ws');

class Websocketserver {
	constructor( opts ) {
		this._opts = Object.assign({
			application: null
		}, opts);
		
		this._ws = new WebSocket.Server({
			noServer: true
		});
		
		this._ws.on('connection', this._onConnect.bind(this));
	}
	
	ws() {
		return this._ws;
	}
	
	_onConnect(ws) {
		//console.log("[WS] Connect!");
		ws.on('message', this._onMessage.bind(this, ws));
	}
	
	_onMessage(ws, message) {
		//console.log("[WS] Message",message);
		this._opts.application.handle(message).then((result) => {
			console.log("[WS] result", result);
			ws.send(result);
		}).catch((error) => {
			console.log("[WS] Error", error);
			ws.send(error);
		});
	}
}

module.exports = Websocketserver;
