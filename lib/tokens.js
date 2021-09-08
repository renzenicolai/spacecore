"use strict";

class Tokens {
	constructor() {
		this.types = [
			{
				name: "iButton",
				authMethod: this.authNone.bind(this),
				requirePrivate: false
			},
			{
				name: "iButton (SHA1)",
				authMethod: this.authIbuttonSha1.bind(this),
				requirePrivate: true
			},
			{
				name: "Generic NFC tag",
				authMethod: this.authNone.bind(this),
				requirePrivate: true
			},
		];
		
		for (var i = 0; i < this.types.length; i++) {
			this.types[i].id = i;
		}
	}
	
	listTypes() {
		return this.types;
	}
	
	getType(id) {
		if (id in this.types) return this.types[id];
		return null;
	}
	
	/* Authentication methods */
	
	authNone(key) {
		return true; //Always allow directly
	}
	
	_authIbuttonSha1Verify(key, challenge, response) {
		return true; //To-do, for now always accept
	}
	
	authIbuttonSha1(key) {
		var challenge = "NOT_IMPLEMENTED"; //To-do
		return {
			challenge: challenge,
			callback: this._authIbuttonSha1Verify.bind(this, key, challenge)
		};
	}
}

module.exports = new Tokens();
