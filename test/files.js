'use strict';

const expect = require('chai').expect;
const env = require('../test-environment.js');

const Controller = require('../controllers/files.js');
describe('Files', () => {
	after(() => {
		env.database.end();
	});
	it('Model: create file from base64', async () => {
		let controller = new Controller(env.database);
		let file = await controller.createFile('Test','text/plain','SGVsbG8gd29ybGQ=');
		expect(file.getName()).to.equal('Test');
		expect(file.getMime()).to.equal('text/plain');
		expect(file.getDataAsBase64()).to.equal('SGVsbG8gd29ybGQ=');
		let serializedFile = file.serialize();
		expect(serializedFile).to.have.property('name');
		expect(serializedFile).to.have.property('mime');
		expect(serializedFile).to.have.property('file');
		expect(serializedFile.name).to.equal('Test');
		expect(serializedFile.mime).to.equal('text/plain');
		expect(serializedFile.file).to.equal('SGVsbG8gd29ybGQ=');
		
	});
	it('Model: create file from buffer', async () => {
		let controller = new Controller(env.database);
		let file = await controller.createFile('Test','text/plain',Buffer.from("Hello world"));
		expect(file.getName()).to.equal('Test');
		expect(file.getMime()).to.equal('text/plain');
		expect(file.getDataAsBase64()).to.equal('SGVsbG8gd29ybGQ=');
		let serializedFile = file.serialize();
		expect(serializedFile).to.have.property('name');
		expect(serializedFile).to.have.property('mime');
		expect(serializedFile).to.have.property('file');
		expect(serializedFile.name).to.equal('Test');
		expect(serializedFile.mime).to.equal('text/plain');
		expect(serializedFile.file).to.equal('SGVsbG8gd29ybGQ=');
	});
	it('Model: dirty flag', async () => {
		let controller = new Controller(env.database);
		let file = await controller.createFile('Test','text/plain','SGVsbG8gd29ybGQ=');
		file.setDirty(false);
		file.setName('Hello');
		expect(file.getDirty()).to.equal(true);
		file.setDirty(false);
		file.setMime('hello/world');
		expect(file.getDirty()).to.equal(true);
		file.setDirty(false);
		expect(file.getDirty()).to.equal(false);
		file.setDirty(true);
		expect(file.getDirty()).to.equal(true);
	});
	it('Controller: database operations', async () => {
		let controller = new Controller(env.database);
		// Create a file
		let file = await controller.createFile('Test','text/plain','SGVsbG8gd29ybGQ=');
		let identifier = await controller.putFile(file);
		expect(identifier).to.be.a('number');
		expect(identifier).to.be.above(0);
		expect(file.getDirty()).to.equal(false);
		// Edit the file
		file.setName('Hello world');
		expect(file.getDirty()).to.equal(true);
		let identifier2 = await controller.putFile(file);
		expect(identifier2).to.be.a('number');
		expect(identifier2).to.equal(identifier);
		// Read back the file from the database
		let file2 = await controller.getFile(identifier);
		expect(file2.getName()).to.equal("Hello world");
		expect(file2.getMime()).to.equal("text/plain");
		expect(file2.getDataAsBase64()).to.equal('SGVsbG8gd29ybGQ=');
		// Delete the file
		let deleted = await controller.deleteFile(file);
		expect(deleted).to.equal(true); // Deleted
		deleted = await controller.deleteFile(file);
		expect(deleted).to.equal(false); // Already deleted
	});
	it('Controller: database list query', async () => {
		// Preparation
		let controller = new Controller(env.database);
		let file = await controller.createFile('file_for_testing_list_query','mimetype/forlist','SGVsbG8gd29ybGQ=');
		await controller.putFile(file);
		
		// Test
		let result = await controller.findFilesByName('file_for_testing_list_query');
		expect(result).to.have.lengthOf(1);
		expect(result[0]).to.have.property('id');
		expect(result[0]).to.have.property('name');
		expect(result[0]).to.have.property('mime');
		expect(result[0].id).to.equal(file.getIdentifier());
		expect(result[0].name).to.equal(file.getName());
		expect(result[0].mime).to.equal(file.getMime());
		
		result = await controller.findFilesByName('%', 'mimetype/forlist');
		expect(result).to.have.lengthOf(1);
		expect(result[0]).to.have.property('id');
		expect(result[0]).to.have.property('name');
		expect(result[0]).to.have.property('mime');
		expect(result[0].id).to.equal(file.getIdentifier());
		expect(result[0].name).to.equal(file.getName());
		expect(result[0].mime).to.equal(file.getMime());
		
		result = await controller.findFilesByName('%', 'mimetype/nonexistent');
		expect(result).to.have.lengthOf(0);
		
		result = await controller.findFilesByName('file_for_testing_list_query', 'mimetype/forlist');
		expect(result).to.have.lengthOf(1);
		
		// Cleanup
		controller.deleteFile(file);
	});
});


