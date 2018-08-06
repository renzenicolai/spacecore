"use strict";

const crypt = require('crypt3/sync');

class Users {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table_users: 'users',
			table_permissions: 'user_permissions'
		}, opts);
						
		if (this._opts.database === null) {
			print("The users module can not be started without a database!");
			process.exit(1);
		}
		
		this._table = this._opts.database.table(this._opts.table_users);
		this._tablePermissions = this._opts.database.table(this._opts.table_permissions);
		
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
			return this._table.selectRecords({'username':params.username, "active":1}).then((records) => {
				for (var i in records) {
					records[i].print();
					var hash = records[i].getField('password');
					if (crypt(params.password, hash) === hash) {
						console.log("PASS CORRECT");
						return this._getPermissions(records[i].getIndex()).then((permissions) => {
							console.log("USER PERMS ADDED TO SESSION");
							session.user = {
								id: records[i].getIndex(),
								username: records[i].getField('username'),
								permissions: permissions
							};
							return resolve('ok');
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
	
	list(params) {
		return new Promise((resolve, reject) => {
			return this._table.selectRecords().then((records) => {
				var result = {};
				for (var i = 0; i<records.length; i++) {
					result[records[i].getIndex()] = {
						username: records[i].getField('username'),
						active: records[i].getField('active')
					};
				}
				return resolve(result);
			});
		});
	}
	
	find(params) {
		return new Promise((resolve, reject) => {
			if(params.length != 1) return reject("invalid parameter count");
			return this._table.selectRecords({"username":params[0]}).then((records) => {
				var result = {};
				for (var i = 0; i<records.length; i++) {
					result[records[i].getIndex()] = {
						username: records[i].getField('username'),
						active: records[i].getField('active')
					};
				}
				return resolve(result);
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
	
	add(params) {
		return new Promise((resolve, reject) => {
			if (typeof params !== 'object') return reject("Invalid params (1)");
			if (typeof params.username !== 'string') return reject("Invalid params (2)");
			if (typeof params.password !== 'string') return reject("Invalid params (3)");
						   
			this.find([params.username]).then((existingUsers) => {
				if (existingUsers.length>0) {
					return reject("A user with the username '"+params.username+"' exists already");
				} else {
					var record = this._table.createRecord();
					record.setField('username', params.username);
					record.setField('password', crypt(params.password, crypt.createSalt('sha512')));
					record.setField('active', 1);
					resolve(record.flush());
				}
			});
		});
	}
	
	changeUsername(params) {
			if (typeof params !== 'object') return reject("Invalid params (1)");
			if (typeof params.id !== 'string') return reject("Invalid params (2)");
			if (typeof params.username !== 'string') return reject("Invalid params (3)");
			return this.find([params.username]).then( (existingUsers) => {
				if (existingUsers.length > 0) {
					return reject("A user with the username '"+params.username+"' exists already");
				}
				return this._getUserRecord(id).then( (user) => {
					user.setField('username', params.username);
					resolve(user.flush());
				});
			});
	}
	
	changePassword(params) {
			if (typeof params !== 'object') return reject("Invalid params (1)");
			if (typeof params.id !== 'string') return reject("Invalid params (2)");
			if (typeof params.password !== 'string') return reject("Invalid params (3)");
			return this._getUserRecord(id).then( (user) => {
				user.setField('password', crypt(params.password, crypt.createSalt('sha512')));
				resolve(user.flush());
			});
	}
	
	changeMyUsername(session, params) {
		if (typeof params !== 'object') return reject("Invalid params (1)");
		if (typeof params.username !== 'string') return reject("Invalid params (2)");
		if (typeof session.user.id !== 'number')  return reject("There is no user associated with your session");
		return this.changeUsername({id: session.user.id, username: params.username});
	}
	
	changeMyPassword(session, params) {
		if (typeof params !== 'object') return reject("Invalid params (1)");
		if (typeof params.password !== 'string') return reject("Invalid params (2)");
		if (typeof session.user.id !== 'number')  return reject("There is no user associated with your session");
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
