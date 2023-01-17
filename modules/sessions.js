"use strict";

const crypto = require('crypto');
const chalk  = require('chalk');

class Session {
	constructor(opts={}) {
		this._opts = Object.assign({
			alwaysAllow: []
		}, opts);

		this.id = crypto.randomBytes(64).toString("base64");
		this.user = null;
		this.dateCreated = Math.floor((new Date()).getTime() / 1000);
		this.dateLastUsed = this.dateCreated;
		this.connection = null;
		this.subscriptions = [];
	}
	
	summary() {
		return {
			id: this.id,
			user: this.user,
			dateCreated: this.dateCreated,
			dateLastUsed: this.dateLastUsed,
			subscriptions: this.subscriptions
		};
	}

	use() {
		this.dateLastUsed = Math.floor((new Date()).getTime() / 1000);
	}

	async checkPermission(method) {
		return this.checkPermissionSync(method);
	}

	checkPermissionSync(method) {
		if (typeof method !== 'string') {
			return false;
		}
		
		for (var i in this._opts.alwaysAllow) {
			if (this._opts.alwaysAllow[i].startsWith(method)) {
				return true;
			}
		}

		if ((this.user !== null) && (typeof this.user.permissions === 'object')) {
			for (i in this.user.permissions) {
				if (method.startsWith(this.user.permissions[i])) {
					return true;
				}
			}
		}
		
		return false;
	}

	async listPermissions() {
		if (this.user !== null) {
			return this._opts.alwaysAllow.concat(this.user.permissions);
		} else {
			return this._opts.alwaysAllow;
		}
	}

	setConnection(connection) {
		this.connection = connection;
	}

	async push(subject, message) {
		if (this.connection === null) {
			console.log(chalk.white.bold.inverse(" SESSIONS ")+" Unable to push: connection unknown.");
			return false;
		}
		
		try {
			this.connection.send(JSON.stringify({
				pushMessage: true,
				subject: subject,
				message: message
			}));
			console.log(chalk.white.bold.inverse(" SESSIONS ")+" Push message ("+subject+") sent.");
			return true;
		} catch (error) {
			console.log(chalk.white.bold.inverse(" SESSIONS ")+" Sending push message ("+subject+") failed.", error);
		}
		return false;
	}

	async pushIfSubscribed(subject, message) {
		if (this.subscriptions.includes(subject)) {
			return await this.push(subject, message);
		}
		return false;
	}

	async subscribe(subject) {
		if (typeof subject !== 'string') return false;
		if (!this.subscriptions.includes(subject)) {
			this.subscriptions.push(subject);
		}
		return true;
	}

	async unsubscribe(subject) {
		this.subscriptions = this.subscriptions.filter(item => item !== subject);
		return true;
	}
}

class Sessions {
	constructor(opts={}) {
		this._opts = Object.assign({
			timeout: null
		}, opts);

		this.sessions = [];
		this.alwaysAllow = [];
		
		if (this._opts.timeout !== null) {
			setTimeout(this._gc.bind(this), 5000);
		}
	}
	
	/* Internal functions */
	
	_destroySession(id) {
		for (var i in this.sessions) {
			if (this.sessions[i].id === id) {
				this.sessions.splice(i,1);
				return true;
			}
		}
		return false;
	}
	
	_gc() {
		if (this._opts.timeout === null) {
			return;
		}
		
		var now = Math.floor((new Date()).getTime() / 1000);
		
		var sessionsToKeep = [];
		for (var i in this.sessions) {
			
			var id = this.sessions[i].id;
			var unusedSince = now-this.sessions[i].dateLastUsed;
			
			if (unusedSince < this._opts.timeout) {
				sessionsToKeep.push(this.sessions[i]);
			}/* else {
				console.log(chalk.bgGreen.white.bold(" SESSIONS ")+" session "+id+" has been destroyed due to it being stale");
			}*/
		}
		
		var oldAmount = this.sessions.length;
		var newAmount = sessionsToKeep.length;
		
		if (oldAmount != newAmount) {
			console.log(chalk.bgGreen.white.bold(" SESSIONS ")+" Cleaned up "+(oldAmount-newAmount)+" stale sessions");
		}
		
		this.sessions = sessionsToKeep;
		
		// Reschedule the garbage collector
		setTimeout(this._gc.bind(this), 5000);
	}
	
