"use strict";

const crypt = require('crypt3/sync');
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

		this._table             = this._opts.database.table(this._opts.table_users);
		this._tablePermissions  = this._opts.database.table(this._opts.table_permissions);

		if (this._table === null) {
			console.log("Users table not found.");
			process.exit(1);
		}

		if (this._tablePermissions === null) {
			console.log("User permissions table not found.");
			process.exit(1);
		}
		//console.log("table",this._table);
	}

	authenticate(session, params) {
		return new Promise((resolve, reject) => {
			if (typeof session !== 'object') return reject("Invalid session");
			if (typeof params !== 'object') return reject("Invalid params (1)");
			if (typeof params.username !== 'string') return reject("Invalid params (2)");
			if (typeof params.password !== 'string') return reject("Invalid params (3)");
			return this._table.selectRecords({'user_name':params.username, "active":1}).then((records) => {
				for (var i in records) {
					records[i].print();
					var hash = records[i].getField('password');
					if (crypt(params.password, hash) === hash) {
						//console.log("PASS CORRECT");
						return this._getPermissions(records[i].getIndex()).then((permissions) => {
							return this._getFile(records[i].getField('avatar_id')).then((file) => {
								//console.log("USER PERMS ADDED TO SESSION");

								console.log("FILES!!", file);

								var avatar = null;
								if (file !== null) {
									if (file.file !== null) {
										avatar = {
											data: file.file.toString('base64'),
											mime: mime.lookup(file.filename.split('.').pop())
										};
									}
								}

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
								return resolve(result);
							});
						});
					}
				}
				return reject("Invalid username / password combination");
			});
		});
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
				promises.push(this._getFile(result[i].avatar_id));
			}
			return Promise.all(promises).then((resultArray) => {
				for (var i in resultArray) {
					delete result[i].password;
					result[i].avatar = null;
					if (resultArray[i].file !== null) {
						result[i].avatar = {
							data: resultArray[i].file.toString('base64'),
							mime: mime.lookup(resultArray[i].filename.split('.').pop())
						};
					}
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
					promises.push(this._getFile(result[i].avatar_id));
				}
				return Promise.all(promises).then((resultArray) => {
					for (var i in resultArray) {
						result[i].avatar = null;
						if (resultArray[i].file !== null) {
							result[i].avatar = {
								data: resultArray[i].file.toString('base64'),
								mime: mime.lookup(resultArray[i].filename.split('.').pop())
							};
						}
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
			return this.find([params.username]).then((existingUsers) => {
				if (existingUsers.length>0) {
					console.log("USER EXISTS");
					return reject("A user with the username '"+params.username+"' exists already");
				} else {
					console.log("CREATING USER");
					var record = this._table.createRecord();
					record.setField('user_name', params.username);
					record.setField('password', crypt(params.password, crypt.createSalt('sha512')));
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
					Promise.resolve(user.flush());
				});
			});
	}

	changePassword(session, params) {
			if (typeof params !== 'object') return Promise.reject("Invalid params (1)");
			if (typeof params.id !== 'number') return Promise.reject("Invalid params (2)");
			if (typeof params.password !== 'string') return Promise.reject("Invalid params (3)");
			return this._getUserRecord(params.id).then( (user) => {
				user.setField('password', crypt(params.password, crypt.createSalt('sha512')));
				Promise.resolve(user.flush());
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

	_getFile(id) {
		if (this._opts.files === null) {
			return new Promise((resolve, reject) => {
				return resolve(null);
			});
		}
		return this._opts.files.getFile(id);
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
