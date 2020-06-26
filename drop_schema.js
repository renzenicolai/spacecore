'use strict';

const env = require('./environment.js');

async function create(database, table) {
	try {
		var Schema = require('./schemas/'+table+'.js');
	} catch (error) {
		console.log('Schema not found');
		return;
	}
	let schema = new Schema(database);
	await schema.drop(null, true);
}

let table = process.argv[process.argv.length-1];
env.start();
create(env.database(), table).then(() => {
	env.stop();
}).catch((error) => {
	env.stop();
	throw error;
});
