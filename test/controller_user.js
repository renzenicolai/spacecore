'use strict';

const expect = require('chai').expect;
const env = require('../test-environment.js');

const User = require('../models/record/user.js');
const Controller = require('../controllers/user.js');

var testData = {
	username: 'testUsername',
	password: '$6$c0aT5tDyxN9DVLEM$Ofun4nZfzQ/g2ySgcUvpPcjlPtW7EKBXL64WrZZNHVEtOPlBm1EyBZySf4QmxViBXWeYOezN7n4R3b8A9mGwe0',
	title: 'testTitle',
	permissions: [
		'testPermission'
	],
	picture: {
		name: 'testPicture',
		mime: 'image/jpeg',
		data: 'SGVsbG8gd29ybGQ='
	}
};

var identifier = null;

describe('Controller: user', () => {
	after(() => {
		env.database.end();
	});
	it('Create (put)', async () => {
		let controller = new Controller(env.database);
		let user = new User(testData);
		expect(user.getDirty()).to.equal(true);
		identifier = await controller.put(user);
		expect(identifier).to.be.a('number');
		expect(identifier).to.be.above(0);
		expect(user.getDirty()).to.equal(false);
	});
	/*it('Edit (get)', async () => {
		let controller = new Controller(env.database);
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
		let controller = new Controller(env.database);
		let deleted = await controller.remove(identifier);
		expect(deleted).to.equal(true); // Deleted
		deleted = await controller.remove(identifier);
		expect(deleted).to.equal(false); // Already deleted
	});
	
	it('Remove by object', async () => {
		let controller = new Controller(env.database);
		let file = new FileRecord(testData);
		let deleted = await controller.remove(file);
		expect(deleted).to.equal(false); // Non existent
		identifier = await controller.put(file);
		deleted = await controller.remove(file);
		expect(deleted).to.equal(true); // Deleted
		deleted = await controller.remove(file);
		expect(deleted).to.equal(false); // Already deleted
	});
	
	it('Find by username', async () => {
		// Preparation
		let controller = new Controller(env.database);
		let file = await controller.create('file_for_testing_list_query','mimetype/forlist','SGVsbG8gd29ybGQ=');
		await controller.put(file);
		
		// Test
		let result = await controller.findByName('file_for_testing_list_query');
		expect(result).to.have.lengthOf(1);
		expect(result[0]).to.have.property('id');
		expect(result[0]).to.have.property('name');
		expect(result[0]).to.have.property('mime');
		expect(result[0].id).to.equal(file.getIdentifier());
		expect(result[0].name).to.equal(file.getName());
		expect(result[0].mime).to.equal(file.getMime());
		
		result = await controller.findByName('%', 'mimetype/forlist');
		expect(result).to.have.lengthOf(1);
		expect(result[0]).to.have.property('id');
		expect(result[0]).to.have.property('name');
		expect(result[0]).to.have.property('mime');
		expect(result[0].id).to.equal(file.getIdentifier());
		expect(result[0].name).to.equal(file.getName());
		expect(result[0].mime).to.equal(file.getMime());
		
		result = await controller.findByName('%', 'mimetype/nonexistent');
		expect(result).to.have.lengthOf(0);
		
		result = await controller.findByName('file_for_testing_list_query', 'mimetype/forlist');
		expect(result).to.have.lengthOf(1);
		
		// Cleanup
		controller.remove(file);
	});*/
});


