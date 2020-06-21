'use strict';

const Record = require('../record.js');

class GenericFile extends Record {
	/*
	 * A generic file record can hold all types of binary and text files
	 */
	
	constructor(input=null) {
		super(input);
		this._name = null;
		this._mime = null;
		this._buffer = null;
		if (input !== null) {
			this.setName(input.name);
			this.setMime(input.mime);
			this.setData(input.data);
		}
	}
	
	serialize(includeSecrets=false) {
		if (this._buffer === null) {
			throw 'Attempted to serialize an uninitialized file';
		}
		return Object.assign(super.serialize(includeSecrets), {
			name: this._name,
			mime: this._mime,
			size: this._buffer.length,
			data: this._buffer.toString('base64'),
		});
	}
		
	getName() {
		return this._name;
	}
	
	setName(name) {
		if (typeof name !== 'string') {
			throw 'Expected name to be a string';
		}
		this._name = name;
		this.setDirty(true);
	}
	
	getMime() {
		return this._mime;
	}
	
	setMime(mime) {
		if (typeof mime !== 'string') {
			throw 'Expected mime to be a string';
		}
		if (this.allowedMimeTypes.lastIndexOf(mime)<0) {
			if ((this.allowedMimeTypes.lastIndexOf('*')<0)) {
				throw `Mime type '${mime}' is not allowed`;
			}
		}
		this._mime = mime;
		this.setDirty(true);
	}
	
	getDataAsBase64() {
		return this._buffer.toString('base64');
	}
	
	getDataAsBuffer() {
		return this._buffer;
	}

	setData(data) {
		if ((typeof data !== 'string') && (!(data instanceof Buffer))) {
			throw 'Expected data to be a base64 string or a Buffer object';
		}
		if (typeof data === 'string') {
			this._buffer = Buffer.from(data, 'base64');
		} else {
			this._buffer = data;
		}
		this.setDirty(true);
	}

	getSize() {
		return this._buffer.length;
	}
}

GenericFile.prototype.allowedMimeTypes = [
	'*'
];

module.exports = GenericFile;
