"use strict";

const chalk  = require('chalk');

const Session = require('../models/session.js');

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
			
			var id = this.sessions[i].getIdentifier();
			var unusedSince = now-this.sessions[i].getUsedAt();
			
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
	
	pushIfSubscribed(session, subject, message) {
		return session.pushIfSubscribed(subject, message);
	}

	push(session, subject, message) {
		return session.push(subject, message);
	}
	
	getSession(token) {
		for (var i in this.sessions) {
			if (this.sessions[i].getIdentifier()===token) {
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
		let newSession = new Session();
		this.sessions.push(newSession);
		return newSession.getIdentifier();
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
			user: session.getUser(),
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
			sessionList.push(this.sessions[i].serialize());
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
			this.state.bind(this)
		);
		
		
		rpc.addMethod(prefix+"permissions", this.listPermissionsForCurrentSession.bind(this));
		rpc.addMethod(prefix+"push/subscribe", this.subscribe.bind(this));
		rpc.addMethod(prefix+"push/unsubscribe", this.unsubscribe.bind(this));
		rpc.addMethod(prefix+"management/list", this.listSessions.bind(this));
		rpc.addMethod(prefix+"management/destroy", this.destroySession.bind(this));
	}
}

module.exports = Sessions;
