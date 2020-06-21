'use strict';

/*
 * Helper functions for objects
 * These functions have to be bound to a model class
 */

function get(field, type) {
	return this._data[field];
}

function set(field, type, input) {
	if (typeof type !== 'function') {
		throw 'Invalid type configured for field '+field+', expected a class';
	}
	if (input === null || input instanceof type) {
		if (input !== this._data[field]) {
			this._data[field] = input;
			this.setDirty(true);
		}
	} else if (typeof input === 'object') {
		this._data[field] = new type(input);
		this.setDirty(true);
	} else {
		throw 'Invalid input received. Expected an instance of '+type.name+' or null.';
	}
}

module.exports = {
	get: get,
	set: set
};
