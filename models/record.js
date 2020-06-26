'use strict';

const BasicHelper = require("./helpers/basicHelper.js");

class Record {
	/*
	 * The base class from which the most of the other models are derrived
	 * Implements basic functionality for working with a database record: keeping track
	 * of the identifier of the record and weither or not the record is dirty and needs to
	 * be flushed to the database
	 */
	
	constructor(input=null) {
		// Data storage
		this._data = {
			id: null,
			dirty: true
		};
		
		// Helper functions
		this.getIdentifier = BasicHelper.get.bind(this, 'id', 'number');
		this.setIdentifier = BasicHelper.setOrNull.bind(this, 'id', 'number');
		this.getDirty = BasicHelper.get.bind(this, 'dirty', 'boolean');
		this.setDirty = BasicHelper.set.bind(this, 'dirty', 'boolean');
		
		if (input !== null) {
			if (typeof input !== 'object') {
				throw 'Expected an object';
			}
			if (typeof input.id !== 'undefined') {
				this.setIdentifier(input.id);
			}
		}
	}

	_serializeArray(array, includeSecrets) {
		let result = [];
		for (let i = 0; i < array.length; i++) {
			result.push(array[i].serialize(includeSecrets));
		}
		return result;
	}
	
	serialize(includeSecrets=false) {
		return {
			id: this._data.id
		};
	}
}

module.exports = Record;
