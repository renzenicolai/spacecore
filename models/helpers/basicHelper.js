'use strict';

/*
 * Helper functions for basic values
 * These functions have to be bound to a model class
 */

function get(field, type) {
	return this._data[field];
}

function set(field, type, input) {
	if (typeof input !== type) {
		throw 'Expected '+field+' to be of type '+type;
	} else {
		this._data[field] = input;
		this.setDirty(true);
	}
}

module.exports = {
	get: get,
	set: set
};
