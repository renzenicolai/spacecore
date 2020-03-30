"use strict";

const shacrypt = require('shacrypt');
const crypto   = require('crypto');
const mime     = require('mime-types');
const chalk    = require('chalk');

class Users {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table_users: 'users',
			table_permissions: 'user_permissions',
			files: null
		}, opts);

		if (this._opts.database === null) {
			throw "The users module can not be started without a database!";
		}

		this._table = this._opts.database.table(this._opts.table_users, {
			columns: {
				id: false,
				user_name: true,
				full_name: false,
				title: false,
				password: true,
				active: false,
				avatar_id: true
			},
			index: "id"
		});
		this._tablePermissions  = this._opts.database.table(this._opts.table_permissions, {
			columns: {
				id: false,
				user_id: true,
				endpoint: true
			},
			index: "id"
		});

		if (this._table === null) {
			throw "Users table not found";
		}

		if (this._tablePermissions === null) {
			throw "User permissions table not found";
		}
		
		this.errors = {
			session:         "Invalid session",
			session_user:    "There is no user associated with your session",
			invalid:         "Invalid username and password combination",
			username_in_use: "The chosen username is already in use",
			notfound:        "User not found"
		}
	}
	
	_hash(password) {
		const salt = '$6$' + crypto.randomBytes(64).toString('base64');
		return shacrypt.sha512crypt(password, salt);
	}

	_validate(enteredPassword, savedPassword) {
		return savedPassword === shacrypt.sha512crypt(enteredPassword, savedPassword);
	}
	
	async _getPermissions(id) {
		var records = await this._tablePermissions.selectRecords({'user_id': id});
		var result = [];
		for (var i = 0; i<records.length; i++) {
			result.push(records[i].getField('endpoint'));
		}
		return result;
	}
	
	async _getUserRecord(id) {
		var records = await this._table.selectRecords({"id":id});
		if (records.length!==1) {
			throw "User not found";
		}
		return records[0];
	}
	
	/* Methods for using a user with a session */

	async authenticate(session, params) {
		if (typeof session !== 'object') {
			throw this.errors.session;
		}
		
		var records = await this._table.selectRecords({
			'user_name': params.user_name,
			"active": 1
		});
		
		for (var i in records) {
			var hash = records[i].getField('password');
			if (
				((hash === null) && (typeof params.password === 'undefined')) ||
				((typeof hash === 'string') && (this._validate(params.password, hash)))
			) {
				var permissions = await this._getPermissions(records[i].getIndex());
				var avatar = await this._opts.files.getFileAsBase64(records[i].getField('avatar_id'));
				session.user = {
					id: records[i].getIndex(),
					user_name: records[i].getField('user_name'),
					full_name: records[i].getField('full_name'),
					title: records[i].getField('title'),
					avatar: avatar,
					permissions: permissions
				};
				var result = {
					user_name: records[i].getField('user_name'),
					full_name: records[i].getField('full_name'),
					title: records[i].getField('title'),
					permissions: permissions
				};
				return result;
			}
		}
		
		throw this.errors.invalid;
	}
	
	async editCurrentUser(session, params) {
		if (typeof session !== 'object')         throw this.errors.session;
		if (typeof session.user.id !== 'number') throw this.errors.session_user;
		
		var internalParams = { id: session.user.id };
		if (typeof params.password === "string") internalParams.password = params.password;
		if (typeof params.full_name === "string") internalParams.full_name = params.full_name;
		if (typeof params.title    === "string") internalParams.title    = params.title;
		return this.editUser(session, internalParams);
	}
	
	/* Methods for managing users */

	async listUsers(session, params) {
		var query = {};
		
		if (typeof params === "object" && params != null) {
			if (typeof params.id       === "numer")    query.id        = params.id;
			if (typeof params.user_name === "string")  query.user_name = params.user_name;
			if (typeof params.full_name === "string")  query.full_name = params.full_name;
			if (typeof params.title    === "string")   query.title     = params.title;
			if (typeof params.active   === "boolean")  query.active    = params.active;
		}
		
		// Query users based on the assembled query
		var result = await this._table.list(query);
		
		for (var i in result) {
			delete result[i].password; // Remove password column from the result
			result[i].active = Boolean(result[i].active); // Convert the active column into a boolean
		}
		
		// Avatar image
		var avatarPromises = [];
		for (var i in result) {
			avatarPromises.push(this._opts.files.getFileAsBase64(result[i].avatar_id));
		}
		var avatarResult = await Promise.all(avatarPromises);
		for (var i in avatarResult) {
			result[i].avatar = avatarResult[i];
		}
		
		// Permissions
		var permissionPromises = [];
		for (var i in result) {
			permissionPromises.push(this._getPermissions(result[i].id));
		}
		var permissionResult = await Promise.all(permissionPromises);
		for (var i in permissionResult) {
			result[i].permissions = permissionResult[i];
		}
		
		return result;
	}
	
	async createUser(session, params) {
		if (typeof params.password    !== 'string')  params.password    = "";
		if (typeof params.name        !== 'string')  params.name        = "";
		if (typeof params.title       !== 'string')  params.title       = "";
		if (typeof params.active      !== 'boolean') params.active      = false;
		if (typeof params.permissions !== 'object')  params.permissions = [];
		
		let existingUsers = await this.listUsers(session, {user_name: params.user_name});
		if (existingUsers.length>0) {
			throw "A user with the username '"+params.user_name+"' exists already";
		}
		
		let dbTransaction = await this._opts.database.transaction("create user "+params.user_name);
		
		let record = this._table.createRecord();
		record.setField('user_name', params.user_name);
		
		if (params.password === "") {
			record.setField('password', null);
		} else {
			record.setField('password', this._hash(params.password));
		}

		record.setField('full_name', params.name);
		record.setField('title', params.title);
		record.setField('active', params.active ? 1 : 0);
		var id = await record.flush(dbTransaction);
		
		var permissionPromises = [];
		for (let i = 0; i < params.permissions.length; i++) {
			let permissionRecord = this._tablePermissions.createRecord();
			permissionRecord.setField('user_id', id);
			permissionRecord.setField('endpoint', params.permissions[i]);
			permissionPromises.push(permissionRecord.flush(dbTransaction));
		}
		
		await Promise.all(permissionPromises);
		await dbTransaction.commit();
		return id;
	}
	
	async editUser(session, params) {
		let record = await this._getUserRecord(params.id);
		
		if (record === null) {
			throw this.error.notfound;
		}
		
		let id = record.getIndex();
		let dbTransaction = await this._opts.database.transaction("edit user "+params.user_name);
		
		if (typeof params.user_name === 'string') {
			let existingUsers = await this.listUsers(session, {user_name: params.user_name});
			if (existingUsers.length > 0) {
				throw this.error.username_in_use;
			}
			record.setField('user_name', params.user_name);
		}
		
		if (typeof params.password === 'string') {
			if (params.password === "") {
				record.setField('password', null);
			} else {
				record.setField('password', this._hash(params.password));
			}
		}
		
		if (typeof params.full_name === 'string') {
			record.setField('full_name', params.full_name);
		}
		
		if (typeof params.title === 'string') {
			record.setField('title', params.title);
		}
		
		if (typeof params.active === 'boolean') {
			record.setField('active', params.active ? 1 : 0);
		}
		
		if (typeof params.permissions === 'object') {
			let permissionPromises = [];
			let currentPermissions = [];
			
			let currentPermissionRecords = await this._tablePermissions.selectRecords({user_id: id});
			for (let i in currentPermissionRecords) {
				if (!params.permissions.includes(currentPermissionRecords[i].getField("endpoint"))) {
					permissionPromises.push(currentPermissionRecords[i].destroy(dbTransaction));
				} else {
					currentPermissions.push(currentPermissionRecords[i].getField("endpoint"));
				}
			}
			
			for (let i in params.permissions) {
				let endpoint = params.permissions[i];
				if (!currentPermissions.includes(endpoint)) {
					let permissionRecord = this._tablePermissions.createRecord();
					permissionRecord.setField("user_id", id);
					permissionRecord.setField("endpoint", endpoint);
					permissionPromises.push(permissionRecord.flush(dbTransaction));
				}
			}
			
			await Promise.all(permissionPromises);
		}
		
		await record.flush(dbTransaction);
		await dbTransaction.commit();
		return id;
	}
	
	async removeUser(session, params) {
		
		if (typeof params === "number") {
			var id = params;
		} else {
			var id = params.id;
		}
		
		let record = await this._getUserRecord(id);
		
		if (record === null) {
			throw this.error.notfound;
		}
		
		let dbTransaction = await this._opts.database.transaction("remove user "+record.getField("user_name"));
		
		let permissionRecords = await this._tablePermissions.selectRecords({user_id: id});
		
		let permissionPromises = [];
		for (let i = 0; i < permissionRecords.length; i++) {
			permissionPromises.push(permissionRecords[i].destroy(dbTransaction));
		}
		await Promise.all(permissionPromises);
		
		let result = await record.destroy(dbTransaction);
		await dbTransaction.commit();
		return result;
	}

	/* RPC API definitions */

	registerRpcMethods(rpc, prefix="user") {
		if (prefix!=="") prefix = prefix + "/";

		/* Methods for using a user with a session */
		
		rpc.addMethod(
			prefix+"authenticate",
			this.authenticate.bind(this),
			[
				{
					type: "object",
					required: {
						user_name: {
							type: "string"
						}
					},
					optional: {
						password: {
							type: "string"
						}
					}
				}
			]
		);
		
		rpc.addMethod(
			prefix+"me/edit",
			this.editCurrentUser.bind(this),
			[
				{
					type: "object",
					optional: {
						password: {
							type: "string"
						},
						full_name: {
							type: "string"
						},
						title: {
							type: "string"
						}
					}
				}
			]
		);
		
		/* Methods for managing users */

		rpc.addMethod(
			prefix+"list",
			this.listUsers.bind(this),
			[
				{ // Calling without parameters: lists all users on the system
					type: "none"
				},
				{ // Calling with parameters: search for exact match to one of the following fields
					type: "object",
					optional: {
						id: {
							type: "number"
						},
						user_name: {
							type: "string"
						},
						full_name: {
							type: "string"
						},
						title: {
							type: "string"
						},
						active: {
							type: "boolean"
						}
					}
				}
			]
		);

		rpc.addMethod(
			prefix+"create",
			this.createUser.bind(this),
			[
				{ // Create a new user
					type: "object",
					required: {
						user_name: {
							type: "string"
						}
					},
					optional: {
						password: {
							type: "string"
						},
						full_name: {
							type: "string"
						},
						title: {
							type: "string"
						},
						active: {
							type: "boolean"
						},
						permissions: {
							type: "array",
							contains: "string"
						}
					}
				}
			]
		);
		
		rpc.addMethod(
			prefix+"edit",
			this.editUser.bind(this),
			[
				{
					type: "object",
					required: {
						id: {
							type: "number"
						}
					},
					optional: {
						user_name: {
							type: "string"
						},
						password: {
							type: "string"
						},
						full_name: {
							type: "string"
						},
						title: {
							type: "string"
						},
						active: {
							type: "boolean"
						},
						permissions: {
							type: "array",
							contains: "string"
						}
					}
				}
			]
		);
		
		rpc.addMethod(
			prefix+"remove",
			this.removeUser.bind(this),
			[
				{
					type: "object",
					required: {
						id: {
							type: "number"
						}
					}
				},
				{
					type: "number"
				}
			]
		);
	}
}

module.exports = Users;
