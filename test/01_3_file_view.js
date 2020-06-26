'use strict';

const expect = require('chai').expect;
const env    = require('../test-environment.js');
const Schema = require('../schemas/file.js');
const View   = require('../views/file.js');

describe('View: file', () => {
	before(async () => {
		env.start();
		let schema = new Schema(env.database());
		await schema.drop();
		await schema.create();
		expect((await schema.check()).length).to.equal(0);
	});
	after(async () => {
		let schema = new Schema(env.database());
		await schema.drop();
		env.stop();
	});
	it('list', async () => {
		let database = env.database();
		let view = new View(database);
		
	});
	it('get', async () => {
		let database = env.database();
		let view = new View(database);
		
	});
	it('put', async () => {
		let database = env.database();
		let view = new View(database);
		
	});
	it('remove', async () => {
		let database = env.database();
		let view = new View(database);
		
	});
});


