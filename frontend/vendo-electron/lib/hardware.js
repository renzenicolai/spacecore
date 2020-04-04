"use strict";

const fs           = require('fs');
const path         = require('path');
const EventEmitter = require('events');
const SerialPort   = require('serialport');
const Readline     = SerialPort.parsers.Readline;

class Device extends EventEmitter {
	constructor(parent, path) {
		super();
		this.parent = parent;
		this.path = path;
		this.port = new SerialPort(path, {baudRate: 115200});
		this.port.on('open', this._onOpen.bind(this));
		this.port.on('error', this._onError.bind(this));
		this.port.on('close', this._onClose.bind(this));
		this.parser = new Readline();
		this.parser.on('data', this._onData.bind(this));
		this.port.pipe(this.parser);
		
		this.hwid = null;
		this.type = null;
	}
	
	_onOpen() {
		console.log(this.path+" onOpen()");
		setTimeout(this._initDevice.bind(this), 2000);
	}
	
	_onError(error) {
		console.log(this.path+" onError()", error);
	}
	
	_onClose() {
		console.log(this.path+" onClose()");
	}
	
	_onData(data) {
		data = data.replace(/[^\x20-\x7E]/g, "");
		var parts = data.split("=");
		if (parts.length != 2) {
			console.log("Received garbage data on "+this.path+":",data);
		}
		
		if (parts[0]=="type") {
			this.type = parts[1];
		} else if (parts[0]=="id") {
			this.hwid = Number(parts[1]);
		} else if (parts[0]=="state") {
			this.emit("state", this, parts[1]);
		} else if (parts[0]=="boot") {
			// ignore
		} else if (parts[0]=="ibutton") {
			this.emit("token", this, parts[1]);
		} else {
			console.log("Unkown parameter",parts[0],"=",parts[1]);
		}
	}
	
	_initDevice() {
		if ((!this.hwid) || (!this.type)) {
			console.log(this.path+" does not appear to be a compatible device, disconnecting.");
			this.parent._remove(this.path);
		} else {
			console.log(this.path+" is a device of type "+this.type+" with id "+this.hwid);
			this.parent._register(this, this.path, this.type, this.hwid);
		}
	}
	
	setLed(id, value) {
		if (this.type === "coin") {
			if (id === "red") {
				if (value) {
					this.port.write("R");
				} else {
					this.port.write("r");
				}
			} else if (id === "green") {
				if (value) {
					this.port.write("G");
				} else {
					this.port.write("g");
				}
			} else {
				console.log(this.type, "invalid led type.");
			}
		} else {
			console.log(this.type, "can't set led.");
		}
	}
}

class Hardware extends EventEmitter {
	constructor(opts={}) {
		super();
		this._opts = Object.assign({
			// Empty
		}, opts);
		
		this._uninitializedDevices = {};
		this._devices = {};
	}
	
	//_onMessage(data) {
		//this.emit("message", data);
	//}
	
	_listPorts() {
		var devices = fs.readdirSync("/dev");
		devices = devices.filter((device) => device.startsWith("ttyUSB") || device.startsWith("ttyACM0"));
		return devices;
	}
	
	_onToken(device, token) {
		console.log("TOKEN", token);
		device.setLed("green", true);
		setTimeout(()=>{device.setLed("green", false);}, 2000);
	}
	
	async start() {
		var portNames = this._listPorts();
		
		for (let i = 0; i < portNames.length; i++) {
			let path = "/dev/"+portNames[i];
			let device = new Device(this, path);
			device.on("token", this._onToken.bind(this));
			this._uninitializedDevices[path] = device;
		}
	}
	
	_remove(path) {
		delete this._uninitializedDevices[path];
	}
	
	_register(object, path, type, id) {
		console.log("New device registered: ", path, type, id);
		this._devices[id] = {type: type, id: id, device: object};
	}
}

module.exports = Hardware;
