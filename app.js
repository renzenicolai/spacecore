"use strict";

//Libraries
const Rpc              = require('./lib/rpc.js');
const Webserver        = require('./lib/webserver.js');
const Websocketserver  = require('./lib/websocketserver.js');
const Mqttclient       = require('./lib/mqtt.js');
const Database         = require('./lib/db.js');
const fs               = require('fs'); 
const password         = require('../password.js');

//Modules
const Ping             = require('./modules/ping.js');
const Sessions         = require('./modules/sessions.js');
const Files            = require('./modules/files.js');
const Users            = require('./modules/users.js');
const Persons          = require('./modules/persons.js');
const Products         = require('./modules/products.js');
const Transactions     = require('./modules/transactions.js');

//Verifications
const VerifySaldo      = require('./verification/saldo.js');

var now = new Date();
var logFile = fs.createWriteStream('log/'+now.getTime()+'.txt');

process.on('unhandledRejection', (err) => { 
	logFile.write("UNHANDLED REJECTION: "+err+"\n");
	console.error('======== UNHANDLED REJECTION ========');
	console.error(err);
	process.exit(1);
})

process.on('uncaughtException', (err) => { 
	logFile.write("UNCAUGHT EXCEPTION: "+err+"\n");
	console.error('======== UNCAUGHT EXCEPTION ========');
	console.error(err);
	process.exit(1);
})

process.on('SIGINT', () => {
	console.log("\n======== APPLICATION INTERRUPTED ========");
	logFile.write("Application interrupted.\n");
	process.exit(0);
});

process.on('exit', (code) => {
	console.log("Application terminated with code "+code);
	logFile.write("Application terminated with code "+code+"\n");
	logFile.end();
});

var database = new Database({
	host: '127.0.0.1',
	user: 'datastore',
	password: password,
	database: 'datastore_bar',
	onConnect: start,
	logFile: logFile
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
		host: '0.0.0.0',
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

	var files = new Files({
		database: database
	});
	
	var users = new Users({
		database: database,
		files: files
	});

	var products = new Products({
		database: database,
		files: files
	});
	
	var persons = new Persons({
		database: database,
		files: files,
		products: products
	});
		
	var transactions = new Transactions({
		database: database,
		persons: persons,
		products: products
	});

	sessions.registerRpcMethods(rpc);
	files.registerRpcMethods(rpc);
	users.registerRpcMethods(rpc);
	ping.registerRpcMethods(rpc);
	persons.registerRpcMethods(rpc);
	products.registerRpcMethods(rpc);
	transactions.registerRpcMethods(rpc);
    
	sessions.addAlwaysAllow('session/create');
    sessions.addAlwaysAllow('user/authenticate');
    sessions.addAlwaysAllow('ping');
	
	var verifications = [];
	
	verifications.push(new VerifySaldo({
		persons: persons,
		transactions: transactions
	}));
	
	for (var i in verifications) {
		verifications[i].verify();
	}
}
