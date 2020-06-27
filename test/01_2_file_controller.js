'use strict';

const expect = require('chai').expect;
const env = require('../test-environment.js');

const FileRecord = require('../models/record/file.js');
const Schema     = require('../schemas/file.js');
const Controller = require('../controllers/file.js');

var testData = {
	name: "testName",
	mime: "testMime",
	data: 'SGVsbG8gd29ybGQ='
};

var identifier = null;

describe('Controller: file', () => {
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
	it('Create (put)', async () => {
		let controller = new Controller(env.database());
		let file = new FileRecord(testData);
		expect(file.getDirty()).to.equal(true);
		identifier = await controller.put(file);
		expect(identifier).to.be.a('number');
		expect(identifier).to.be.above(0);
		expect(file.getDirty()).to.equal(false);
	});
	it('Edit (get)', async () => {
		let controller = new Controller(env.database());
		let file = await controller.get(identifier);
		expect(file).to.be.an.instanceof(FileRecord);
		expect(file.getName()).to.equal(testData.name);
		expect(file.getMime()).to.equal(testData.mime);
		expect(file.getDataAsBase64()).to.equal(testData.data);
		testData.name = "Changed during edit";
		file.setName(testData.name);
		let newIdentifier = await controller.put(file);
		expect(newIdentifier).to.equal(identifier);
		let file2 = await controller.get(identifier);
		expect(file2).to.be.an.instanceof(FileRecord);
		expect(file2.getName()).to.equal(testData.name);
		expect(file2.getMime()).to.equal(testData.mime);
		expect(file2.getDataAsBase64()).to.equal(testData.data);
	});
	
	it('Remove by id', async () => {
		let controller = new Controller(env.database());
		let deleted = await controller.remove(identifier);
		expect(deleted).to.equal(true); // Deleted
		deleted = await controller.remove(identifier);
		expect(deleted).to.equal(false); // Already deleted
	});
	
	it('Remove by object', async () => {
		let controller = new Controller(env.database());
		let file = new FileRecord(testData);
		let deleted = await controller.remove(file);
		expect(deleted).to.equal(false); // Non existent
		identifier = await controller.put(file);
		deleted = await controller.remove(file);
		expect(deleted).to.equal(true); // Deleted
		deleted = await controller.remove(file);
		expect(deleted).to.equal(false); // Already deleted
	});
	
	it('Find', async () => {
		// Preparation
		let controller = new Controller(env.database());
		let file = await controller.create('file_for_testing_list_query','mimetype/forlist','SGVsbG8gd29ybGQ=');
		await controller.put(file);
		
		// Test
		let result = await controller.find('file_for_testing_list_query');
		expect(result).to.have.lengthOf(1);
		expect(result[0]).to.have.property('id');
		expect(result[0]).to.have.property('name');
		expect(result[0]).to.have.property('mime');
		expect(result[0].id).to.equal(file.getIdentifier());
		expect(result[0].name).to.equal(file.getName());
		expect(result[0].mime).to.equal(file.getMime());
		
		result = await controller.find('%', 'mimetype/forlist');
		expect(result).to.have.lengthOf(1);
		expect(result[0]).to.have.property('id');
		expect(result[0]).to.have.property('name');
		expect(result[0]).to.have.property('mime');
		expect(result[0].id).to.equal(file.getIdentifier());
		expect(result[0].name).to.equal(file.getName());
		expect(result[0].mime).to.equal(file.getMime());
		
		result = await controller.find('%', 'mimetype/nonexistent');
		expect(result).to.have.lengthOf(0);
		
		result = await controller.find('file_for_testing_list_query', 'mimetype/forlist');
		expect(result).to.have.lengthOf(1);
		
		// Cleanup
		await controller.remove(file);
	});
});


