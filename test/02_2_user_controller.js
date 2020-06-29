'use strict';

const expect     = require('chai').expect;
const env        = require('../test-environment.js');
const User       = require('../models/record/user.js');
const Controller = require('../controllers/user.js');
const Schema     = require('../schemas/user.js');
const FileSchema = require('../schemas/file.js');


var testData = {
	username: 'testUsername',
	realname: 'testRealname',
	password: '$6$c0aT5tDyxN9DVLEM$Ofun4nZfzQ/g2ySgcUvpPcjlPtW7EKBXL64WrZZNHVEtOPlBm1EyBZySf4QmxViBXWeYOezN7n4R3b8A9mGwe0',
	title: 'testTitle',
	enabled: false,
	permissions: [
		'testPermission'
	],
	picture: {
		name: 'testPicture',
		mime: 'image/jpeg',
		data: 'SGVsbG8gd29ybGQ='
	}
};

describe('Controller: user', function () {
	this.timeout(10000);

	before(async () => {
		env.start();
		let fileSchema = new FileSchema(env.database());
		await fileSchema.drop();
		await fileSchema.create();
		expect((await fileSchema.check()).length).to.equal(0);
		let schema = new Schema(env.database());
		await schema.drop();
		await schema.create();
		expect((await schema.check()).length).to.equal(0);
	});

	after(async () => {
		let schema = new Schema(env.database());
		let fileSchema = new FileSchema(env.database());
		await schema.drop();
		await fileSchema.drop();
		env.stop();
	});

	it('Put', async () => {
		let controller = new Controller(env.database());
		let user = new User(testData);
		expect(user.getDirty()).to.equal(true);
		let identifier = await controller.put(user);
		expect(identifier).to.be.a('number');
		expect(identifier).to.be.above(0);
		expect(user.getDirty()).to.equal(false);
	});
	
	it('Edit', async () => {
		let controller = new Controller(env.database());
		let creatUser = new User(testData);
		let identifier = await controller.put(creatUser);
		let user = await controller.get(identifier);
		expect(user).to.be.an.instanceof(User);
		expect(user.getUsername()).to.equal(testData.username);
		expect(user.getRealname()).to.equal(testData.realname);
		expect(user.getPasswordHash()).to.equal(testData.password);
		expect(user.getTitle()).to.equal(testData.title);
		expect(user.getEnabled()).to.equal(testData.enabled);
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
		expect(user2.getEnabled()).to.equal(testData.enabled);
		expect(user2.getPermissions()).to.eql(testData.permissions);
		let pictureData2 = user2.getPicture().serialize();
		delete pictureData2.id;
		delete pictureData2.size;
		expect(pictureData2).to.eql(testData.picture);
	});
	
	it('Remove by id', async () => {
		let controller = new Controller(env.database());
		let creatUser = new User(testData);
		let identifier = await controller.put(creatUser);
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
		await controller.put(user);
		deleted = await controller.remove(user);
		expect(deleted).to.equal(true); // Deleted
		deleted = await controller.remove(user);
		expect(deleted).to.equal(false); // Already deleted
	});
	
	it('Find by username', async () => {
		// Preparation
		let controller = new Controller(env.database());
		testData.username = 'usernameChangedForFindTest';
		let user = new User(testData);
		await controller.put(user);
		
		// Test
		let result = await controller.find(null, testData.username);
		expect(result).to.have.lengthOf(1);
		expect(result[0]).to.be.an.instanceof(User);
		expect(result[0].getUsername()).to.equal(testData.username);
		expect(result[0].getRealname()).to.equal(testData.realname);
		expect(result[0].getPasswordHash()).to.equal(testData.password);
		expect(result[0].getTitle()).to.equal(testData.title);
		expect(result[0].getEnabled()).to.equal(testData.enabled);
		expect(result[0].getPermissions()).to.eql(testData.permissions);
		await controller.remove(user);
	});
});


