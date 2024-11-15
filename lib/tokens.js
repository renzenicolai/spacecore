"use strict";

class Tokens {
	constructor() {
		this.types = [
			{
				name: "iButton",
				requirePrivate: false
			},
			{
				name: "iButton SHA1",
				requirePrivate: true
			},
			{
				name: "DesFire card for doorlock",
				requirePrivate: true
			},
			{
				name: "Guest NFC card",
				requirePrivate: false
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
}

module.exports = new Tokens();
