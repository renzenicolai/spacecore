'use strict';

const expect = require('chai').expect;
const env = require('../test-environment.js');

const User = require('../models/record/user.js');
const Controller = require('../controllers/user.js');

var testData = {
	username: 'testUsername',
	realname: 'testRealname',
	password: '$6$c0aT5tDyxN9DVLEM$Ofun4nZfzQ/g2ySgcUvpPcjlPtW7EKBXL64WrZZNHVEtOPlBm1EyBZySf4QmxViBXWeYOezN7n4R3b8A9mGwe0',
	title: 'testTitle',
	active: false,
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
	before(() => {
		env.start();
	});
	after(() => {
		env.stop();
	});
	it('Create (put)', async () => {
		let controller = new Controller(env.database());
		let user = new User(testData);
		expect(user.getDirty()).to.equal(true);
		identifier = await controller.put(user);
		expect(identifier).to.be.a('number');
		expect(identifier).to.be.above(0);
		expect(user.getDirty()).to.equal(false);
	});
	it('Edit (get)', async () => {
		let controller = new Controller(env.database());
		let user = await controller.get(identifier);
		expect(user).to.be.an.instanceof(User);
		expect(user.getUsername()).to.equal(testData.username);
		expect(user.getRealname()).to.equal(testData.realname);
		expect(user.getPasswordHash()).to.equal(testData.password);
		expect(user.getTitle()).to.equal(testData.title);
		expect(user.getActive()).to.equal(testData.active);
		expect(user.getPermissions()).to.eql(testData.permissions);
		let pictureData = user.getPicture().serialize();
		delete pictureData.id;
		delete pictureData.size;
		expect(pictureData).to.eql(testData.picture);
		testData.realname = "Changed during edit";
		user.setRealname(testData.realname);
		let a = user.removePermission(testData.permissions[0]);
		testData.permissions = ["Added during edit"];
		user.addPermission(testData.permissions[0]);
		let newIdentifier = await controller.put(user);
		expect(newIdentifier).to.equal(identifier);
		let user2 = await controller.get(identifier);
		expect(user2).to.be.an.instanceof(User);
		expect(user2.getUsername()).to.equal(testData.username);
		expect(user2.getRealname()).to.equal(testData.realname);
		expect(user2.getPasswordHash()).to.equal(testData.password);
		expect(user2.getTitle()).to.equal(testData.title);
		expect(user2.getActive()).to.equal(testData.active);
		expect(user2.getPermissions()).to.eql(testData.permissions);
		let pictureData2 = user2.getPicture().serialize();
		delete pictureData2.id;
		delete pictureData2.size;
		expect(pictureData2).to.eql(testData.picture);
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
		let user = new User(testData);
		let deleted = await controller.remove(user);
		expect(deleted).to.equal(false); // Non existent
		identifier = await controller.put(user);
		deleted = await controller.remove(user);
		expect(deleted).to.equal(true); // Deleted
		deleted = await controller.remove(user);
		expect(deleted).to.equal(false); // Already deleted
	});
	
	it('Find by username', async () => {
		// Preparation
		let controller = new Controller(env.database());
		let user = new User(testData);
		await controller.put(user);
		
		// Test
		let result = await controller.findByUsername(testData.username);
		expect(result).to.have.lengthOf(1);
		expect(user).to.be.an.instanceof(User);
		expect(result[0].getUsername()).to.equal(testData.username);
		expect(result[0].getRealname()).to.equal(testData.realname);
		expect(result[0].getPasswordHash()).to.equal(testData.password);
		expect(result[0].getTitle()).to.equal(testData.title);
		expect(result[0].getActive()).to.equal(testData.active);
		expect(result[0].getPermissions()).to.eql(testData.permissions);
		await controller.remove(user);
	});
});


