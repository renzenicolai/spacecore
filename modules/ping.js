"use strict";

class Ping {
	constructor(opts={}) {
		//Nothing to do.
	}
	
	async ping(session, params) {
		if (session) {
			session.use();
		}
		return "pong";
	}
	
	registerRpcMethods(rpc, prefix="") {
		if (prefix!=="") prefix = prefix + "/";
		
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
