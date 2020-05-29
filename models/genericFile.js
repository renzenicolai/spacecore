'use strict';

const GenericRecord = require('./genericRecord.js');

class GenericFile extends GenericRecord {
	/*
	 * A generic file record can hold all types of binary and text files
	 * 
	 */
	
	constructor(input=null) {
		super();
		this._name = null;
		this._mime = null;
		this._buffer = null;
		if (input !== null) {
			this.deserialize(input);
		}
	}
	
	serialize(includeSecrets=false) {
		if (this._buffer === null) {
			throw "Attempted to serialize an uninitialized file";
		}
		return Object.assign(super.serialize(includeSecrets), {
			name: this._name,
			mime: this._mime,
			size: this._buffer.length,
			data: this._buffer.toString('base64'),
		});
	}
	
	deserialize(input) {
		super.deserialize(input);
		if (typeof input.name !== 'string') {
			throw "Missing name argument (expected string)";
		}
		if (typeof input.mime !== 'string') {
			throw "Missing mime argument (expected string)";
		}
		if ((typeof input.data !== 'string') && (!(input.data instanceof Buffer))) {
			console.log(input, input.data, input.data instanceof Buffer);
			throw "Missing data argument (expected base64 string or Buffer object)";
		}
		
		this._name = input.name;
		this._mime = input.mime;
		if (typeof input.data === 'string') {
			this._buffer = Buffer.from(input.data, 'base64');
		} else {
			this._buffer = input.data;
		}
	}
	
	getName() {
		return this._name;
	}
	
	setName(name) {
		if (typeof name !== "string") {
			throw "Expected name to be a string";
		}
		this.setDirty(true);
		this._name = name;
	}
	
	getMime() {
		return this._mime;
	}
	
	setMime(mime) {
		if (typeof mime !== "string") {
			throw "Expected mime to be a string";
		}
		this.setDirty(true);
		this._mime = mime;
	}
	
	getDataAsBase64() {
		return this._buffer.toString('base64');
	}
	
	getDataAsBuffer() {
		return this._buffer;
	}
}

GenericFile.prototype.allowedMimeTypes = [
	"*"
];

module.exports = GenericFile;
