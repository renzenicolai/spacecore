'use strict';

const expect      = require('chai').expect;
const env         = require('../test-environment.js');
const Schema      = require('../schemas/file.js');
const GenericFile = require('../models/record/file.js');
const Controller  = require('../controllers/file.js');
const View        = require('../views/file.js');

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
		let controller = new Controller(database);
		let view = new View(database);
		let fileA = new GenericFile({ name: 'testA', mime: 'testMimeA', data: 'SGVsbG8gd29ybGQ=' });
		await controller.put(fileA);
		let fileB = new GenericFile({ name: 'testB', mime: 'testMimeB', data: 'SGVsbG8gd29ybGQ=' });
		await controller.put(fileB);
		let resultA = await view.list(null, {name: 'testA'});
		expect(resultA).to.be.an('array');
		expect(resultA).to.have.lengthOf(1);
		expect(resultA[0].name).to.equal('testA');
		let resultB = await view.list(null, {name: '%'});
		expect(resultB).to.be.an('array');
		expect(resultB).to.have.lengthOf(2);
		expect(resultB[0].name).to.equal('testA');
		expect(resultB[1].name).to.equal('testB');
		let resultC = await view.list(null, {name: 'testA', mime: 'testMimeA'});
		expect(resultC).to.be.an('array');
		expect(resultC).to.have.lengthOf(1);
		expect(resultC[0].name).to.equal('testA');
		let resultD = await view.list(null, {name: '%', mime: 'testMimeA'});
		expect(resultD).to.be.an('array');
		expect(resultD).to.have.lengthOf(1);
		expect(resultD[0].name).to.equal('testA');
		await controller.remove(fileA);
		await controller.remove(fileB);
	});

	it('get', async () => {
		let database = env.database();
		let controller = new Controller(database);
		let view = new View(database);
		let fileA = new GenericFile({ name: 'testA', mime: 'testMimeA', data: 'SGVsbG8gd29ybGQ=' });
		let identifier = await controller.put(fileA);
		let resultNotFound = await view.get(null, 0);
		expect(resultNotFound).to.equal(null);
		let result = await view.get(null, identifier);
		expect(result.name).to.equal('testA');
		await controller.remove(fileA);
	});

	it('put', async () => {
		let database = env.database();
		let controller = new Controller(database);
		let view = new View(database);
		let result = await view.put(null, { name: 'testA', mime: 'testMimeA', data: 'SGVsbG8gd29ybGQ=' });
		expect(result).to.be.a('number').above(0);
		await controller.remove(result);
	});

	it('remove', async () => {
		let database = env.database();
		let controller = new Controller(database);
		let view = new View(database);
		let file = new GenericFile({ name: 'testA', mime: 'testMimeA', data: 'SGVsbG8gd29ybGQ=' });
		await controller.put(file);
		let resultA = await view.remove(null, file);
		expect(resultA).to.equal(true);
		let resultB = await view.remove(null, file);
		expect(resultB).to.equal(false);
	});
});


