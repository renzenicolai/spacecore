'use strict';

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

// Views
const SessionView      = require('./views/session.js');
const FileView         = require('./views/file.js');
const UserView         = require('./views/user.js');
const RelationView     = require('./views/relation.js');
const ProductView      = require('./views/product.js');
const InvoiceView      = require('./views/invoice.js');
const MT940View        = require('./views/mt940.js');

// Verification modules
const VerifyBalance    = require('./verification/balance.js');

// Argument parser
const argv = yargs
	.option('config', {
		alias: 'c',
		description: 'Configuration file path',
		type: 'string',
	})
	.help()
	.alias('help', 'h')
	.argv;

var configFile = 'configuration.json';
if (argv.config) configFile = argv.config;

// Configuration

var configuration = new Configuration(configFile);

// Logfile
var logEnable = configuration.get('log', 'enable');
if (!logEnable) {
	var logFile = null;
} else {
	var logDir = configuration.get('log', 'directory');
	if (logDir === null) logDir = 'log/';
	var logFile = fs.createWriteStream(logDir+(new Date()).getTime()+'.txt');
}

// Error handlers

process.on('unhandledRejection', (err) => {
	if (logFile) logFile.write('Unhandled rejection: '+err+'\n');
	console.log(chalk.bgRed.white.bold(' ERROR ')+' Unhandled rejection:', err);
	process.exit(1);
});

process.on('uncaughtException', (err) => {
	if (logFile) logFile.write('Uncaught exception: '+err+'\n');
	console.log(chalk.bgRed.white.bold(' ERROR ')+' Uncaught exception:', err);
	process.exit(1);
});

process.on('SIGINT', () => {
	if (logFile) logFile.write('Application interrupted.\n');
	console.log(chalk.bgRed.white.bold(' ERROR ')+' Application interrupted');
	process.exit(0);
});

process.on('exit', (code) => {
	console.log('Exit with code', code);
	if (logFile) logFile.write('Application terminated with code '+code+'\n');
	if (logFile) logFile.end();
});

// Database

var database = new Database({
	host: configuration.get('database', 'host'),
	user: configuration.get('database', 'user'),
	password: configuration.get('database', 'password'),
	database: configuration.get('database', 'name'),
	onConnect: start,
	logFile: logFile
});

// Application elements not requiring database availability

var sessionView = new SessionView({
	timeout: configuration.get('sessions','timeout')
});

var rpc = new Rpc({
	strict: true,
	auth: sessionView,
	identity: configuration.get('rpc','identity')
});

/* Views */
var mt940View = new MT940View();
var fileView = new FileView(database);
var userView = new UserView(database);

/* Registration of RPC methods */
sessionView.registerRpcMethods(rpc);
mt940View.registerRpcMethods(rpc);
fileView.registerRpcMethods(rpc);
userView.registerRpcMethods(rpc);

/* Webserver */
let websocketserver = null;
let webserver = null;

if (configuration.get('rpc','webserver','enabled')) {
	if (configuration.get('rpc','webserver','websocket','enabled')) {
		websocketserver = new Websocketserver({
			application: rpc
		});
	}
	webserver = new Webserver({
		port: configuration.get('rpc','webserver','port'),
		host: configuration.get('rpc','webserver','listen'),
		queue: configuration.get('rpc','webserver','queue'),
		application: rpc,
		mime: 'application/json',
		ws: websocketserver ? websocketserver.ws() : null
	});
}

/* MQTT client */
let mqttclient = null;
if (configuration.get('mqtt', 'enable')) {
	let dummyRpcHandler = {
		handle: (request) => {
			return 'RPC over MQTT is disabled!';
		}
	};
	mqttclient = new Mqttclient({
		port: configuration.get('mqtt', 'port'),
		host: configuration.get('mqtt', 'host'),
		topic: configuration.get('mqtt', 'topic'),
		rpc: configuration.get('mqtt', 'rpc') ? rpc : dummyRpcHandler
	});
}

/* Application elements depending on availability of legacy database tables */

function start() {
	/* Products */
	//var productView = new ProductView(database);
	//productView.registerRpcMethods(rpc);

	/* Relations */
	//var relationView = new RelationView(database, productView);
	//relationView.registerRpcMethods(rpc);

	/*var invoices = new Invoices({
		database: database,
		persons: persons,
		products: products,
		mqtt: mqttclient,
		mqtt_topic: 'tkkrlab/spacecore/transaction'
	});
	
	invoices.registerRpcMethods(rpc);

	var verifications = [];

	verifications.push(new VerifyBalance({
		persons: persons,
		transactions: invoices
	}));

	for (var i in verifications) {
		verifications[i].verify();
	}*/
}
