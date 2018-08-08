"use strict";

//Libraries
const Rpc        = require('./lib/rpc.js');
const Webserver  = require('./lib/webserver.js');
const Websocketserver  = require('./lib/websocketserver.js');
const Mqttclient = require('./lib/mqtt.js');
const Database   = require('./lib/db.js');
const password   = require('../password.js');

//Modules
const Ping     = require('./modules/ping.js');
const Sessions = require('./modules/sessions.js');
const Users  = require('./modules/users.js');
const Persons  = require('./modules/persons.js');
//const Products = require('./modules/products.js');
//const Journal  = require('./modules/journal.js');
//const Deposit  = require('./modules/deposit.js');

process.on('unhandledRejection', (err) => { 
	console.error('======== UNHANDLED REJECTION ========');
	console.error(err);
	process.exit(1);
})

var database = new Database({
	host: '127.0.0.1',
	user: 'datastore',
	password: password,
	database: 'datastore',
	onConnect: start
});

function start() {
	var sessions = new Sessions(); //Session management

	var rpc = new Rpc({
		strict: true,
		auth: sessions
	});
    
	var websocketserver = new Websocketserver({
		application: rpc
	});

	var webserver = new Webserver({
		port: 8000,
		host: '127.0.0.1',
		queue: 512,
		application: rpc,
		mime: 'application/json',
        ws: websocketserver.ws()
	});

	/*var mqttclient = new Mqttclient({
		port: 1883,
		host: 'tkkrlab.space',
		topic: 'test/bar',
		rpc: rpc
	});*/

	var ping = new Ping();         //A simple ping endpoint to check connection status

	//database.registerRpcMethods(rpc, "db"); // <- Allows for executing raw queries. Do not enable in production!

	var users = new Users({
		database: database
	});

	var persons = new Persons({
		database: database
	});

	sessions.registerRpcMethods(rpc);
	users.registerRpcMethods(rpc);
	ping.registerRpcMethods(rpc);
	persons.registerRpcMethods(rpc);
    
	sessions.addAlwaysAllow('session/create');
    sessions.addAlwaysAllow('user/authenticate');
    sessions.addAlwaysAllow('ping');
	
	//console.log(rpc.listMethods());
    
    
	/*var products = new Products({
		database: database
	});
	products.registerRpcMethods(rpc, "products");*/

	/*var journal = new Journal({
		database: database
	});
	journal.registerRpcMethods(rpc, "journal");*/

	/*var deposit = new Deposit({
		database: database,
		persons: persons,
		transactions: transactions
	});
	deposit.registerRpcMethods(rpc, "deposit");*/
}
