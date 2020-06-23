'use strict';

const shacrypt = require('shacrypt');
const crypto = require('crypto');
const mime = require('mime-types');
const chalk = require('chalk');

const UserController = require('../controllers/user.js');
const FileController = require('../controllers/file.js');

class Users {
	constructor(database) {
		this._table             = database.table('users');
		this._tablePermissions  = database.table('user_permissions');
		this._fileController    = new FileController(database);
		
		this.errors = {
			session:         'Invalid session',
			session_user:    'There is no user associated with your session',
			invalid:         'Invalid username and password combination',
			username_in_use: 'The chosen username is already in use',
			notfound:        'User not found'
		};
	}
	
	_hash(password) {
		const salt = '$6$' + crypto.randomBytes(64).toString('base64');
		return shacrypt.sha512crypt(password, salt);
	}

	_validate(enteredPassword, savedPassword) {
		return savedPassword === shacrypt.sha512crypt(enteredPassword, savedPassword);
	}
	
	async _getPermissions(id) {
		var records = await this._tablePermissions.selectRecords({user: id});
		var result = [];
		for (var i = 0; i<records.length; i++) {
			result.push(records[i].getField('endpoint'));
		}
		return result;
	}
	
	async _getUserRecord(id) {
		var records = await this._table.selectRecords({'id':id});
		if (records.length!==1) {
			throw 'User not found';
		}
		return records[0];
	}
	
	/* Methods for using a user with a session */

