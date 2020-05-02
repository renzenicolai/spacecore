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
		
		this._client = null;
		
		this.connect();
		
		this.callbacks = {};
		this._topics = [];
	}
	
	connect() {
		if (this._client) {
			console.log(chalk.white.bold.inverse(" MQTT ")+" "+chalk.yellow("Closing previous session."));
			this._client.end();
		}
		
		var connectOpts = {
			host: this._opts.host,
			port: this._opts.port
		};
		
		if (this._opts.username !== null) {
			connectOpts.username = this._opts.username;
		}
		
		if (this._opts.password !== null) {
			connectOpts.password = this._opts.password;
		}
		
		this._client = mqtt.connect(connectOpts);
		this._client.on('connect', this._onConnect.bind(this));
		this._client.on('reconnect', this._onReconnect.bind(this));
		this._client.on('close', this._onClose.bind(this));
		this._client.on('disconnect', this._onDisconnect.bind(this));
		this._client.on('offline', this._onOffline.bind(this));
		this._client.on('error', this._onError.bind(this));
		this._client.on('message', this._handle.bind(this));
	}
	
	_onConnect() {
		console.log(chalk.white.bold.inverse(" MQTT ")+" "+chalk.green(" Connected to the MQTT server"));
		this._client.subscribe(this._opts.topic);
		this._client.subscribe(this._opts.topic+"/#");
		for (var i in this._topics) {
			this._client.subscribe(this._topics[i]);
		}
	}
	
	_onReconnect() {
		console.log(chalk.white.bold.inverse(" MQTT ")+" "+chalk.yellow(" Reconnect started"));
	}
	
	_onClose() {
		console.log(chalk.white.bold.inverse(" MQTT ")+" "+chalk.red(" Connection closed"));
	}
	
	_onDisconnect() {
		console.log(chalk.white.bold.inverse(" MQTT ")+" "+chalk.red(" Disconnect packet received from broker"));
	}
	
	_onOffline() {
		console.log(chalk.white.bold.inverse(" MQTT ")+" "+chalk.red(" Unable to connect"));
	}
	
	_onError(error) {
		console.log(chalk.white.bold.inverse(" MQTT ")+" "+chalk.red(" Error:"), error);
	}
	
	
	async _handle(topic, message) {
		var returnTopic = topic+"/response";
		if (topic.startsWith(this._opts.topic)) {
			// Message sent to the RPC command topic
			if (topic.endsWith("/response")) {
				// Ignore our own responses
				return;
			}
			if (this._opts.rpc==null) {
				return;
			}
			try {
				var rpcRequest = message.toString('utf8');
				var result = await this._opts.rpc.handle(rpcRequest);
				this._client.publish(returnTopic, result);
			} catch (error) {
				if (typeof error==='string') {
					this._client.publish(returnTopic, error);
				} else {
					console.log(chalk.white.bold.inverse(" MQTT "),err);
					this._client.publish(returnTopic, JSON.stringify({
						id: null,
						jsonrpc: "2.0",
						error: { code: -32000, message: "Internal server error" }
					}));
				}
			}
		} else {
			// Message sent to another topic
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
