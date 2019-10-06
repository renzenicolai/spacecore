/*
 * Function: JSON RPC handler
 * Author: Renze Nicolai 2018
 * License: GPLv3
 */

"use strict";

class Rpc {
	
	/*errorCodes = {
		"success":   0,
		"general":   1,
		"access":    2,
		"parameter": 3,
		"database":  4
	};*/
	
	constructor( opts ) {
		this._opts = Object.assign({
			strict: true,
			auth: null,
			identity: "rpc service"
		}, opts);
		
		this._functions = {};
	}
	
	addMethod(name, func) {
		if (name && typeof func === 'function') {
			this._functions[name] = func;
			console.log("[RPC] Registered method '"+name+"'");
			return true;
		}
		console.log("[RPC] Can not register method '"+name+"'");
		return false;
	}
	
	delMethod(name) {
		if (this._functions[name]) {
			this._functions[name] = null;
			return true;
		}
		return false;
	}
	
	listMethods() {
		var list = [];
		for (var i in this._functions) {
			list.push(i);
		}
		return list;
	}
	
	_handleRequest(request, connection=null) {		
		return new Promise((resolve, reject) => {
			var response = {};

			if (request.id) response.id = request.id;
			
			if (this._opts.strict) {
				if (!request.id) response.id = null;
				response.jsonrpc = "2.0";
				
				if ((request.jsonrpc !== "2.0") || (!request.id)) {
					response.error = { code: -32600, message: "Invalid Request" };
					console.log("_handleRequest: reject strict!",request,"response:",response);
					return reject(response);
				}
			}
			
			if (typeof request.params === 'undefined') request.params = null;
			if (typeof request.token !== 'string') request.token = "";
			var session = this._opts.auth.getSession(request.token);
			
			if ((session !== null && connection !== null)) {
				//console.log("[RPC] Added connection to session "+request.token+"!");
				session.setConnection(connection);
			}
			
			if (typeof request.method === 'string') {
				
				//console.log("[RPC] Request:",request.method,request.params);
				
				//Authentication
				var havePermission = this._opts.auth.checkAlwaysAllow(request.method);
				if (!havePermission && (session !== null)) havePermission = session.checkPermissionSync(request.method);
				if (!havePermission) {
						response.error = { code: 1, message: "Access denied" };
						console.log("[RPC] Access denied");
						return reject(response);
				}
				
				if (typeof this._functions[request.method] === 'function') {
					var numArgs = this._functions[request.method].length;
					
					/*if (numArgs===3) {
						this._functions[request.method](session, request.params, (err,res) => {
							if (err) {
								response.error = err;
								console.log("[RPC] Response 1 (failure)",err);
							}
							if (res) {
								response.result = res;
								console.log("[RPC] Response 1 (success)",res);
								return resolve(response);
							}
							return reject(response);
						});
					} else */if (numArgs===2) {
						this._functions[request.method](session, request.params).then( (res) => {
							response.result = res;
							//console.log("[RPC] Response (success)",res);
							return resolve(response);
						}).catch( (err) => {
							response.error = err;
							console.log("[RPC] Response (failure)",err);
							if (!(typeof err==="object" && typeof err.code==="number" && typeof err.message==="string")) {
								console.log("[RPC] Invalid error response from function!");
								if (typeof err==="string") {
									response.error = { code: -4242, message: err };
								} else {
									response.error = { code: -1337, message: "Internal error", raw: err };
								}
							}
							return reject(response);
						});
					/*} else if (numArgs===1) {
						this._functions[request.method](request.params).then( (res) => {
							response.result = res;
							console.log("[RPC] Response 3 (success)",res);
							return resolve(response);
						}).catch( (err) => {
							response.error = err;
							console.log("[RPC] Response 3 (failure)",err);
							return reject(response);
						});*/
					} else {
						console.log("[RPC] Error: method '"+request.method+"' has an invalid argument count!",numArgs);
						throw "Method has invalid argument count";
					}
				} else {
					console.log("[RPC] Error: method not found");
					response.error = { code: -32601, message: "Method not found" };
					return reject(response);
				}
			} else {
				console.log("[RPC] Error: invalid request");
				response.error = { code: -32600, message: "Invalid Request" };
				return reject(response);
			}
		});
	}
	
	handle(data, connection=null) {
		return new Promise((resolve, reject) => {
			var requests = null;

			if (data == "") { //Index / empty request
				var index = {
					code: -42,
					message: "Empty request received",
					service: this._opts.identity,
					methods: this.listMethods()
				};
				return resolve(JSON.stringify(index));
			}
			
			try {
				requests = JSON.parse(data);
			} catch (err) {
				console.log(data, err);
				return reject(JSON.stringify({ code: -32700, message: "Parse error" }));
			}
			
			if (!Array.isArray(requests)) {
				requests = [requests];
			}
			
			if (requests.length < 1) {
				return reject(JSON.stringify({ code: -32600, message: "Invalid Request" }));
			}

			if (requests.length > 1) {
				//A batch of requests
				var promises = [];
				
				var results = [];
				var failed = false;
				
				for (var index = 0; index<requests.length; index++) {
					promises.push(this._handleRequest(requests[index], connection).then( (result) => {
						results.push(result);
					}).catch( (error) => {
						results.push(error);
						failed = true;
					}));
				}
				
				Promise.all(promises).then( (unused) => {
					if (failed) {
						return reject(JSON.stringify(results));
					} else {
						return resolve(JSON.stringify(results));
					}
				});
			} else {
				//A single request
				this._handleRequest(requests[0], connection).then( (result) => {
					//console.log('handle: resolve! ',result);
					return resolve(JSON.stringify(result));
				}).catch( (error) => {
					console.log('handle: return reject! ',error);
					return reject(JSON.stringify(error));
				});
			}
		});
	}
}

module.exports = Rpc;
