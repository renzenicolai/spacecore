"use strict";

const shacrypt = require('shacrypt');
const crypto = require('crypto');
const mime  = require('mime-types');

class Users {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table_users: 'users',
			table_permissions: 'user_permissions',
			files: null
		}, opts);

		if (this._opts.database === null) {
			console.log("The users module can not be started without a database!");
			process.exit(1);
		}

		this._table             = this._opts.database.table(this._opts.table_users, {
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
			console.log("Users table not found.");
			process.exit(1);
		}

		if (this._tablePermissions === null) {
			console.log("User permissions table not found.");
			process.exit(1);
		}
	}
	
	_hash(password) {
		const salt = '$6$' + crypto.randomBytes(64).toString('base64');
		return shacrypt.sha512crypt(password, salt);
	}

	_validate(enteredPassword, savedPassword) {
		return savedPassword === shacrypt.sha512crypt(enteredPassword, savedPassword);
	}

	async authenticate(session, params) {
		if (typeof session !== 'object') throw "Invalid session";
		if (typeof params !== 'object') throw "Expected an object to be passed for parameters";
		if (typeof params.username !== 'string') throw "Missing username argument";
		if ((typeof params.password !== 'undefined') && (typeof params.password !== 'string')) throw "Expected password argument to be a string";
		
		var records = await this._table.selectRecords({'user_name':params.username, "active":1});
		
		for (var i in records) {
			var hash = records[i].getField('password');
			if (((hash === null) && (typeof params.password === 'undefined')) || ((typeof hash === 'string') && (this._validate(params.password, hash)))) {
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
		
		throw "Invalid username / password combination";
	}

	_getPermissions(id) {
		return new Promise((resolve, reject) => {
			return this._tablePermissions.selectRecords({'user_id':id}).then((records) => {
				var result = [];
				for (var i = 0; i<records.length; i++) {
					result.push(records[i].getField('endpoint'));
				}
				return resolve(result);
			});
		});
	}

	list(session, params) {
		return this._table.list(params).then((result) => {
			var promises = [];
			for (var i in result) {
				promises.push(this._opts.files.getFileAsBase64(result[i].avatar_id));
			}
			return Promise.all(promises).then((resultArray) => {
				for (var i in resultArray) {
					delete result[i].password;
					result[i].avatar = resultArray[i];
				}
				return Promise.resolve(result);
			});
		});
	}

	find(session, params) {
		return new Promise((resolve, reject) => {
			if(params.length != 1) return reject("invalid parameter count");
			return this._table.selectRecords({"user_name":params[0]}).then((records) => {
				var result = {};
				if (records.length < 1) return resolve([]);
				for (var i = 0; i<records.length; i++) {
					result[records[i].getIndex()] = records[i].getFields();
					delete result[records[i].getIndex()].password;
				}
				var promises = [];
				for (i in result) {
					promises.push(this._opts.files.getFileAsBase64(result[i].avatar_id));
				}
				return Promise.all(promises).then((resultArray) => {
					for (var i in resultArray) {
						result[i].avatar = resultArray[i];
					}
					return Promise.resolve(result);
				});
			});
		});
	}

	_getUserRecord(id) {
		return new Promise((resolve, reject) => {
			return this._table.selectRecords({"id":id}).then((records) => {
				if (records.length!==1) reject("Invalid user id");
				resolve(records[0]);
			});
		});
	}

	add(session, params) {
		return new Promise((resolve, reject) => {
			if (typeof params !== 'object') return reject("Invalid params (object)");
			if (typeof params.username !== 'string') return reject("Invalid params (username)");
			if (typeof params.password !== 'string') return reject("Invalid params (password)");
			if (typeof params.name !== 'string') return reject("Invalid params (name)");
			if (typeof params.title !== 'string') return reject("Invalid params (title)");
			console.log("PARAMS OK");
			return this.find(session, [params.username]).then((existingUsers) => {
				if (existingUsers.length>0) {
					console.log("USER EXISTS");
					return reject("A user with the username '"+params.username+"' exists already");
				} else {
					console.log("CREATING USER");
					var record = this._table.createRecord();
					record.setField('user_name', params.username);
					record.setField('password', this._hash(params.password));
					record.setField('full_name', params.name);
					record.setField('title', params.title);
					record.setField('active', 1);
					return resolve(record.flush());
				}
			});
		});
	}

	changeUsername(session, params) {
			if (typeof params !== 'object') return Promise.reject("Invalid params (1)");
			if (typeof params.id !== 'number') return Promise.reject("Invalid params (2)");
			if (typeof params.username !== 'string') return Promise.reject("Invalid params (3)");
			return this.find([params.username]).then( (existingUsers) => {
				if (existingUsers.length > 0) {
					return Promise.reject("A user with the username '"+params.username+"' exists already");
				}
				return this._getUserRecord(params.id).then( (user) => {
					user.setField('user_name', params.username);
					return user.flush();
				});
			});
	}

	changePassword(session, params) {
			if (typeof params !== 'object') return Promise.reject("Invalid params (1)");
			if (typeof params.id !== 'number') return Promise.reject("Invalid params (2)");
			if (typeof params.password !== 'string') return Promise.reject("Invalid params (3)");
			return this._getUserRecord(params.id).then( (user) => {
				user.setField('password', this._hash(params.password));
				return user.flush();
			});
	}

	changeMyUsername(session, params) {
		if (typeof params !== 'object') return Promise.reject("Invalid params (1)");
		if (typeof params.username !== 'string') return Promise.reject("Invalid params (2)");
		if (typeof session.user.id !== 'number')  return Promise.reject("There is no user associated with your session");
		return this.changeUsername({id: session.user.id, username: params.username});
	}

	changeMyPassword(session, params) {
		if (typeof params !== 'object') return Promise.reject("Invalid params (1)");
		if (typeof params.password !== 'string') return Promise.reject("Invalid params (2)");
		if (typeof session.user.id !== 'number')  return Promise.reject("There is no user associated with your session");
		this.changePassword({id: session.user.id, password: params.password});
	}

	registerRpcMethods(rpc, prefix="user") {
		if (prefix!=="") prefix = prefix + "/";

		rpc.addMethod(prefix+"authenticate", this.authenticate.bind(this));

		rpc.addMethod(prefix+"list", this.list.bind(this));
		rpc.addMethod(prefix+"find", this.find.bind(this));

		rpc.addMethod(prefix+"add", this.add.bind(this));
		rpc.addMethod(prefix+"change/username", this.changeUsername.bind(this));
		rpc.addMethod(prefix+"change/password", this.changePassword.bind(this));
		rpc.addMethod(prefix+"change/my/username", this.changeMyUsername.bind(this));
		rpc.addMethod(prefix+"change/my/password", this.changeMyPassword.bind(this));

		//rpc.addMethod(prefix+"remove", this.add.bind(this));
		//rpc.addMethod(prefix+"update", this.add.bind(this));
	}
}

module.exports = Users;
