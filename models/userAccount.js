'use strict';

const shacrypt = require('shacrypt');
const crypto = require('crypto');
const GenericRecord = require('./genericRecord.js');
const ImageFile = require('./imageFile.js');

class UserAccount extends GenericRecord {
	/*
	 * A user account contains properties identifying the user as well as a list of
	 * granted permissions that tell the RPC module which methods the connected
	 * client is allowed to use.
	 */
	
	constructor() {
		super();
		this._username = null;
		this._title = null;
		this._avatar = null;
		this._permissions = [];
	}
	
	serialize(includeSecrets=false) {
		let avatar = null;
		if (this._avatar !== null) {
			avatar = this._avatar.serialize(includeSecrets);
		}
		let data = Object.assign(super.serialize(includeSecrets), {
			username: this._username, // String
			title: this._title, // String
			avatar: avatar, // Object
			permissions: this._permissions, // List
		});
		
		if (includeSecrets) {
			data.password = this.password; // String or NULL
		}
		
		return data;
	}
	
	deserialize(data) {
		super.deserialize(data);
		// FIXME
	}
	
	/* 
	 * Username
	 * Used to identify this user when logging in
	 */
	
	getUsername() {
		return this._username;
	}
	
	setUsername(username) {
		if (typeof username === 'string') {
			if (username !== this._username) {
				this.setDirty(true);
				this._username = username;
			}
		} else {
			throw "Expected the username to be a string";
		}
	}
	
	/*
	 * Password
	 * Used to identify this user when logging in
	 */
	
	validatePassword(password) {
		let valid = false;
		if (typeof password === 'string') {
			if (typeof this._password === 'string') {
				valid = (this._password === shacrypt.sha512crypt(password, this._password));
			}
		} else if (password === null) {
			valid = (this._password === null);
		} else {
			throw "Expected the password to be a string or NULL";
		}
		return valid;
	}
	
	setPassword(password) {
		if (typeof password === 'string') {
			const salt = '$6$' + crypto.randomBytes(64).toString('base64');
			this._password = shacrypt.sha512crypt(password, salt);
		} else if (password === null) {
			this._password = null;
		} else {
			throw "Expected the bassword to be a string or NULL";
		}
	}
	
	/*
	 * Title
	 * A short sentence describing the role of this user
	 */
	
	getTitle() {
		return this._title;
	}
	
	setTitle(title) {
		if (typeof title === 'string') {
			if (title !== this._title) {
				this.setDirty(true);
				this._title = title;
			}
		} else {
			throw "Expected the title to be a string";
		}
	}
	
	/*
	 * Avatar
	 * A picture representing this user
	 */
	
	getAvatar() {
		return this._avatar;
	}
	
	setAvatar(avatar) {
		if (avatar === null || avatar instanceof ImageFile) {
			if (avatar !== this._avatar) {
				this.setDirty(true);
				this._avatar = avatar;
			}
		} else {
			throw 'Expected the avatar to be either an image file or null.';
		}
	}
	
	/* 
	 * Permissions
	 * A list of methods the user is allowed to use
	 */
	
	getPermissions() {
		return this._permissions;
	}
	
	hasPermission(method) {
		let result = false;
		for (let i = 0; i < this._permissions.length; i++) {
			if (this._permissions[i] === method) {
				result = true;
				break;
			}
		}
		return result;
	}
	
	addPermission(permission) {
		let result = false;
		if (typeof permission !== 'string') {
			throw "Expected the permission argument to be a string containing the method name to give access to";
		}
		if (this._permissions.indexOf(permission) < 0) {
			this.setDirty(true);
			this._permissions.push(permission);
			result = true;
		}
		return result;
	}
	
	removePermission() {
		let result = false;
		let index = this._permissions.indexOf(permission);
		if (index >= 0) {
			this.setDirty(true);
			this._permissions.splice(index, index);
		}
		return result;
	}
}

module.exports = UserAccount;
