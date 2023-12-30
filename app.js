"use strict";

// System libraries
const fs = require("fs");

// NPM libraries
const yargs = require("yargs");
const { Rpc, SessionManager, Webserver } = require("nicolai-jsonrpc");
const Configuration = require("nicolai-configuration");

// Project specific libraries
const Mqttclient = require("./lib/mqtt.js");
const Database = require("./lib/db.js");

// Project specific modules
const Files = require("./modules/files.js");
const Users = require("./modules/users.js");
const Persons = require("./modules/persons.js");
const Products = require("./modules/products.js");
const Invoices = require("./modules/invoices.js");
const Reports = require("./modules/reports.js");

// Project specific verification modules
const VerifyBalance = require("./verification/balance.js");

// Argument parser
const argv = yargs
    .option("config", {
        alias: "c",
        description: "Configuration file path",
        type: "string",
    })
    .help()
    .alias("help", "h")
    .argv;

var configFile = "configuration.json";
if (argv.config) configFile = argv.config;

// Configuration

var configuration = new Configuration(configFile);

// Logfile
var logEnable = configuration.get("log", "enable");
if (!logEnable) {
    var logFile = null;
} else {
    var logDir = configuration.get("log", "directory");
    if (logDir === null) logDir = "log/";
    var logFile = fs.createWriteStream(logDir+(new Date()).getTime()+".txt");
}

// Error handlers

process.on("unhandledRejection", (err) => {
    if (logFile) logFile.write("Unhandled rejection: "+err+"\n");
    console.error("Unhandled rejection:", err);
    process.exit(1);
});

process.on("uncaughtException", (err) => {
    if (logFile) logFile.write("Uncaught exception: "+err+"\n");
    console.error("Uncaught exception:", err);
    process.exit(1);
});

process.on("SIGINT", () => {
    if (logFile) logFile.write("Application interrupted.\n");
    console.error("Application interrupted");
    process.exit(0);
});

process.on("exit", (code) => {
    if (logFile) logFile.write("Application terminated with code "+code+"\n");
    if (logFile) logFile.end();
});

// Database

var database = new Database({
    host: configuration.get("database", "host"),
    user: configuration.get("database", "user"),
    password: configuration.get("database", "password"),
    database: configuration.get("database", "name"),
    onConnect: start,
    logFile: logFile
});

// Application elements not requiring database availability

var sessionManager = new SessionManager({
    timeout: configuration.get("sessions","timeout"),
    userSchema: {}
});

var rpc = new Rpc({
    title: configuration.get("rpc","identity"),
    version: ""
}, sessionManager);

if (configuration.get("rpc","webserver","enabled")) {
    var webserver = new Webserver({
        port: configuration.get("rpc","webserver","port"),
        host: configuration.get("rpc","webserver","listen"),
        queue: configuration.get("rpc","webserver","queue"),
        application: rpc,
    });
}

var mqttclient = null;
if (configuration.get("mqtt", "enable")) {
    mqttclient = new Mqttclient({
        port: configuration.get("mqtt", "port"),
        host: configuration.get("mqtt", "host"),
        topic: configuration.get("mqtt", "topic"),
        rpc: {
            handle: async (request) => {
                console.log("Something did a request over mqtt, which is disabled.", request);
                return "RPC over MQTT is disabled!";
            }
        }
    });
}

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

    var reports = new Reports({
        database: database,
        persons: persons,
        products: products,
        invoices: invoices
    });

    reports.registerRpcMethods(rpc);

    var verifications = [];

    verifications.push(new VerifyBalance({
        persons: persons,
        transactions: invoices
    }));

    for (var i in verifications) {
        verifications[i].verify();
    }
}
