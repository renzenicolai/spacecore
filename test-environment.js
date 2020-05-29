'use strict';

/*
 * This file supplies the tests with a basic environment containing a database connection
 */

const Configuration = require('./lib/configuration.js');
const Database      = require('./lib/db.js');
const configuration = new Configuration('configuration.json');

const database = new Database({
	host: configuration.get('database', 'host'),
	user: configuration.get('database', 'user'),
	password: configuration.get('database', 'password'),
	database: configuration.get('database', 'name')
});

module.exports = {
	configuration: configuration,
	database: database
};
