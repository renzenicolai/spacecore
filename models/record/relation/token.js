'use strict';

const Record = require('../../record.js');
const BasicHelper = require("../../helpers/basicHelper.js");

class TokenRecord extends Record {
	/*
	 * A token of a relation
	 */
	
	constructor(input=null) {
		super(input);
		
		// Data storage
		this._data.type = '';
		this._data.public = '';
		this._data.private = null;
		
		// Helper functions
		this.getType = BasicHelper.get.bind(this, 'type', 'string');
		this.setType = BasicHelper.set.bind(this, 'type', 'string');
		this.getPublic = BasicHelper.get.bind(this, 'public', 'string');
		this.setPublic = BasicHelper.set.bind(this, 'public', 'string');
		this.getPrivate = BasicHelper.get.bind(this, 'private', 'string');
		this.setPrivate = BasicHelper.set.bind(this, 'private', 'string');

		if (input !== null) {
			this.setType(input.type);
			this.setPublic(input.public);
			this.setPrivate(input.private);
		}
	}
	
	serialize(includeSecrets=false) {
		let result = Object.assign(
			super.serialize(includeSecrets),
			{
				type: this.getType(),
				public: this.getPublic()
			}
		);
		if (includeSecrets) {
			result.private = this.getPrivate();
		}
		return result;
	}
}

module.exports = TokenRecord;
