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
	await schema.drop();
	await schema.create();
	let errors = await schema.check();
	if (errors.length > 0) {
		console.log('\nFailed to deploy schema '+table+', detected the following errors:');
		for (let i = 0; i < errors.length; i++) {
			console.log(' - '+errors[i]);
		}
	} else {
		console.log('Succesfully deployed schema '+table);
	}
}

let table = process.argv[process.argv.length-1];
env.start();
create(env.database(), table).then(() => {
	env.stop();
}).catch((error) => {
	env.stop();
	throw error;
});
