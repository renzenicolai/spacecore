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
		this._data.enabled = false;
		this._data.public = '';
		this._data.private = null;
		
		// Helper functions
		this.getType = BasicHelper.get.bind(this, 'type', 'string');
		this.setType = BasicHelper.set.bind(this, 'type', 'string');
		this.getEnabled = BasicHelper.get.bind(this, 'enabled', 'boolean');
		this.setEnabled = BasicHelper.set.bind(this, 'enabled', 'boolean');
		this.getPublic = BasicHelper.get.bind(this, 'public', 'string');
		this.setPublic = BasicHelper.set.bind(this, 'public', 'string');
		this.getPrivate = BasicHelper.get.bind(this, 'private', 'string');
		this.setPrivate = BasicHelper.set.bind(this, 'private', 'string');

		if (input !== null) {
			this.setType(input.type);
			this.setPublic(input.public);
			this.setPrivate(input.private);
			this.setEnabled(input.enabled);
		}
	}
	
	serialize(includeSecrets=false) {
		let result = Object.assign(
			super.serialize(includeSecrets),
			{
				type: this.getType(),
				public: this.getPublic(),
				enabled: this.getEnabled()
			}
		);
		if (includeSecrets) {
			result.private = this.getPrivate();
		}
		return result;
	}
}

module.exports = TokenRecord;