	async authenticate(session, params) {
		if (typeof session !== 'object') {
			throw this.errors.session;
		}
		
		var records = await this._table.selectRecords({
			'username': params.username,
			'active': 1
		});
		
		for (var i in records) {
			var hash = records[i].getField('password');
			if (
				((hash === null) && (typeof params.password === 'undefined')) ||
				((typeof hash === 'string') && (this._validate(params.password, hash)))
			) {
				var permissions = await this._getPermissions(records[i].getIndex());
				var avatar = await this._fileController.getAsBase64(records[i].getField('picture'));
				session.setUser({
					id: records[i].getIndex(),
					username: records[i].getField('username'),
					realname: records[i].getField('realname'),
					title: records[i].getField('title'),
					avatar: avatar,
					permissions: permissions
				});
				var result = {
					username: records[i].getField('username'),
					realname: records[i].getField('realname'),
					title: records[i].getField('title'),
					avatar: avatar,
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
		if (typeof params.password === 'string') internalParams.password = params.password;
		if (typeof params.realname === 'string') internalParams.realname = params.realname;
		if (typeof params.title    === 'string') internalParams.title    = params.title;
		return this.editUser(session, internalParams);
	}
	
	/* Methods for managing users */

	async listUsers(session, params) {
		let query = {};
		
		if (typeof params === 'object' && params != null) {
			if (typeof params.id        === 'number')  query.id        = params.id;
			if (typeof params.username  === 'string')  query.username = params.username;
			if (typeof params.realname  === 'string')  query.realname = params.realname;
			if (typeof params.title     === 'string')  query.title     = params.title;
			if (typeof params.active    === 'boolean') query.active    = params.active;
		}
		
		// Query users based on the assembled query
		let result = await this._table.list(query);
		
		for (let i in result) {
			delete result[i].password; // Remove password column from the result
			result[i].active = Boolean(result[i].active); // Convert the active column into a boolean
		}
		
		// Avatar image
		let avatarPromises = [];
		for (let i in result) {
			avatarPromises.push(this._fileController.getAsBase64(result[i].picture));
		}
				
		let avatarResult = await Promise.all(avatarPromises);
		for (let i in avatarResult) {
			result[i].avatar = avatarResult[i];
		}
		
		// Permissions
		let permissionPromises = [];
		for (let i in result) {
			permissionPromises.push(this._getPermissions(result[i].id));
		}
		let permissionResult = await Promise.all(permissionPromises);
		for (let i in permissionResult) {
			result[i].permissions = permissionResult[i];
		}
		
		return result;
	}
	
	async createUser(session, params) {
		if (typeof params.password    !== 'string')  params.password    = '';
		if (typeof params.name        !== 'string')  params.name        = '';
		if (typeof params.title       !== 'string')  params.title       = '';
		if (typeof params.active      !== 'boolean') params.active      = false;
		if (typeof params.permissions !== 'object')  params.permissions = [];
		
		let existingUsers = await this.listUsers(session, {username: params.username});
		if (existingUsers.length>0) {
			throw 'A user with the username \''+params.username+'\' exists already';
		}
		
		let dbTransaction = await this._opts.database.transaction('create user '+params.username);
		
		let record = this._table.createRecord();
		record.setField('username', params.username);
		
		if (params.password === '') {
			record.setField('password', null);
		} else {
			record.setField('password', this._hash(params.password));
		}

		record.setField('realname', params.name);
		record.setField('title', params.title);
		record.setField('active', params.active ? 1 : 0);
		var id = await record.flush(dbTransaction);
		
		var permissionPromises = [];
		for (let i = 0; i < params.permissions.length; i++) {
			let permissionRecord = this._tablePermissions.createRecord();
			permissionRecord.setField('user', id);
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
		let dbTransaction = await this._opts.database.transaction('edit user '+params.username);
		
		if (typeof params.username === 'string') {
			let existingUsers = await this.listUsers(session, {username: params.username});
			if (existingUsers.length > 0) {
				throw this.error.username_in_use;
			}
			record.setField('username', params.username);
		}
		
		if (typeof params.password === 'string') {
			if (params.password === '') {
				record.setField('password', null);
			} else {
				record.setField('password', this._hash(params.password));
			}
		}
		
		if (typeof params.realname === 'string') {
			record.setField('realname', params.realname);
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
			
			let currentPermissionRecords = await this._tablePermissions.selectRecords({user: id});
			for (let i in currentPermissionRecords) {
				if (!params.permissions.includes(currentPermissionRecords[i].getField('endpoint'))) {
					permissionPromises.push(currentPermissionRecords[i].destroy(dbTransaction));
				} else {
					currentPermissions.push(currentPermissionRecords[i].getField('endpoint'));
				}
			}
			
			for (let i in params.permissions) {
				let endpoint = params.permissions[i];
				if (!currentPermissions.includes(endpoint)) {
					let permissionRecord = this._tablePermissions.createRecord();
					permissionRecord.setField('user', id);
					permissionRecord.setField('endpoint', endpoint);
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
		
		let id = params;
		if (typeof params !== 'number') {
			id = params.id;
		}
		
		let record = await this._getUserRecord(id);
		
		if (record === null) {
			throw this.error.notfound;
		}
		
		let dbTransaction = await this._opts.database.transaction('remove user '+record.getField('username'));
		
		let permissionRecords = await this._tablePermissions.selectRecords({user: id});
		
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

	registerRpcMethods(rpc, prefix='user') {
		if (prefix!=='') prefix = prefix + '/';

		/* Methods for using a user with a session */
		
		rpc.addMethod(
			prefix+'authenticate',
			this.authenticate.bind(this),
			[
				{
					type: 'object',
					required: {
						username: {
							type: 'string'
						}
					},
					optional: {
						password: {
							type: 'string'
						}
					}
				}
			]
		);
		
		rpc.addMethod(
			prefix+'me/edit',
			this.editCurrentUser.bind(this),
			[
				{
					type: 'object',
					optional: {
						password: {
							type: 'string'
						},
						realname: {
							type: 'string'
						},
						title: {
							type: 'string'
						}
					}
				}
			]
		);
		
		/* Methods for managing users */

		rpc.addMethod(
			prefix+'list',
			this.listUsers.bind(this),
			[
				{ // Calling without parameters: lists all users on the system
					type: 'none'
				},
				{ // Calling with parameters: search for exact match to one of the following fields
					type: 'object',
					optional: {
						id: {
							type: 'number'
						},
						username: {
							type: 'string'
						},
						realname: {
							type: 'string'
						},
						title: {
							type: 'string'
						},
						active: {
							type: 'boolean'
						}
					}
				}
			]
		);

		rpc.addMethod(
			prefix+'create',
			this.createUser.bind(this),
			[
				{ // Create a new user
					type: 'object',
					required: {
						username: {
							type: 'string'
						}
					},
					optional: {
						password: {
							type: 'string'
						},
						realname: {
							type: 'string'
						},
						title: {
							type: 'string'
						},
						active: {
							type: 'boolean'
						},
						permissions: {
							type: 'array',
							contains: 'string'
						}
					}
				}
			]
		);
		
		rpc.addMethod(
			prefix+'edit',
			this.editUser.bind(this),
			[
				{
					type: 'object',
					required: {
						id: {
							type: 'number'
						}
					},
					optional: {
						username: {
							type: 'string'
						},
						password: {
							type: 'string'
						},
						realname: {
							type: 'string'
						},
						title: {
							type: 'string'
						},
						active: {
							type: 'boolean'
						},
						permissions: {
							type: 'array',
							contains: 'string'
						}
					}
				}
			]
		);
		
		rpc.addMethod(
			prefix+'remove',
			this.removeUser.bind(this),
			[
				{
					type: 'object',
					required: {
						id: {
							type: 'number'
						}
					}
				},
				{
					type: 'number'
				}
			]
		);
	}
}

module.exports = Users;
