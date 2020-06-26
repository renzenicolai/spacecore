'use strict';

/*
 * This file supplies the tools with a basic environment containing a database connection
 */

const Configuration = require('./lib/configuration.js');
const Database      = require('./lib/db.js');
const configuration = new Configuration('configuration.json');

var database = null;

function start() {
	database = new Database({
		host: configuration.get('database', 'host'),
		user: configuration.get('database', 'user'),
		password: configuration.get('database', 'password'),
		database: configuration.get('database', 'name')
	});
}

function stop() {
	if (database) {
		database.end();
	}
}

function get() {
	return database;
}

module.exports = {
	configuration: configuration,
	start: start,
	stop: stop,
	database: get
};
