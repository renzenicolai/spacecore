"use strict";

const chalk = require('chalk');

class Vending {
	constructor(opts={}) {
		this._opts = Object.assign({
			database: null,
			mqtt: null,
			sessions: null,
			persons: null,
			table: "pos_device"
		}, opts);

		if (this._opts.mqtt === null) throw "The vending module needs MQTT to function.";
		if (this._opts.database === null) throw "The vending module needs database to function.";
		if (this._opts.persons === null) throw "The vending module needs persons to function.";
		if (this._opts.sessions === null) throw "The vending module needs sessions to function.";

		this._table = this._opts.database.table(this._opts.table);
		this._devices = [];

		this._start(); //We don't care about the result
	}

	async _start() {
		var deviceRecords = await this._table.selectRecords({});
		for (var i in deviceRecords) {
			this._devices.push(new PosDevice({
				name: deviceRecords[i].getField('name'),
				topic: deviceRecords[i].getField('topic'),
				mqtt: this._opts.mqtt,
				sessions: this._opts.sessions,
				persons: this._opts.persons
			}));
		}
	}

	_stop() {
		for (var i = 0; i < this._devices.length; i++) {
			this._devices[i].stop();
		}
		this._devices = [];
	}

	_restart() {
		this._stop();
		this._start();
	}

	findDeviceByName(name) {
		for (var i = 0; i < this._devices.length; i++) {
			if (this._devices[i].name === name) {
				return this._devices[i];
			}
		}
		return null;
	}

	async vend(session, params) {
		if (typeof params !== 'object') throw "Expected object";
		if (typeof params.device !== 'string') throw "Missing device parameter";
		if (typeof params.slot !== 'number') throw "Missing slot parameter";
		var device = this.findDeviceByName(params.device);
		if (device === null) throw "Device not found";
		if (!device.isReady()) throw "Device is busy";
		return device.vend(params.slot);
	}

	async nudge(session, params) {
		if (typeof params !== 'object') throw "Expected object";
		if (typeof params.device !== 'string') throw "Missing device parameter";
		if (typeof params.slot !== 'number') throw "Missing slot parameter";
		var device = this.findDeviceByName(params.device);
		if (device === null) throw "Device not found";
		if (!device.isReady()) throw "Device is busy";
		return device.nudge(params.slot);
	}

	async led(session, params) {
		if (typeof params !== 'object') throw "Expected object";
		if (typeof params.device !== 'string') throw "Missing device parameter";
		var red = false;
		if (typeof params.red === 'boolean') red = params.red;
		var green = false;
		if (typeof params.green === 'boolean') green = params.green;
		var fade = false;
		if (typeof params.fade === 'boolean') fade = params.fade;
		var device = this.findDeviceByName(params.device);
		if (device === null) throw "Device not found";
		if (!device.isReady()) throw "Device is busy";
		return device.led(red, green, fade);
	}
	
	async frontpanelLed(session, params) {
		if (typeof params !== 'object') throw "Expected object";
		if (typeof params.device !== 'string') throw "Missing device parameter";
		if (typeof params.led !== 'number') throw "Expected led to be a number!";
		var device = this.findDeviceByName(params.device);
		if (device === null) throw "Device not found";
		return device.frontpanelLed(params.led);
	}
	
	async coinLed(session, params) {
		if (typeof params !== 'object') throw "Expected object";
		if (typeof params.device !== 'string') throw "Missing device parameter";
		if (typeof params.led !== 'number') throw "Expected led to be a number!";
		var device = this.findDeviceByName(params.device);
		if (device === null) throw "Device not found";
		return device.coinLed(params.led);
	}

	registerRpcMethods(rpc, prefix="pos") {
		if (prefix!=="") prefix = prefix + "/";
		rpc.addMethod(prefix+"vend", this.vend.bind(this));
		rpc.addMethod(prefix+"nudge", this.nudge.bind(this));
		rpc.addMethod(prefix+"led", this.led.bind(this));
		rpc.addMethod(prefix+"frontpanel/led", this.frontpanelLed.bind(this));
		rpc.addMethod(prefix+"coin/led", this.coinLed.bind(this));
		//rpc.addMethod(prefix+"state", this.getState.bind(this));
	}
}

class PosDevice {
	constructor(opts={}) {
		this._opts = Object.assign({
			name: "unknown",
			topic: "unknown",
			mqtt: null,
			sessions: null,
			persons: null
		}, opts);

		this.name = this._opts.name;
		this.state = {};

		this._opts = opts;
		this._registerMqttCallbacks();
		console.log(chalk.white.bold.inverse(" VENDING ")+" "+chalk.green("Started driver for point-of-sale device '"+this._opts.name+"', listening on MQTT topic '"+this._opts.topic+"'"));
	}

