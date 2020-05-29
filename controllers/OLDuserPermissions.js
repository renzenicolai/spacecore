'use strict';

const UserPermission = require("../models/userPermission.js");

class UserPermissions {
	constructor(database) {
		this._database = database;
	}
	
	/* Permissions */
	
	async getPermissions(userAccountIdentifier) {
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
}

module.exports = UserPermissions;
