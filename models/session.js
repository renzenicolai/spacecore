'use strict';

const { v4: uuidv4 } = require('uuid');

class Session {
	constructor() {
		// The unique identifier for this session
		this._id = uuidv4();
		
		// Unix timestamps for keeping track of the amount of seconds this session has been idle
		this._dateCreated = Math.floor(Date.now() / 1000);
		this._dateLastUsed = this._dateCreated;
		
		// User account associated with this session
		this._user = null;
		
		// Client currently connected to this session
		this._connection = null;
		
		// Push message subscriptions
		this._subscriptions = null;
	}
	
	getIdentifier() {
		// Returns the unique identifier of this session
		return this._id;
	}
	
	getId() {
		// Returns the unique identifier of this session
		process.emitWarning("getId is deprecated, please use getIdentifier", 'DeprecationWarning');
		return this._id;
	}
	
	getCreatedAt() {
		// Returns a unix timestamp representing the moment this session was created
		return this._dateCreated;
	}
	
	getUsedAt() {
		// Returns a unix timestamp representing the moment this session was last used
		return this._dateLastUsed;
	}
	
	use() {
		// Update the timestamp representing the moment this session was last used to the current time
		this._dateLastUsed = Math.floor(Date.now() / 1000);
	}
	
	checkPermission(method) {
		let result = false;
		if (this._user !== null) {
			if (typeof this._user.permissions === 'object') {
				for (let i in this._user.permissions) {
					if (method.startsWith(this._user.permissions[i])) {
						result = true;
						break;
					}
				}
			}
		}
		return result;
	}
	
	listPermissions() {
		let result = null;
		if (this._user !== null) {
			result = this._user.permissions;
		}
		return result;
	}
	
	getConnection() {
		return this._connection;
	}
	
	setConnection(connection) {
		this._connection = connection;
	}
	
	setUser(user) {
		this._user = user;
	}
	
	getUser(user) {
		return this._user;
	}
	
	serialize() {
		// Summary of the session
		return {
			id: this._id,
			user: this._user,
			dateCreated: this._dateCreated,
			dateLastUsed: this._dateLastUsed,
			subscriptions: this._subscriptions
		};
	}
	
	async push(subject, message) {
		let result = false;
		if (this._connection !== null) {
			this._connection.send(JSON.stringify({
				pushMessage: true,
				subject: subject,
				message: message
			}));
			result = true;
		}
		return result;
	}

	async pushIfSubscribed(subject, message) {
		let result = false;
		if (this._subscriptions.includes(subject)) {
			result = await this.push(subject, message);
		}
		return result;
	}

	async subscribe(subject) {
		let result = false;
		if (!this._subscriptions.includes(subject)) {
				this._subscriptions.push(subject);
				result = true;
		}
		return result;
	}

	async unsubscribe(subject) {
		this._subscriptions = this._subscriptions.filter(item => item !== subject);
		return true;
	}
	
	getSubscriptions() {
		return this._subscriptions;
	}
}

module.exports = Session;
