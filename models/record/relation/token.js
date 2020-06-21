'use strict';

const GenericRecord = require('../../record.js');

class RelationTokenRecord extends GenericRecord {
	/*
	 * A token of a relation
	 */
	
	constructor(input=null) {
		super();
		this._type = null; // Type of the token
		this._public = null; // Public key of the token
		this._private = null; // Private key of the token

		if (input !== null) {
			this.deserialize(input);
		}
	}
	
	serialize(includeSecrets=false) {
		return super.serialize(includeSecrets);
	}
	
	deserialize(input) {
		super.deserialize(input);
	}
}

module.exports = RelationTokenRecord;
