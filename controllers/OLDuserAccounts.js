'use strict';

const UserAccount    = require("../models/userAccount.js");
const UserPermission = require("../models/userPermission.js");

class UserAccounts {
	constructor(database) {
		this._database = database;
	}
	
	/* Permissions (temporary) */
	
	async _getUserPermissions(userAccountIdentifier) {
		let [rows, fields] = await this._database.executeQuery(
			"SELECT * FROM user_permissions WHERE `user_id` = ?;",
			[ userAccountIdentifier ]
		);
		let result = [];
		for (let i = 0; i < rows.length; i++) {
			result.push(new UserPermission(this._database, rows[i]));
		}
		return result;
	}
	
	/* Accounts */
	async getUserAccount(userAccountIdentifier) {
		let [rows, fields] = await this._database.executeQuery(
			"SELECT * FROM users WHERE `id` = ?;",
			[ userAccountIdentifier ]
		);
		let result = null;
		if (rows.length === 1) {
			result = new UserAccount(this._database, rows[0]);
		}
		return result;
	}
	
	async findUserAccount(query) {
		if (typeof query !== 'object') {
			throw "Expected query to be an object";
		}
		throw "Not implemented";
	}
	
	async findUserAccountsByUsername(userName, active=null) {
		
		if (typeof active === 'boolean') {
			var query = "SELECT * FROM users WHERE `user_name` = ? AND `active` = ?;";
			var params = [userName, active];
		} else {
			var query = "SELECT * FROM users WHERE `user_name` = ?;";
			var params = [userName];
		}
		
		
		let [rows, fields] = await this._database.executeQuery(query, params);
		let result = [];
		for (let i = 0; i < rows.length; i++) {
			result.push(new UserAccount(this._database, rows[i]));
		}
		return result;
	}
}

module.exports = UserAccounts;
