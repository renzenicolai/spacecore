'use strict';

const Record = require('../../record.js');
const ImageFile = require('../file/image.js');
const BasicHelper = require("../../helpers/basicHelper.js");
const ObjectHelper = require('../../helpers/objectHelper.js');

class GroupRecord extends Record {
	/*
	 * A group of relations
	 */
	
	constructor(input=null) {
		super(input);
		
		// Data storage
		this._data.name = '';
		this._data.description = '';
		this._data.default = false;
		this._data.picture = null;
		
		// Helper functions
		this.getName = BasicHelper.get.bind(this, 'name', 'string');
		this.setName = BasicHelper.set.bind(this, 'name', 'string');
		this.getDescription = BasicHelper.get.bind(this, 'description', 'string');
		this.setDescription = BasicHelper.set.bind(this, 'description', 'string');
		this.getDefault = BasicHelper.get.bind(this, 'default', 'boolean');
		this.setDefault = BasicHelper.set.bind(this, 'default', 'boolean');
		this.getPicture = ObjectHelper.get.bind(this, 'picture');
		this.setPicture = ObjectHelper.set.bind(this, 'picture');

		if (input !== null) {
			this.setName(input.name);
			this.setDescription(input.description);
		}
	}
	
	serialize(includeSecrets=false) {
		return Object.assign(
			super.serialize(includeSecrets),
			{
				name: this.getName(),
				description: this.getDescription(),
				default: this.getDefault(),
				picture: this.getPicture()
			}
		);
	}
}

module.exports = GroupRecord;
