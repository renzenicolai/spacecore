'use strict';

const expect              = require('chai').expect;
const env                 = require('../test-environment.js');
const Schema              = require('../schemas/relation.js');
const FileSchema          = require('../schemas/file.js');
const Relation            = require('../models/record/relation.js');
const Bankaccount         = require('../models/record/relation/bankaccount.js');
const Group               = require('../models/record/relation/group.js');
const Token               = require('../models/record/relation/token.js');
const Controller          = require('../controllers/relation.js');

let exampleBankaccountData = {
	holder: 'S. Daddy',
	iban: 'NL20INGB0001234567',
	bic: 'INGBNL2A'
};

let exampleGroupData = {
	name: 'testName',
	description: 'testDescription',
	addtonew: false,
	picture: {
		name: 'testGroupPicture',
		mime: 'image/jpeg',
		data: 'SGVsbG8gd29ybGQ='
	}
};

let exampleTokenData = {
	type: 'DS1337A',
	public: '1337DEADBEEF',
	private: 'FEED42',
	enabled: true
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

describe('Controller: relation', function () {
	this.timeout(20000);

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
	
	it('Put group', async () => {
		let controller = new Controller(env.database());
		let group = new Group(exampleGroupData);
		expect(group.getDirty()).to.equal(true);
		let identifier = await controller.putGroup(group);
		expect(identifier).to.be.a('number');
		expect(identifier).to.be.above(0);
		expect(group.getDirty()).to.equal(false);
	});

	it('Get group', async () => {
		let controller = new Controller(env.database());
		let createdGroup = new Group(exampleGroupData);
		let identifier = await controller.putGroup(createdGroup);
		let group = await controller.getGroup(identifier);
		expect(group).to.be.an.instanceof(Group);
		expect(group.getName()).to.equal(exampleGroupData.name);
		expect(group.getDescription()).to.equal(exampleGroupData.description);
		expect(group.getAddtonew()).to.equal(exampleGroupData.addtonew);
		let pictureData = group.getPicture().serialize();
		delete pictureData.id;
		delete pictureData.size;
		expect(pictureData).to.eql(exampleGroupData.picture);
	});

	it('Remove group by object', async () => {
		let controller = new Controller(env.database());
		let createdGroup = new Group(exampleGroupData);
		let identifier = await controller.putGroup(createdGroup);
		let resultA = await controller.removeGroup(createdGroup);
		expect(resultA).to.equal(true);
		let resultB = await controller.removeGroup(createdGroup);
		expect(resultB).to.equal(false);
	});

	it('Remove group by identifier', async () => {
		let controller = new Controller(env.database());
		let createdGroup = new Group(exampleGroupData);
		let identifier = await controller.putGroup(createdGroup);
		let resultA = await controller.removeGroup(identifier);
		expect(resultA).to.equal(true);
		let resultB = await controller.removeGroup(identifier);
		expect(resultB).to.equal(false);
	});

	it('Find group by name', async () => {
		// Preparation
		let controller = new Controller(env.database());
		exampleGroupData.name = 'Changed for find by name test';
		let group = new Group(exampleGroupData);
		await controller.putGroup(group);
		
		// Test
		let result = await controller.findGroup(null, exampleGroupData.name);
		expect(result).to.have.lengthOf(1);
		expect(result[0]).to.be.an.instanceof(Group);
		expect(result[0].getDescription()).to.equal(exampleGroupData.description);
		await controller.removeGroup(group);
	});

	it('Put', async () => {
		this.timeout(30000);
		let controller = new Controller(env.database());
		let relation = new Relation(exampleData);
		expect(relation.getDirty()).to.equal(true);
		let identifier = await controller.put(relation);
		expect(identifier).to.be.a('number');
		expect(identifier).to.be.above(0);
		expect(relation.getDirty()).to.equal(false);
	});

	it('Get', async () => {
		let controller = new Controller(env.database());
		let createdRelation = new Relation(exampleData);
		let identifier = await controller.put(createdRelation);
		let relation = await controller.get(identifier);
		expect(relation).to.be.an.instanceof(Relation);
		expect(relation.getNickname()).to.equal(exampleData.nickname);
		expect(relation.getRealname()).to.equal(exampleData.realname);
		expect(relation.getAddresses()).to.be.an('array').that.includes(exampleData.addresses[0]);
		expect(relation.getEmailaddresses()).to.be.an('array').that.includes(exampleData.emailaddresses[0]);
		expect(relation.getPhonenumbers()).to.be.an('array').that.includes(exampleData.phonenumbers[0]);
		expect(relation.getBankaccounts()).to.be.an('array').of.length(1);
		expect(relation.getBankaccounts()[0].getHolder()).to.equal(exampleBankaccountData.holder);
		expect(relation.getGroups()).to.be.an('array').of.length(1);
		expect(relation.getGroups()[0].getName()).to.equal(exampleGroupData.name);
		expect(relation.getTokens()).to.be.an('array').of.length(1);
		expect(relation.getTokens()[0].getPublic()).to.equal(exampleTokenData.public);
		let pictureData = relation.getPicture().serialize();
		delete pictureData.id;
		delete pictureData.size;
		expect(pictureData).to.eql(exampleData.picture);
	});

	it('Remove by object', async () => {
		let controller = new Controller(env.database());
		let createdRelation = new Relation(exampleData);
		let identifier = await controller.put(createdRelation);
		let resultA = await controller.remove(createdRelation);
		expect(resultA).to.equal(true);
		let resultB = await controller.remove(createdRelation);
		expect(resultB).to.equal(false);
	});

	it('Remove by identifier', async () => {
		let controller = new Controller(env.database());
		let createdRelation = new Relation(exampleData);
		let identifier = await controller.put(createdRelation);
		let resultA = await controller.remove(identifier);
		expect(resultA).to.equal(true);
		let resultB = await controller.remove(identifier);
		expect(resultB).to.equal(false);
	});
	
	it('Find by nickname', async () => {
		// Preparation
		let controller = new Controller(env.database());
		exampleData.nickname = 'Changed for find by nickname test';
		let relation = new Relation(exampleData);
		await controller.put(relation);
		
		// Test
		let result = await controller.find(null, exampleData.nickname);
		expect(result).to.have.lengthOf(1);
		expect(result[0]).to.be.an.instanceof(Relation);
		expect(result[0].getRealname()).to.equal(exampleData.realname);
		await controller.remove(relation);
	});
});


