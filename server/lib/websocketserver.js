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
		this._ws.on('open', this._onOpen.bind(this));
		this._ws.on('ping', this._onPing.bind(this));
		this._ws.on('close', this._onClose.bind(this));
	}
	
	ws() {
		return this._ws;
	}
	
	_onConnect(ws) {
		ws.on('message', this._onMessage.bind(this, ws));
	}
	
	_onOpen(ws) {
		
	}
	
	_onPing(ws) {
		
	}
	
	_onClose(ws) {
		
	}
	
	_onMessage(ws, message) {
		this._opts.application.handle(message, ws).then((result) => {
			ws.send(result);
		}).catch((error) => {
			ws.send(error);
		});
	}
}

module.exports = Websocketserver;