	/* System functions */

	addAlwaysAllow(method) {
		if (this.alwaysAllow.indexOf(method) > -1) return;
		this.alwaysAllow.push(method);
	}

	checkAlwaysAllow(method) {
		if (this.alwaysAllow.indexOf(method) > -1) return true;
		return false;
	}
	
	getAlwaysAllowed() {
		return this.alwaysAllow;
	}
	
	pushIfSubscribed(session, subject, message) {
		return session.pushIfSubscribed(subject, message);
	}

	push(session, subject, message) {
		return session.push(subject, message);
	}
	
	getSession(token) {
		for (var i in this.sessions) {
			if (this.sessions[i].id===token) {
				return this.sessions[i];
			}
		}
		return null;
	}

	getSessions() {
		return this.sessions;
	}
	
	/* RPC API functions: management of individual sessions */
	
	async createSession(session, params) {
		let newSession = new Session({
			"alwaysAllow": this.alwaysAllow
		});
		this.sessions.push(newSession);
		return newSession.id;
	}

	async destroyCurrentSession(session, params) {
		for (var i in this.sessions) {
			if (this.sessions[i] === session) {
				this.sessions.splice(i,1);
				return true;
			}
		}
		throw 'Session not found.';
	}
	
	async state(session, params) {
		if (session === null) throw "no active session";
		var permissions = await session.listPermissions();
			
		return {
			user: session.user,
			permissions: permissions
		};
	}
	
	async listPermissionsForCurrentSession(session, params) {
		//Lists permissions for the active session
		if (session === null) {
			throw "No active session.";
		}
		return this.session.listPermissions();
	}
	
	async subscribe(session, params) {
		if (session === null) throw "no active session";
		return await session.subscribe(params);
	}

	async unsubscribe(session, params) {
		if (session === null) throw "no active session";
		return await session.unsubscribe(params);
	}
	
	/* RPC API functions: administrative tasks */
	
	async listSessions(session, params) {
		var sessionList = [];
		for (var i in this.sessions) {
			sessionList.push(this.sessions[i].summary());
		}
		return sessionList;
	}

	async destroySession(session, params) {
		if (typeof params !== 'number') {
			throw "Invalid parameters, expected a number (id of session)";
		}
		
		var result = this._destroySession(params);
		if (!result) throw "Session not found";
		return true;
	}

	registerRpcMethods(rpc, prefix="session") {
		if (prefix!=="") prefix = prefix + "/";
		
		/* Create session method */
		rpc.addMethod(
			prefix+"create",
			this.createSession.bind(this),
			[
				{type: "none"}
			]
		);
		
		/* Destroy current session method */
		rpc.addMethod(
			prefix+"destroy",
			this.destroyCurrentSession.bind(this),
			[
				{type: "none"}
			]
		);
		
		/* Query current session state method */
		rpc.addMethod(
			prefix+"state",
			this.state.bind(this),
			[
				{type: "none"}
			]
		);
		
		
		rpc.addMethod(prefix+"permissions", this.listPermissionsForCurrentSession.bind(this));
		rpc.addMethod(prefix+"push/subscribe", this.subscribe.bind(this));
		rpc.addMethod(prefix+"push/unsubscribe", this.unsubscribe.bind(this));
		rpc.addMethod(prefix+"management/list", this.listSessions.bind(this));
		rpc.addMethod(prefix+"management/destroy", this.destroySession.bind(this));
	}
}

module.exports = Sessions;
