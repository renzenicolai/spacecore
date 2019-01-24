"use strict";

const uuidv4 = require('uuid/v4');

class Session {
	constructor(opts={}) {
		this._opts = Object.assign({
			alwaysAllow: []
		}, opts);
				
		this.id = uuidv4();
		this.user = null;
		this.dateCreated = Date();
		this.dateLastUsed = this.dateCreated;
	}
	
	use() {
		this.dateLastUsed = Date();
	}
	
	checkPermission(method) {
		return new Promise((resolve, reject) => {
			return resolve(this.checkPermissionSync(method));
		});
	}
	
	checkPermissionSync(method) {	
		if (typeof method !== 'string') return false;
		for (var i in this._opts.alwaysAllow) {
			if (this._opts.alwaysAllow[i].startsWith(method)) return true;
		}
		
		if ((this.user!==null) && (typeof this.user.permissions === 'object')) {
			for (i in this.user.permissions) {
				console.log("PERM", method, this.user.permissions[i], method.startsWith(this.user.permissions[i]));
				if (method.startsWith(this.user.permissions[i])) return true;
			}
			console.log("REJECT USER DOES NOT HAVE PERM");
		} else {
			console.log("REJECT NOT LOGGED IN",this.user);
		}
		return false;
	}
	
	listPermissions() {
		return new Promise((resolve, reject) => {
			console.log("listPermissions");
			var permissions = [];
			if (this.user !== null) permissions = this.user.permissions;
			return resolve(permissions);
		});
	}
}

class Sessions {
	constructor(opts={}) {
		this._opts = Object.assign({
			
		}, opts);
				
		this.sessions = [];
		
		this.alwaysAllow = [];
	}
	
	addAlwaysAllow(method) {
		if (this.alwaysAllow.indexOf(method) > -1) return;
		this.alwaysAllow.push(method);
	}
	
	checkAlwaysAllow(method) {
		if (this.alwaysAllow.indexOf(method) > -1) return true;
		return false;
	}
	
	createSession(session, params) {
		return new Promise((resolve, reject) => {
			var session = new Session({"alwaysAllow":this.alwaysAllow});
			this.sessions.push(session);
			return resolve(session.id);
		});
	}
	
	destroySession(session, params) {
		return new Promise((resolve, reject) => {
			if (params.length != 1) reject('invalid params');
			for (var i in this.sessions) {
				if (this.sessions[i].id == params[0]) {
					this.sessions.splice(i,1);
					return resolve(true);
				}
			}
			return reject('not found');
		});
	}
	
	destroyCurrentSession(session, params) {
		return new Promise((resolve, reject) => {
			for (var i in this.sessions) {
				if (this.sessions[i] === session) {
					this.sessions.splice(i,1);
					return resolve(true);
				}
			}
			return reject('session not found');
		});
	}
	
	checkPermission(session, params) {
		return new Promise((resolve, reject) => {
			if (params.length !== 2) reject('invalid params');
			for (var i in this.sessions) {
				if (this.sessions[i].id == params[0]) {
					this.sessions[i].use();
					return this.sessions[i].checkPermission(params[1]);
				}
			}
			return reject('not found');
		});
	}

	listPermissions(params) {
		return new Promise((resolve, reject) => {
			if (params.length !== 1) reject('invalid params');
			for (var i in this.sessions) {
				if (this.sessions[i].id == params[0]) {
					this.sessions[i].use();
					return this.sessions[i].listPermissions();
				}
			}
			return reject('not found');
		});
	}
		
	listSessions(params) {
		return new Promise((resolve, reject) => {
			if (params.length !== 0) reject('invalid params');
			var sessionIds = [];
			for (var i in this.sessions) {
				sessionIds.push(this.sessions[i].id);
			}
			return resolve(sessionIds);
		});
	}
	
	listPermissionsForCurrentSession(session, params) {
		//Lists permissions for the active session
		return new Promise((resolve, reject) => {
			if (session === null) return reject("no active session");
			return this.session.listPermissions();
		});
	}
	
	state(session, params) {
		console.log("!! state");
		return new Promise((resolve, reject) => {
			if (session === null) return reject("no active session");
			console.log("!! state promise", session);
			return session.listPermissions().then( (permissions) => {
				console.log("!! state permissions", permissions);
				return resolve({
					user: session.user,
					permissions: permissions
				});
			});
		});
	}
	
	/*checkPermissionSync(token, method) {
		for (var i in this.sessions) {
			if (this.sessions[i].id == token) {
				this.sessions[i].use();
				return this.sessions[i].checkPermissionSync(method);
			}
		}
		return false;
	}*/
	
	
	getSession(token) {
		for (var i in this.sessions) {
			if (this.sessions[i].id===token) {
				return this.sessions[i];
			}
		}
		return null;
	}
	
	registerRpcMethods(rpc, prefix="session") {
		if (prefix!=="") prefix = prefix + "/";
		rpc.addMethod(prefix+"create", this.createSession.bind(this));
		rpc.addMethod(prefix+"state", this.state.bind(this));
		rpc.addMethod(prefix+"permissions", this.listPermissionsForCurrentSession.bind(this));
		rpc.addMethod(prefix+"destroy", this.destroyCurrentSession.bind(this));
		rpc.addMethod(prefix+"management/destroy", this.destroySession.bind(this));
		rpc.addMethod(prefix+"management/list", this.listSessions.bind(this));
		rpc.addMethod(prefix+"management/permissions", this.listPermissions.bind(this));
	}
}

module.exports = Sessions;
