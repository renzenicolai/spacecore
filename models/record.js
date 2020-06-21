'use strict';

class Record {
	/*
	 * The base class from which the most of the other models are derrived
	 * Implements basic functionality for working with a database record: keeping track
	 * of the identifier of the record and weither or not the record is dirty and needs to
	 * be flushed to the database
	 */
	
	constructor(input=null) {
		this._data = {
			id: null,
			dirty: true
		};
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
	
	/* 
	 * Dirty
	 * The dirty marker allows the database library to track which records need to be flushed to the database
	 */
	
	getDirty() {
		return this._data.dirty;
	}
	
	setDirty(dirty) {
		if (typeof dirty !== 'boolean') {
			throw 'Expected the dirty flag to be a boolean';
		} else {
			this._data.dirty = dirty;
		}
	}

	/* 
	 * Identifier
	 * Used to uniquely identify this user record in the database
	 */
	
	getIdentifier() {
		return this._data.id;
	}
	
	setIdentifier(identifier) {
		if ((typeof identifier !== 'number') && (identifier !== null)) {
			throw 'Expected the identifier to be a number';
		} else if (identifier !== this._id) {
			this.setDirty(true);
			this._data.id = identifier;
		}
	}
}

module.exports = Record;
