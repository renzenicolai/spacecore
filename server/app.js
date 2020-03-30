"use strict";

// System libraries
const fs               = require('fs');

// NPM libraries
const yargs            = require('yargs');
const chalk            = require('chalk');

// Project specific libraries
const Configuration    = require('./lib/configuration.js');
const Rpc              = require('./lib/rpc.js');
const Webserver        = require('./lib/webserver.js');
const Websocketserver  = require('./lib/websocketserver.js');
const Mqttclient       = require('./lib/mqtt.js');
const Database         = require('./lib/db.js');

// Project specific modules
const Ping             = require('./modules/ping.js');
const Sessions         = require('./modules/sessions.js');
const Files            = require('./modules/files.js');
const Users            = require('./modules/users.js');
const Persons          = require('./modules/persons.js');
const Products         = require('./modules/products.js');
const Invoices         = require('./modules/invoices.js');
const Mt940            = require('./modules/mt940.js');
const Vending          = require('./modules/vending.js');

// Project specific verification modules
const VerifyBalance    = require('./verification/balance.js');

/* Argument parser */
const argv = yargs
	.option('config', {
		alias: 'c',
		description: 'Configuration file path',
		type: 'string',
	})
	.help()
	.alias('help', 'h')
	.argv;

var configFile = "configuration.json";
if (argv.config) configFile = argv.config;

/* Configuration */

var configuration = new Configuration(configFile);

/* Logfile */
var logEnable = configuration.get("log", "enable");
if (!logEnable) {
	var logFile = null;
} else {
	var logDir = configuration.get("log", "directory");
	if (logDir === null) logDir = "log/";
	var logFile = fs.createWriteStream(logDir+(new Date()).getTime()+'.txt');
}

/* Error handlers */

process.on('unhandledRejection', (err) => {
	if (logFile) logFile.write("Unhandled rejection: "+err+"\n");
	console.log(chalk.bgRed.white.bold(" ERROR ")+" Unhandled rejection:", err);
	process.exit(1);
});

process.on('uncaughtException', (err) => {
	if (logFile) logFile.write("Uncaught exception: "+err+"\n");
	console.log(chalk.bgRed.white.bold(" ERROR ")+" Uncaught exception:", err);
	process.exit(1);
});

process.on('SIGINT', () => {
	if (logFile) logFile.write("Application interrupted.\n");
	console.log(chalk.bgRed.white.bold(" ERROR ")+" Application interrupted");
	process.exit(0);
});

process.on('exit', (code) => {
	if (logFile) logFile.write("Application terminated with code "+code+"\n");
	if (logFile) logFile.end();
});

/* Database */

var database = new Database({
	host: configuration.get("database", "host"),
	user: configuration.get("database", "user"),
	password: configuration.get("database", "password"),
	database: configuration.get("database", "name"),
	onConnect: start,
	logFile: logFile
});

/* Application elements not requiring database availability */

var sessions = new Sessions({
	timeout: configuration.get("sessions","timeout")
});

var rpc = new Rpc({
	strict: true,
	auth: sessions,
	identity: configuration.get("rpc","identity")
});

sessions.registerRpcMethods(rpc);
sessions.addAlwaysAllow('session/create');

if (configuration.get("rpc","webserver","enabled")) {
	
	var ws = null;
	
	if (configuration.get("rpc","webserver","websocket","enabled")) {
		var websocketserver = new Websocketserver({
			application: rpc
		});
		ws = websocketserver.ws();
	}
	
	var webserver = new Webserver({
		port: configuration.get("rpc","webserver","port"),
		host: configuration.get("rpc","webserver","listen"),
		queue: configuration.get("rpc","webserver","queue"),
		application: rpc,
		mime: 'application/json',
		ws: ws
	});
}

var mqttclient = null;
if (configuration.get("mqtt", "enable")) {
	mqttclient = new Mqttclient({
		port: configuration.get("mqtt", "port"),
		host: configuration.get("mqtt", "host"),
		topic: configuration.get("mqtt", "topic"),
		rpc: {
			handle: (request) => {
				return "RPC over MQTT is disabled!";
			}
		}
	});
}

var ping = new Ping();
ping.registerRpcMethods(rpc);
sessions.addAlwaysAllow('ping');

var mt940 = new Mt940();
mt940.registerRpcMethods(rpc);

/* Application elements depending on database availability */

function start() {
	var files = new Files({
		database: database
	});
	
	files.registerRpcMethods(rpc);

	var users = new Users({
		database: database,
		files: files
	});
	
	users.registerRpcMethods(rpc);
	sessions.addAlwaysAllow('user/authenticate');

	var products = new Products({
		database: database,
		files: files
	});
	
	products.registerRpcMethods(rpc);

	var persons = new Persons({
		database: database,
		files: files,
		products: products
	});
	
	persons.registerRpcMethods(rpc);

	var invoices = new Invoices({
		database: database,
		persons: persons,
		products: products,
		mqtt: mqttclient,
		mqtt_topic: "tkkrlab/spacecore/transaction"
	});
	
	invoices.registerRpcMethods(rpc);

	if (mqttclient) {
		var vending = new Vending({
			database: database,
			mqtt: mqttclient,
			sessions: sessions,
			persons: persons
		});
		vending.registerRpcMethods(rpc);
	}

	var verifications = [];

	verifications.push(new VerifyBalance({
		persons: persons,
		transactions: invoices
	}));

	for (var i in verifications) {
		verifications[i].verify();
	}
}