	stop() {
		console.log(chalk.white.bold.inverse(" VENDING ")+" "+chalk.green("Stopped driver for point-of-sale device '"+this._opts.name+"'"));
	}

	isReady() {
		return true; //Stub.
	}

	vend(slot) {
		if (!this.isReady()) return false;
		if (typeof slot !== 'number') throw "Parameter should be slot number!";
		this._opts.mqtt.send(this._opts.topic+'/vend', String(slot));
		return true;
	}

	nudge(slot) {
		if (!this.isReady()) return false;
		if (typeof slot !== 'number') throw "Parameter should be slot number!";
		this._opts.mqtt.send(this._opts.topic+'/nudge', String(slot));
		return true;
	}

	led(red, green, fade) {
		var value = 0;
		if (red) value += 1;
		if (green) value += 2;
		if (fade) value += 4;
		this._opts.mqtt.send(this._opts.topic+'/ibutton/led', String(value));
		return true;
	}
	
	async frontpanelLed(value) {
		this._opts.mqtt.send(this._opts.topic+'/frontpanel/led', String(params));
		return true;
	}
	
	async coinLed(value) {
		this._opts.mqtt.send(this._opts.topic+'/coin/led', String(params));
		return true;
	}

	_onDevice(message) {
		console.log(chalk.white.bold.inverse(" VENDING ")+" "+this._opts.name+") Debug: "+message);
		var sessions = this._opts.sessions.getSessions();
		for (var i = 0; i < this._opts.sessions.length; i++) {
			sessions[i].pushIfSubscribed("pos/"+this._opts.name+"/debug", String(message));
		}
	}

	_onIbutton(message) {
		console.log(chalk.white.bold.inverse(" VENDING ")+" "+this._opts.name+") iButton "+message);

		var sessions = this._opts.sessions.getSessions();
		for (var i = 0; i < this._opts.sessions.length; i++) {
			sessions[i].pushIfSubscribed("pos/"+this._opts.name+"/token", message);
		}

		this._opts.persons.findByTokenForVending(null, String(message)).then((result) => {
			var sessions = this._opts.sessions.getSessions();
			for (var i = 0; i < sessions.length; i++) {
				sessions[i].pushIfSubscribed("pos/"+this._opts.name+"/token/person", {res: result});
			}
		}).catch((err) => {
			console.log(chalk.white.bold.inverse(" VENDING ")+" "+"Error in _onIbutton for "+this._opts.name, err);
			var sessions = this._opts.sessions.getSessions();
			for (var i = 0; i < sessions.length; i++) {
				sessions[i].pushIfSubscribed("pos/"+this._opts.name+"/token/person", {err: err});
			}
		});

	}

	_onState(message) {
		message = String(message);
		console.log(chalk.white.bold.inverse(" VENDING ")+" "+"onState: " + message);
		var data = JSON.parse(message);
		this.state[data.id] = data.state;
		var sessions = this._opts.sessions.getSessions();
		for (var i = 0; i < sessions.length; i++) {
			sessions[i].pushIfSubscribed("pos/"+this._opts.name+"/state", {id: data.id, state: data.state});
		}
	}
	
	_onFrontpanelButton(message) {
		message = Number(message);
		console.log(chalk.white.bold.inverse(" VENDING ")+" "+"onFrontpanelButton: " + message);
		var sessions = this._opts.sessions.getSessions();
		for (var i = 0; i < sessions.length; i++) {
			sessions[i].pushIfSubscribed("pos/"+this._opts.name+"/frontpanel/button", message);
		}
	}
	
	_onCoin(message) {
		message = Number(message);
		console.log(chalk.white.bold.inverse(" VENDING ")+" "+"onCoin: " + message);
		var sessions = this._opts.sessions.getSessions();
		for (var i = 0; i < sessions.length; i++) {
			sessions[i].pushIfSubscribed("pos/"+this._opts.name+"/coin", message);
		}
	}

	_registerMqttCallbacks() {
		this._opts.mqtt.subscribe(this._opts.topic+"/device", this._onDevice.bind(this));
		this._opts.mqtt.subscribe(this._opts.topic+"/state", this._onState.bind(this));
		this._opts.mqtt.subscribe(this._opts.topic+"/ibutton", this._onIbutton.bind(this));
		this._opts.mqtt.subscribe(this._opts.topic+"/frontpanel/buttons", this._onFrontpanelButton.bind(this));
		this._opts.mqtt.subscribe(this._opts.topic+"/coin", this._onCoin.bind(this));
	}


}

module.exports = Vending;
