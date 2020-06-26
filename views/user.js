'use strict';

const shacrypt = require('shacrypt');
const crypto = require('crypto');
const mime = require('mime-types');
const chalk = require('chalk');

const User = require('../models/record/user.js');
const Session = require('../models/session.js');
const UserController = require('../controllers/user.js');
const FileController = require('../controllers/file.js');

class UserView {
	constructor(database) {
		this._database          = database;
		this._controller        = new UserController(database);
		this._fileController    = new FileController(database);
		
		this.errors = {
			session:         new Error('Invalid session'),
			session_user:    new Error('There is no user associated with your session'),
			invalid:         new Error('Invalid username and password combination'),
			username_in_use: new Error('The chosen username is already in use'),
			notfound:        new Error('User not found')
		};
	}
	
	/* Methods for using a user with a session */

	async authenticate(session, params) {
		if (!(session instanceof Session)) {
			throw this.errors.session;
		}
		if (typeof params.password === 'undefined') {
			// Set the optional password parameter to null if it has not been set by the user
			params.password = null;
		}
		
		// Fetch all enabled users with the username supplied by the user
		let users = await this._controller.findForAuthentication(params.username);
		
		// Try to authenticate using one of the returned user objects
		let authenticatedUser = null;
		for (let i = 0; i < users.length; i++) {
			let user = users[i];
			if (user.validatePassword(params.password)) {
				authenticatedUser = user;
				break;
			}
		}
		
		if (authenticatedUser === null) {
			throw this.errors.invalid; // Unable to authenticate using supplied username/password combination
		} else {
			session.setUser(authenticatedUser); // Set the sessions user to the authenticated user
			return authenticatedUser.serialize(); // Return the user object as the result
		}
	}
	
	async editCurrentUser(session, params) {
		if (!(session instanceof Session)) {
			throw this.errors.session;
		}
		let user = session.getUser();
		if (user === null) {
			throw this.errors.session_user;
		}
		
		if (typeof params.password === 'string') {
			user.setPassword(params.password);
		}
		if (typeof params.realname === 'string') {
			user.setRealname(params.realname);
		}
		if (typeof params.title    === 'string') {
			user.setTitle(params.title);
		}

		let transaction = await this._database.transaction('Edit current user '+user.getUsername());
		let result = await this._controller.put(user, transaction);
		await transaction.commit();
		return result;
	}
	
	/* Methods for managing users */
	
	async listUsers(session, params) {
		let query = {
			id: null,
			username: null,
			realname: null,
			title: null,
			enabled: null
		};
		
		if (typeof params === 'object' && params != null) {
			if (typeof params.id        === 'number')  query.id        = params.id;
			if (typeof params.username  === 'string')  query.username = params.username;
			if (typeof params.realname  === 'string')  query.realname = params.realname;
			if (typeof params.title     === 'string')  query.title     = params.title;
			if (typeof params.enabled   === 'boolean') query.enabled   = params.enabled;
		}
		
		let result = await this._controller.find(query.id, query.username, query.realname, query.title, query.enabled);
		
		for (let i = 0; i < result.length; i++) {
			result[i] = result[i].serialize(false);
		}
		
		return result;
	}
	
	async createUser(session, params) {
		let existingUsers = await this._controller.find(null, params.username);
		
		if (existingUsers.length > 0) {
			throw this.errors.username_in_use;
		}
		
		let user = new User();
		user.setUsername(params.username);
		
		if (typeof params.password === 'string') {
			user.setPassword(params.password);
		}
		
		if (typeof params.passwordHash === 'string') {
			user.setPasswordHash(params.passwordHash);
		}
		
		if (typeof params.username === 'string') {
			user.setUsername(params.username);
		}
		
		if (typeof params.realname === 'string') {
			user.setRealname(params.realname);
		}
		
		if (typeof params.title === 'string') {
			user.setTitle(params.title);
		}
		
		if (typeof params.enabled === 'boolean') {
			user.setEnabled(params.enabled);
		}
		
		if (Array.isArray(params.permissions)) {
			user.setPermissions(params.permissions);
		}
		
		let transaction = await this._database.transaction('Create user '+user.getUsername());
		let result = await this._controller.put(user, transaction);
		await transaction.commit();
		return result;
	}
	
	async editUser(session, params) {
		let users = await this._controller.find(params.id);
		
		if (users.length < 1) {
			throw this.error.notfound;
		}
		
		let user = users[0]; // The identifier is unique so we will get only one result
		
		if (typeof params.username === 'string') {
			let existingUsers = await this._controller.find(null, params.username);
			if (existingUsers.length > 0) {
				throw this.errors.username_in_use;
			}
			user.setUsername(params.username);
		}
		
		if (typeof params.password === 'string') {
			user.setPassword(params.password);
		}
		
		if (typeof params.passwordHash === 'string') {
			user.setPasswordHash(params.passwordHash);
		}
		
		if (typeof params.username === 'string') {
			user.setUsername(params.username);
		}
		
		if (typeof params.realname === 'string') {
			user.setRealname(params.realname);
		}
		
		if (typeof params.title === 'string') {
			user.setTitle(params.title);
		}
		
		if (typeof params.enabled === 'boolean') {
			user.setEnabled(params.enabled);
		}
		
		if (Array.isArray(params.permissions)) {
			user.setPermissions(params.permissions);
		}
		
		
		let transaction = await this._database.transaction('Edit user '+user.getUsername());
		let result = await this._controller.put(user, transaction);
		await transaction.commit();
		return result;
	}
	
	async removeUser(session, params) {
		if (!Array.isArray(params)) {
			// Convert input to array if supplied with only a single user identifier
			if (typeof params === 'object') {
				// Input is an object containing the key 'id'
				params = [params.id];
			} else {
				// Input is a number
				params = [params];
			}
		}
		
		let transaction = await this._database.transaction('Remove users '+params.toString());
		let promises = [];
		for (let i = 0; i < params.length; i++) {
			promises.push(this._controller.remove(params[i], transaction));
		}
		let results = await Promise.all(promises);
		await transaction.commit();
		if (results.length === 1) {
			// Convert output to number if supplied with only a single user identifier
			results = results[0];
		}
		return results;
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
						enabled: {
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
						passwordHash: {
							type: 'string'
						},
						realname: {
							type: 'string'
						},
						title: {
							type: 'string'
						},
						enabled: {
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
						passwordHash: {
							type: 'string'
						},
						realname: {
							type: 'string'
						},
						title: {
							type: 'string'
						},
						enabled: {
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
					type: 'number'
				},
				{
					type: 'array',
					contains: 'number'
				},
				{
					type: 'object',
					required: {
						id: {
							type: 'number'
						}
					}
				}
			]
		);
	}
}

module.exports = UserView;
