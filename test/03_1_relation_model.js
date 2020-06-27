'use strict';

const clone = require('clone');
const expect = require('chai').expect;
const ImageFile = require('../models/record/file/image.js');
const Relation = require('../models/record/relation.js');
const RelationGroup = require('../models/record/relation/group.js');
const RelationToken = require('../models/record/relation/token.js');


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
	bankaccounts: [
		"testBankaccount"
	],
	emailaddresses: [
		"testEmailaddress"
	],
	phonenumbers: [
		"testPhonenumber"
	],
	groups: [
		
	],
	tokens: [
		
	]
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

describe('Model: relation group', () => {
	it('Create', async () => {
		let group = new RelationGroup(exampleGroupData);
		expect(group.getName()).to.equal(exampleGroupData.name);
		expect(group.getDescription()).to.equal(exampleGroupData.description);
		expect(group.getDefault()).to.equal(exampleGroupData.default);
		expect(group.getPicture()).to.be.an.instanceof(ImageFile);
		expect(group.getPicture().getName()).to.equal(exampleGroupData.picture.name);
	});

	it('Serialize', async () => {
		let group = new RelationGroup(exampleGroupData);
		let serializedGroup = group.serialize();
		expect(serializedGroup.name).to.equal('testName');
		expect(serializedGroup.description).to.equal('testDescription');
		expect(serializedGroup.default).to.equal(false);
		expect(serializedGroup.picture).to.be.an('object');
		expect(serializedGroup.picture.name).to.equal('testGroupPicture');
	});
});

describe('Model: relation token', () => {
	it('Create', async () => {
		let token = new RelationToken(exampleTokenData);
		expect(token.getType()).to.equal(exampleTokenData.type);
		expect(token.getPublic()).to.equal(exampleTokenData.public);
		expect(token.getPrivate()).to.equal(exampleTokenData.private);
	});

	it('Serialize', async () => {
		let token = new RelationToken(exampleTokenData);
		let serializedToken = token.serialize();
		expect(serializedToken.type).to.equal(exampleTokenData.type);
		expect(serializedToken.public).to.equal(exampleTokenData.public);
		expect(serializedToken).to.not.have.property('private');
		let serializedTokenP = token.serialize(true);
		expect(serializedTokenP.type).to.equal(exampleTokenData.type);
		expect(serializedTokenP.public).to.equal(exampleTokenData.public);
		expect(serializedTokenP.private).to.equal(exampleTokenData.private);
	});
});

describe('Model: relation', () => {
	it('Create relation', async () => {
		let relation = new Relation(exampleData);
		expect(relation.getNickname()).to.equal(exampleData.nickname);
		expect(relation.getRealname()).to.equal(exampleData.realname);
		expect(relation.getAddresses()).to.be.an('array').that.includes('testAddress');
		expect(relation.getBankaccounts()).to.be.an('array').that.includes('testBankaccount');
		expect(relation.getEmailaddresses()).to.be.an('array').that.includes('testEmailaddress');
		expect(relation.getPhonenumbers()).to.be.an('array').that.includes('testPhonenumber');
		expect(relation.getPicture()).to.be.an.instanceof(ImageFile);
		expect(relation.getPicture().getName()).to.equal('testAvatar');
	});
	
	it('Serialize', async () => {
		let relation = new Relation(exampleData);
		let serializedRelation = relation.serialize();
		expect(serializedRelation).to.have.property('nickname');
		expect(serializedRelation).to.have.property('realname');
		expect(serializedRelation).to.have.property('picture');
		expect(serializedRelation.nickname).to.equal('testNickname');
		expect(serializedRelation.realname).to.equal('testRealname');
		expect(serializedRelation.picture).to.be.an('object');
		expect(serializedRelation.picture).to.have.property('name');
		expect(serializedRelation.picture.name).to.equal('testAvatar');
		expect(serializedRelation.picture).to.have.property('mime');
		expect(serializedRelation.picture.mime).to.equal('image/jpeg');
		expect(serializedRelation.picture).to.have.property('data');
		expect(serializedRelation.picture.data).to.equal('SGVsbG8gd29ybGQ=');
		expect(serializedRelation.addresses).to.be.an('array').that.includes('testAddress');
		expect(serializedRelation.bankaccounts).to.be.an('array').that.includes('testBankaccount');
		expect(serializedRelation.emailaddresses).to.be.an('array').that.includes('testEmailaddress');
		expect(serializedRelation.phonenumbers).to.be.an('array').that.includes('testPhonenumber');
	});
	
	it('Nickname', async () => {
		let relation = new Relation(exampleData);
		expect(relation.getNickname()).to.equal('testNickname');
		relation.setDirty(false);
		relation.setNickname('Hello world');
		expect(relation.getNickname()).to.equal('Hello world');
		expect(relation.getDirty()).to.equal(true);
	});
	
	it('Realname', async () => {
		let relation = new Relation(exampleData);
		expect(relation.getRealname()).to.equal('testRealname');
		relation.setDirty(false);
		relation.setRealname('Hello world');
		expect(relation.getRealname()).to.equal('Hello world');
		expect(relation.getDirty()).to.equal(true);
	});
});
