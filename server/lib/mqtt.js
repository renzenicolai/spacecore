/*
 * Function: MQTT frontend
 * Author: Renze Nicolai 2018-2020
 * License: GPLv3
 */

"use strict";

const mqtt  = require('mqtt');
const chalk = require('chalk');

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
		
		this.callbacks = {};
		
		this._topics = [];
	}
	
	_connect() {
		console.log(chalk.white.bold.inverse(" MQTT ")+" "+chalk.green("connected"));
		this._client.subscribe(this._opts.topic);
		this._client.subscribe(this._opts.topic+"/#");
		for (var i in this._topics) {
			this._client.subscribe(this._topics[i]);
		}
	}
	
	_handle(topic, message) {
		if (topic.startsWith(this._opts.topic)) {
			if (topic.endsWith("/response")) return; //Ignore our own messages
			var rpcRequest = message.toString('utf8');
			var returnTopic = topic+"/response";
			if (this._opts.rpc==null) return false;
			var request = this._opts.rpc.handle(rpcRequest);
			if (request == null) return false;
			return request.then((result) => {
				this._client.publish(returnTopic, result);
				return true;
			}).catch((err) => {
				if (typeof err==='string') {
					this._client.publish(returnTopic, err);
				} else {
					console.log(chalk.white.bold.inverse(" MQTT "),err);
					this._client.publish(returnTopic, JSON.stringify({
						id: null,
						jsonrpc: "2.0",
						error: { code: -32000, message: "Internal server error" }
					}));
				}
				return false;
			});
		} else {
			if (topic in this.callbacks) {
				try {
					this.callbacks[topic](message);
				} catch(err) {
					console.log(chalk.white.bold.inverse(" MQTT ")+" Error in MQTT callback for topic '"+topic+"':", err);
				}
			}
		}
	}
	
	subscribe(topic, callback) {
		this._client.subscribe(topic);
		if (!this._topics.includes(topic)) {
			this._topics.push(topic);
		}
		this.callbacks[topic] = callback;
	}
	
	send(topic, message) {
		console.log(chalk.white.bold.inverse(" MQTT ")+" Sending '"+message+"' to '"+topic+"'.");
		this._client.publish(topic, message);
	}
}

module.exports = Mqttclient;
