/*
 * Function: WS frontend
 * Author: Renze Nicolai 2018
 * License: GPLv3
 */

"use strict";

const WebSocket = require('ws');
const chalk     = require('chalk');

class Websocketserver {
	constructor( opts ) {
		this._opts = Object.assign({
			application: null
		}, opts);
		
		this._ws = new WebSocket.Server({
			noServer: true
		});
		
		this._ws.on('connection', this._onConnect.bind(this));
		this._ws.on('error', this._onError.bind(this));
	}
	
	ws() {
		return this._ws;
	}
	
	_onError(ws) {
		console.log(chalk.bgMagenta.white.bold(" WS ")+" Error.");
	}
	
	_onConnect(ws) {
		let rAddr = ws._socket.remoteAddress;
		let rPort = ws._socket.remotePort;
		console.log(chalk.bgMagenta.white.bold(" WS ")+" Client "+rAddr+":"+rPort+" connected");
		ws.on('message', this._onMessage.bind(this, ws));
		ws.on('close',   this._onClose.bind(this, ws));
		ws.on('ping',    this._onPing.bind(this, ws));
	}
	
	_onMessage(ws, message) {
		this._opts.application.handle(message, ws).then((result) => {
			ws.send(result);
		}).catch((error) => {
			ws.send(error);
		});
	}
	
	_onPing(ws) {
		//console.log(chalk.bgMagenta.white.bold(" WS ")+" Client ping.");
	}
	
	_onClose(ws) {
		let rAddr = ws._socket.remoteAddress;
		let rPort = ws._socket.remotePort;
		console.log(chalk.bgMagenta.white.bold(" WS ")+" Client "+rAddr+":"+rPort+" disconnected");
	}
}

module.exports = Websocketserver;
