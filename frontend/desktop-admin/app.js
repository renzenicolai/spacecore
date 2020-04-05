"use strict";

// System libraries
const fs               = require('fs');
const path             = require('path');

// NPM libraries
const electron         = require('electron');
const yargs            = require('yargs');
const chalk            = require('chalk');

// Project specific libraries
const Configuration    = require('./lib/configuration.js');
const WebSocketClient  = require("./lib/wsclient.js");

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

var configFile = "configuration.json";
if (argv.config) configFile = argv.config;

// Configuration

var configuration = new Configuration(configFile);

// Error handlers

process.on('unhandledRejection', (err) => {
	console.log(chalk.bgRed.white.bold(" ERROR ")+" Unhandled rejection:", err);
	process.exit(1);
});

process.on('uncaughtException', (err) => {
	console.log(chalk.bgRed.white.bold(" ERROR ")+" Uncaught exception:", err);
	process.exit(1);
});

process.on('SIGINT', () => {
	console.log(chalk.bgRed.white.bold(" ERROR ")+" Application interrupted");
	process.exit(0);
});

process.on('exit', (code) => {
	//Nothing.
});

// Electron UI window

var window = null;

function createWindow () {
	window = new electron.BrowserWindow({
		width: 1024,
		height: 768,
		icon: path.join(__dirname, 'data/icon64.png'),
		webPreferences: {
		nodeIntegration: true
		}
	});

	window.removeMenu();
	window.loadFile('data/index.html');
}

electron.app.allowRendererProcessReuse = true;
electron.app.whenReady().then(createWindow);

// Websocket client

var wsClient = new WebSocketClient({
	server: configuration.get("server"),
	username: configuration.get("username"),
	password: configuration.get("password")
});

var connected = false;

function wsConnect() {
	if (!wsClient.connected()) {
		console.log(chalk.bgMagenta.white.bold(" WS ")+" Connecting to server...");
		wsClient.connect();
	}
}

function onWsOpen() {
	connected = true;
	console.log(chalk.bgMagenta.white.bold(" WS ")+" Connected to server");
	window.webContents.send('open', null);
}

function onWsClose() {
	if (connected) {
		console.log(chalk.bgMagenta.white.bold(" WS ")+" Connection closed");
		connected = false;
	}
	setTimeout(wsConnect, 2000);
	window.webContents.send('close', null);
}

function onWsError() {
	//console.log(chalk.bgMagenta.white.bold(" WS ")+" Connection failed");
	setTimeout(wsConnect, 2000);
	window.webContents.send('error', null);
}

function onWsMessage(message) {
	window.webContents.send('message', message);
}

wsClient.on("open", onWsOpen);
wsClient.on("close", onWsClose);
wsClient.on("error", onWsError);
wsClient.on("message", onWsMessage);

electron.ipcMain.on('send', async (event, arg) => {
	wsClient.send(arg);
});

electron.ipcMain.on('connect', async (event, arg) => {
	if (!wsClient.connect()) {
		onWsOpen(); //Already connected
	}
});
