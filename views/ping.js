"use strict";

class Ping {
	constructor(opts={}) {
		//Nothing to do.
	}
	
	async ping(session, params) {
		return "pong";
	}
	
	registerRpcMethods(rpc, prefix="") {
		if (prefix!=="") prefix = prefix + "/";
		
		/*
		 * Ping
		 * 
		 * Returns the string "pong"
		 * 
		 */
		rpc.addMethod(
			prefix+"ping",
			this.ping.bind(this),
			[
				{
					type: "none"
				}
			]
		);
	}
}

module.exports = Ping;
