'use strict';

const clone = require('clone');
const shacrypt = require('shacrypt');
const crypto = require('crypto');
const Record = require('../record.js');
const ImageFile = require('./file/image.js');
const BasicHelper = require("../helpers/basicHelper.js");
const ArrayHelper = require("../helpers//arrayHelper.js");
const ObjectHelper = require("../helpers//objectHelper.js");

class User extends Record {
	/*
	 * A user account contains properties identifying the user as well as a list of
	 * granted permissions that tell the RPC module which methods the connected
	 * client is allowed to use.
	 */
	
	constructor(input=null) {
		super(input);
		
		// Data storage
		this._data.username = null;
		this._data.password = null;
		this._data.title = null;
		this._data.picture = null;
		this._data.permissions = [];
		
		// Helper functions
		this.getUsername = BasicHelper.get.bind(this, 'username', 'string');
		this.setUsername = BasicHelper.set.bind(this, 'username', 'string');
		this.getTitle = BasicHelper.get.bind(this, 'title', 'string');
		this.setTitle = BasicHelper.set.bind(this, 'title', 'string');
		this.getPicture = ObjectHelper.get.bind(this, 'picture', ImageFile);
		this.setPicture = ObjectHelper.set.bind(this, 'picture', ImageFile);
		this.getPermissions = ArrayHelper.get.bind(this, 'permissions', 'string');
		this.setPermissions = ArrayHelper.set.bind(this, 'permissions', 'string');
		this.hasPermission = ArrayHelper.has.bind(this, 'permissions', 'string');
		this.addPermission = ArrayHelper.add.bind(this, 'permissions', 'string');
		this.removePermission = ArrayHelper.remove.bind(this, 'permissions', 'string');
		
		// Load initial dataset
		if (input !== null) {
			this.setUsername(input.username);
			this.setPasswordHash(input.password);
			this.setTitle(input.title);
			this.setPicture(input.picture);
			this.setPermissions(input.permissions);
		}
	}
	
	serialize(includeSecrets=false) {
		let output = Object.assign(super.serialize(includeSecrets), {
			username: this._data.username, // String
			title: this._data.title, // String
			picture: this._data.picture ? this._data.picture.serialize() : null, // Object
			permissions: this._data.permissions, // List
		});
		
		if (includeSecrets) {
			output.password = this._data.password; // String or NULL
		}
		
		return output;
	}
	
	/*
	 * Password
	 * Used to identify this user when logging in
	 */
	
	validatePassword(password) {
		let valid = (this._data.password === null);
		if ((!valid) && (typeof password === 'string')) {
			valid = (this._data.password === shacrypt.sha512crypt(password, this._data.password));
		}
		return valid;
	}
	
	setPassword(password) {
		if (typeof password === 'string') {
			const salt = '$6$' + crypto.randomBytes(64).toString('base64');
			this._data.password = shacrypt.sha512crypt(password, salt);
		} else if (password === null) {
			this._data.password = null;
		} else {
			throw 'Expected the password to be a string or NULL';
		}
	}
	
	setPasswordHash(passwordHash) {
		if (typeof passwordHash === 'string') {
			this._data.password = passwordHash;
		} else if (passwordHash === null) {
			this._data.password = null;
		} else {
			throw 'Expected the password hash to be a string or NULL';
		}
	}
}

module.exports = User;
