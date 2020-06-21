'use strict';

const clone = require('clone');

/*
 * Helper functions for an array of basic values
 * These functions have to be bound to a model class
 */

function get(field, type) {
	let result = null;
	if (typeof type === 'string') {
		result = this._data[field];
	} else if (typeof type === 'function') {
		result = [];
		for (let i = 0; i < this._data[field].length; i++) {
			result.push(this._data[field][i].serialize());
		}
	} else {
		throw 'Expected type of '+field+' to be a string or class';
	}
	return result;
}

function set(field, type, input) {
	// Check input type: expect array
	if (!Array.isArray(input)) {
		throw 'Expected '+field+' to be an array of '+(type.name ? type.name : type);
	}
	// Check expected type to be contained in the array
	if (typeof type === 'string') {
		// Type is a basic type
		for (let i = 0; i < input.length; i++) {
			if (typeof input[i] !== type) {
				throw 'Expected '+field+'['+i+'] to be of type '+type;
			}
		}
		this._data[field] = clone(input);
	} else if (typeof type === 'function') {
		// Type is a class
		this._data[field] = [];
		for (let i = 0; i < input.length; i++) {
			if (input[i] instanceof type) {
				this._data[field].push(input[i]);
			} else {
				this._data[field].push(new type(input[i]));
			}
		}
	} else {
		throw 'Expected type of '+field+' to be a string or class';
	}
}

function add(field, type, input) {
	let result = false;
	if (typeof type === 'string') {
		// Type is a basic type
		if (typeof input !== type) {
			throw 'Expected '+field+' to be of type '+type;
		}
		if (this._data[field].indexOf(input) < 0) {
			this.setDirty(true);
			this._data[field].push(input);
			result = true;
		}
	} else if (typeof type === 'function') {
		// Type is a class
		let newObject = input;
		if (!(newObject instanceof type)) {
			newObject = new type(newObject);
		}
		if (this._data[field].indexOf(newObject) < 0) {
			this.setDirty(true);
			this._data[field].push(newObject);
			result = true;
		}
	} else {
		throw 'Expected type of '+field+' to be a string or class';
	}
	return result;
}

function remove(field, type, input) {
	let index = -1;
	if (typeof type === 'string') {
		// Type is a basic type
		if (typeof input !== type) {
			throw 'Expected '+field+' to be of type '+type;
		}
		index = this._data[field].indexOf(input);
		
	} else if (typeof type === 'function') {
		// Type is a class
		if (typeof input === 'object') {
			// Input is an object
			if (input instanceof type) {
				// Input is an instance of type
				index = this._data[field].indexOf(input);
			} else {
				throw 'Expected item to be removed to be an instance of '+type.name;
			}
		} else if (typeof input === 'number') {
			// Input is an object identifier
			for (let i = 0; i < this._data[field].length; i++) {
				if (input === this._data[field][i].getIdentifier()) {
					index = i;
					break;
				}
			}
		} else {
			throw 'Expected type of item to be removed from '+field+' to be an object or object identifier (number)';
		}
	} else {
		throw 'Expected type of '+field+' to be a string or class';
	}
	let result = false;
	if (index >= 0) {
		this._data[field].splice(index, 1);
		this.setDirty(true);
		result = true;
	}
	return result;
}

function has(field, type, input) {
	let index = -1;
	if (typeof type === 'string') {
		// Type is a basic type
		if (typeof input !== type) {
			throw 'Expected '+field+' to be of type '+type;
		}
		index = this._data[field].indexOf(input);
	} else if (typeof type === 'function') {
		// Type is a class
		if (typeof input === 'object') {
			// Input is an object
			if (input instanceof type) {
				// Input is an instance of type
				index = this._data[field].indexOf(input);
			} else {
				throw 'Expected item to be removed to be an instance of '+type.name;
			}
		} else if (typeof input === 'number') {
			// Input is an object identifier
			for (let i = 0; i < this._data[field].length; i++) {
				if (input === this._data[field][i].getIdentifier()) {
					index = i;
					break;
				}
			}
		} else {
			throw 'Expected type of item to be removed from '+field+' to be an object or object identifier (number)';
		}
	} else {
		throw 'Expected type of '+field+' to be a string or class';
	}
	let result = (index >= 0);
	return result;
}

module.exports = {
	get: get,
	set: set,
	add: add,
	remove: remove,
	has: has
};
