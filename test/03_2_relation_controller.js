'use strict';

const expect              = require('chai').expect;
const env                 = require('../test-environment.js');
const Schema              = require('../schemas/relation.js');
const FileSchema          = require('../schemas/file.js');
const Relation            = require('../models/record/relation.js');
const RelationBankaccount = require('../models/record/relation/bankaccount.js');
const RelationGroup       = require('../models/record/relation/group.js');
const RelationToken       = require('../models/record/relation/token.js');
const Controller          = require('../controllers/relation.js');

let exampleBankaccountData = {
	holder: 'S. Daddy',
	iban: 'NL20INGB0001234567',
	bic: 'INGBNL2A'
};

let exampleGroupData = {
	name: 'testName',
	description: 'testDescription',
	default: false,
	picture: {
		name: 'testGroupPicture',
		mime: 'image/jpeg',
		data: 'SGVsbG8gd29ybGQ='
	}
};

let exampleTokenData = {
	type: 'DS1337A',
	public: '1337DEADBEEF',
	private: 'FEED42'
};

let exampleData = {
	nickname: 'testNickname',
	realname: 'testRealname',
	picture: {
		name: 'testAvatar',
		mime: 'image/jpeg',
		data: 'SGVsbG8gd29ybGQ='
	},
	addresses: [
		"testAddress"
	],
	emailaddresses: [
		"testEmail"
	],
	phonenumbers: [
		"testPhonenumber"
	],
	bankaccounts: [
		exampleBankaccountData
	],
	groups: [
		exampleGroupData
	],
	tokens: [
		exampleTokenData
	]
};

let identifier = null; // Identifier passed between the different tests

describe('Controller: relation', function () {
	this.timeout(10000);

	before(async () => {
		env.start();
		let fileSchema = new FileSchema(env.database());
		await fileSchema.create();
		expect((await fileSchema.check()).length).to.equal(0);
		let schema = new Schema(env.database());
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
		let relation = new Relation(exampleData);
		expect(relation.getDirty()).to.equal(true);
		identifier = await controller.put(relation);
		expect(identifier).to.be.a('number');
		expect(identifier).to.be.above(0);
		expect(relation.getDirty()).to.equal(false);
	});

	it('Get', async () => {
		let controller = new Controller(env.database());
		let relation = await controller.get(identifier);
		expect(relation).to.be.an.instanceof(Relation);
		expect(relation.getNickname()).to.equal(exampleData.nickname);
		expect(relation.getRealname()).to.equal(exampleData.realname);
		expect(relation.getAddresses()).to.be.an('array').that.includes(exampleData.addresses[0]);
		expect(relation.getEmailaddresses()).to.be.an('array').that.includes(exampleData.emailaddresses[0]);
		expect(relation.getPhonenumbers()).to.be.an('array').that.includes(exampleData.phonenumbers[0]);
		//FIXME add check for bankaccounts, groups and tokens
		let pictureData = relation.getPicture().serialize();
		delete pictureData.id;
		delete pictureData.size;
		expect(pictureData).to.eql(exampleData.picture);
	});
/*
	it('Edit', async () => {
		let controller = new Controller(env.database());
		let relation = await controller.get(identifier);
		testData.realname = "Changed during edit";
		relation.setRealname(testData.realname);
		let a = relation.removePermission(testData.permissions[0]);
		testData.permissions = ["Added during edit"];
		relation.addPermission(testData.permissions[0]);
		let newIdentifier = await controller.put(relation);
		expect(newIdentifier).to.equal(identifier);
		let relation2 = await controller.get(identifier);
		expect(relation2).to.be.an.instanceof(relation);
		expect(relation2.getrelationname()).to.equal(testData.relationname);
		expect(relation2.getRealname()).to.equal(testData.realname);
		expect(relation2.getPasswordHash()).to.equal(testData.password);
		expect(relation2.getTitle()).to.equal(testData.title);
		expect(relation2.getEnabled()).to.equal(testData.enabled);
		expect(relation2.getPermissions()).to.eql(testData.permissions);
		let pictureData2 = relation2.getPicture().serialize();
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
		let relation = new relation(testData);
		let deleted = await controller.remove(relation);
		expect(deleted).to.equal(false); // Non existent
		identifier = await controller.put(relation);
		deleted = await controller.remove(relation);
		expect(deleted).to.equal(true); // Deleted
		deleted = await controller.remove(relation);
		expect(deleted).to.equal(false); // Already deleted
	});
	
	it('Find by relationname', async () => {
		// Preparation
		let controller = new Controller(env.database());
		let relation = new relation(testData);
		await controller.put(relation);
		
		// Test
		let result = await controller.find(null, testData.relationname);
		expect(result).to.have.lengthOf(1);
		expect(result[0]).to.be.an.instanceof(relation);
		expect(result[0].getrelationname()).to.equal(testData.relationname);
		expect(result[0].getRealname()).to.equal(testData.realname);
		expect(result[0].getPasswordHash()).to.equal(testData.password);
		expect(result[0].getTitle()).to.equal(testData.title);
		expect(result[0].getEnabled()).to.equal(testData.enabled);
		expect(result[0].getPermissions()).to.eql(testData.permissions);
		await controller.remove(relation);
	});*/
});


