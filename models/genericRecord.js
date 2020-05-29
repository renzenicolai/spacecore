'use strict';

class GenericRecord {
	/*
	 * A generic record is the base class from which the other models are derrived.
	 */
	
	constructor() {
		this._id = null;
		this._dirty = true;
	}
	
	serialize(includeSecrets=false) {
		return {
			id: this._id
		};
	}
	
	deserialize(data) {
		if (typeof data !== 'object') {
			throw "Deserialize called with an argument that isn't an object";
		}
		if (typeof data.id !== 'undefined') {
			this.setIdentifier(data.id);
		}
	}
	
	/* 
	 * Dirty
	 * The dirty marker allows the database library to track which records need to be flushed to the database
	 */
	
	getDirty() {
		return this._dirty;
	}
	
	setDirty(dirty) {
		if (typeof dirty !== 'boolean') {
			throw "Expected the dirty flag to be a boolean";
		}
		this._dirty = dirty;
	}

	/* 
	 * Identifier
	 * Used to uniquely identify this user record in the database
	 */
	
	getIdentifier() {
		return this._id;
	}
	
	setIdentifier(identifier) {
		if ((typeof identifier !== 'number') && (identifier !== null)) {
			throw "Expected the identifier to be a number!";
		} else if (identifier !== this._id) {
			this.setDirty(true);
			this._id = identifier;
		}
	}
}

module.exports = GenericRecord;
