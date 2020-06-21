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
			if (this.sessions[i].getIdentifier() === id) {
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
		if (session === null) {
			throw "no active session";
		}
		return {
			user: session.getUser(),
			permissions: await session.listPermissions()
		};
	}
	
	async listPermissionsForCurrentSession(session, params) {
		//Lists permissions for the active session
		if (session === null) {
			throw "no active session";
		}
		let permissions = await this.session.listPermissions();
		return permissions;
	}
	
	async subscribe(session, params) {
		if (session === null) {
			throw "no active session";
		}
		if (typeof params === 'string') {
			let result = await session.subscribe(params);
			return result;
		} else {
			let promises = [];
			for (let i = 0; i < params.length; i++) {
				promises.push(session.subscribe(params[i]));
			}
			let result = await Promise.all(promises);
			return result;
		}
	}

	async unsubscribe(session, params) {
		if (session === null) {
			throw "no active session";
		}
		if (typeof params === 'string') {
			let result = await session.unsubscribe(params);
			return result;
		} else {
			let promises = [];
			for (let i = 0; i < params.length; i++) {
				promises.push(session.unsubscribe(params[i]));
			}
			let result = await Promise.all(promises);
			return result;
		}
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
		var result = this._destroySession(params);
		if (!result) {
			throw "Session not found";
		}
		return true;
	}

	registerRpcMethods(rpc, prefix="session") {
		if (prefix!=="") prefix = prefix + "/";
		
		/*
		 * Create session
		 * 
		 * Returns a unique session token used to identify the session in further requests
		 * 
		 */
		rpc.addMethod(
			prefix+"create",
			this.createSession.bind(this),
			[
				{
					type: "none"
				}
			]
		);
		
		/*
		 * Destroy the current session
		 * 
		 * Destroys the session attached to the request
		 * 
		 */
		rpc.addMethod(
			prefix+"destroy",
			this.destroyCurrentSession.bind(this),
			[
				{
					type: "none"
				}
			]
		);
		
		/*
		 * Query the state of the current session
		 * 
		 * Returns the state of the session attached to the request
		 * 
		 */
		rpc.addMethod(
			prefix+"state",
			this.state.bind(this),
			[
				{
					type: "none"
				}
			]
		);
		
		/*
		 * Query permissions granted to the current session
		 * 
		 * Returns a list of permissions granted to the session attached to the request
		 * 
		 */
		rpc.addMethod(
			prefix+"permissions",
			this.listPermissionsForCurrentSession.bind(this),
			[
				{
					type: "none"
				}
			]
		);
		
		/* 
		 * Pushmessages: subscribe to a topic
		 *
		 * Adds the supplied topic to the list of topics subscribed to of the session attached to the request
		 * 
		 */
		rpc.addMethod(
			prefix+"push/subscribe",
			this.subscribe.bind(this),
			[
				{
					type: "string",
					description: "Topic"
				},
				{
					type: "array",
					contains: "string",
					description: "Array containing topics"
				}
			]
		);
		
		/*
		 * Pushmessages: unsubscribe from a topic
		 * 
		 * Removes the supplied topic to the list of topics subscribed to of the session attached to the request
		 * 
		 */
		rpc.addMethod(
			prefix+"push/unsubscribe",
			this.unsubscribe.bind(this),
			[
				{
					type: "string",
					description: "Topic"
				},
				{
					type: "array",
					contains: "string",
					description: "Array containing topics"
				}
			]
		);
		
		/*
		 * Management: list all active sessions
		 * 
		 * Returns a list of sessions
		 * 
		 */
		rpc.addMethod(
			prefix+"management/list",
			this.listSessions.bind(this),
			[
				{
					type: "none"
				}
			]
		);
		
		/*
		 * Management: destroy a session
		 * 
		 * Destroys the session corresponding to the supplied session token
		 * 
		 */
		rpc.addMethod(
			prefix+"management/destroy",
			this.destroySession.bind(this),
			[
				{
					type: "string",
					description: "Unique identifier of the session that will be destroyed"
				}
			]
		);
	}
}

module.exports = Sessions;
