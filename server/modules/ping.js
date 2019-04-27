"use strict";

class Ping {
	constructor(opts={}) {
		//Nothing to do.
	}
	
	ping(session, params) {
		return new Promise((resolve, reject) => {
			return resolve("pong");
		});
	}
	
	registerRpcMethods(rpc, prefix="") {
		if (prefix!=="") prefix = prefix + "/";
		rpc.addMethod(prefix+"ping", this.ping.bind(this));
	}
}

module.exports = Ping;
