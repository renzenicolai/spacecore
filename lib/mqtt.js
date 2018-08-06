/*
 * Function: MQTT frontend
 * Author: Renze Nicolai 2018
 * License: GPLv3
 */

"use strict";

const mqtt = require('mqtt');

class Mqttclient {
	constructor( opts ) {
		this._opts = Object.assign({
			port: 8080,
			host: '0.0.0.0',
			username: null,
			password: null,
			topic: '#',
			rpc: null
		}, opts);
		
		var connectOpts = {
				host: this._opts.host,
				port: this._opts.port
		};
		
		if (this._opts.username !== null) connectOpts.username = this._opts.username;
		if (this._opts.password !== null) connectOpts.password = this._opts.password;
		
		this._client = mqtt.connect(connectOpts);
		this._client.on('connect', this._connect.bind(this));
		this._client.on('message', this._handle.bind(this));
	}
	
	_connect() {
		console.log("MQTT connected!");
		this._client.subscribe(this._opts.topic);
		this._client.subscribe(this._opts.topic+"/#");
	}
	
	_handle(topic, message) {
		if (topic.endsWith("/response")) return; //Ignore our own messages
		var rpcRequest = message.toString('utf8');
		var returnTopic = topic+"/response";
		if (this._opts.rpc==null) return false;
		return this._opts.rpc.handle(rpcRequest).then((result) => {
			this._client.publish(returnTopic, result);
			return true;
		}).catch((err) => {
			if (typeof err==='string') {
				this._client.publish(returnTopic, err);
			} else {
				console.log(err);
				this._client.publish(returnTopic, JSON.stringify({
					id: null,
					jsonrpc: "2.0",
					error: { code: -32000, message: "Internal server error" }
				}));
			}
			return false;
		});
	}
	
	send(topic, message) {
		this._client.publish(topic, message);
	}
}

module.exports = Mqttclient;
