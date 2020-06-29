'use strict';

const clone = require('clone');
const expect = require('chai').expect;
const ImageFile = require('../models/record/file/image.js');
const Relation = require('../models/record/relation.js');
const RelationBankaccount = require('../models/record/relation/bankaccount.js');
const RelationGroup = require('../models/record/relation/group.js');
const RelationToken = require('../models/record/relation/token.js');

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

describe('Model: relation bankaccount', () => {
	it('Create', async () => {
		let bankaccount = new RelationBankaccount(exampleBankaccountData);
		expect(bankaccount.getHolder()).to.equal(exampleBankaccountData.holder);
		expect(bankaccount.getIBAN()).to.equal(exampleBankaccountData.iban);
		expect(bankaccount.getBIC()).to.equal(exampleBankaccountData.bic);
	});

	it('Serialize', async () => {
		let bankaccount = new RelationBankaccount(exampleBankaccountData);
		let serializedBankaccount = bankaccount.serialize();
		expect(serializedBankaccount.holder).to.equal(exampleBankaccountData.holder);
		expect(serializedBankaccount.iban).to.equal(exampleBankaccountData.iban);
		expect(serializedBankaccount.bic).to.equal(exampleBankaccountData.bic);
	});
});

describe('Model: relation group', () => {
	it('Create', async () => {
		let group = new RelationGroup(exampleGroupData);
		expect(group.getName()).to.equal(exampleGroupData.name);
		expect(group.getDescription()).to.equal(exampleGroupData.description);
		expect(group.getAddtonew()).to.equal(exampleGroupData.addtonew);
		expect(group.getPicture()).to.be.an.instanceof(ImageFile);
		expect(group.getPicture().getName()).to.equal(exampleGroupData.picture.name);
	});

	it('Serialize', async () => {
		let group = new RelationGroup(exampleGroupData);
		let serializedGroup = group.serialize();
		expect(serializedGroup.name).to.equal('testName');
		expect(serializedGroup.description).to.equal('testDescription');
		expect(serializedGroup.addtonew).to.equal(false);
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
		expect(token.getEnabled()).to.equal(exampleTokenData.enabled);
	});

	it('Serialize', async () => {
		let token = new RelationToken(exampleTokenData);
		let serializedToken = token.serialize();
		expect(serializedToken.type).to.equal(exampleTokenData.type);
		expect(serializedToken.public).to.equal(exampleTokenData.public);
		expect(serializedToken.enabled).to.equal(exampleTokenData.enabled);
		expect(serializedToken).to.not.have.property('private');
		let serializedTokenP = token.serialize(true);
		expect(serializedTokenP.type).to.equal(exampleTokenData.type);
		expect(serializedTokenP.public).to.equal(exampleTokenData.public);
		expect(serializedTokenP.enabled).to.equal(exampleTokenData.enabled);
		expect(serializedTokenP.private).to.equal(exampleTokenData.private);
	});
});

describe('Model: relation', () => {
	it('Create relation', async () => {
		let relation = new Relation(exampleData);
		expect(relation.getNickname()).to.equal(exampleData.nickname);
		expect(relation.getRealname()).to.equal(exampleData.realname);
		expect(relation.getAddresses()).to.be.an('array').that.includes(exampleData.addresses[0]);
		expect(relation.getEmailaddresses()).to.be.an('array').that.includes(exampleData.emailaddresses[0]);
		expect(relation.getPhonenumbers()).to.be.an('array').that.includes(exampleData.phonenumbers[0]);
		expect(relation.getPicture()).to.be.an.instanceof(ImageFile);
		expect(relation.getPicture().getName()).to.equal('testAvatar');
		expect(relation.getBankaccounts()).to.be.an('array').of.length(1);
		expect(relation.getBankaccounts()[0].getHolder()).to.equal(exampleBankaccountData.holder);
		expect(relation.getGroups()).to.be.an('array').of.length(1);
		expect(relation.getGroups()[0].getName()).to.equal(exampleGroupData.name);
		expect(relation.getTokens()).to.be.an('array').of.length(1);
		expect(relation.getTokens()[0].getPublic()).to.equal(exampleTokenData.public);
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
		expect(serializedRelation.addresses).to.be.an('array').that.includes(exampleData.addresses[0]);
		expect(serializedRelation.emailaddresses).to.be.an('array').that.includes(exampleData.emailaddresses[0]);
		expect(serializedRelation.phonenumbers).to.be.an('array').that.includes(exampleData.phonenumbers[0]);
		expect(serializedRelation.bankaccounts).to.be.an('array').of.length(1);
		expect(serializedRelation.bankaccounts[0].holder).to.equal(exampleBankaccountData.holder);
		expect(serializedRelation.groups).to.be.an('array').of.length(1);
		expect(serializedRelation.groups[0].name).to.equal(exampleGroupData.name);
		expect(serializedRelation.tokens).to.be.an('array').of.length(1);
		expect(serializedRelation.tokens[0].public).to.equal(exampleTokenData.public);
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

	it('Picture', async () => {
		let relation = new Relation(exampleData);
		relation.setDirty(false);
		relation.setPicture({
			name: 'newPicture',
			mime: 'image/jpeg',
			data: 'SGVsbG8gd29ybGQ='
		});
		expect(relation.getPicture().getName()).to.equal('newPicture');
		expect(relation.getDirty()).to.equal(true);
	});

	it('Address', async () => {
		let relation = new Relation(exampleData);
		relation.setDirty(false);
		relation.addAddress("newAddress");
		expect(relation.getAddresses()).to.be.an('array').that.includes('testAddress');
		expect(relation.getAddresses()).to.be.an('array').that.includes('newAddress');
		expect(relation.getDirty()).to.equal(true);
		relation.setDirty(false);
		relation.removeAddress("testAddress");
		expect(relation.getAddresses()).to.be.an('array').that.does.not.include('testAddress');
		expect(relation.getAddresses()).to.be.an('array').that.includes('newAddress');
		expect(relation.getDirty()).to.equal(true);
		expect(relation.hasAddress('testAddress')).to.equal(false);
		expect(relation.hasAddress('newAddress')).to.equal(true);
	});

	it('Email address', async () => {
		let relation = new Relation(exampleData);
		relation.setDirty(false);
		relation.addEmailaddress("newEmail");
		expect(relation.getEmailaddresses()).to.be.an('array').that.includes('testEmail');
		expect(relation.getEmailaddresses()).to.be.an('array').that.includes('newEmail');
		expect(relation.getDirty()).to.equal(true);
		relation.setDirty(false);
		relation.removeEmailaddress("testEmail");
		expect(relation.getEmailaddresses()).to.be.an('array').that.does.not.include('testEmail');
		expect(relation.getEmailaddresses()).to.be.an('array').that.includes('newEmail');
		expect(relation.getDirty()).to.equal(true);
		expect(relation.hasEmailaddress('testEmail')).to.equal(false);
		expect(relation.hasEmailaddress('newEmail')).to.equal(true);
	});

	it('Phonenumbers', async () => {
		let relation = new Relation(exampleData);
		relation.setDirty(false);
		relation.addPhonenumber("newPhonenumber");
		expect(relation.getPhonenumbers()).to.be.an('array').that.includes('testPhonenumber');
		expect(relation.getPhonenumbers()).to.be.an('array').that.includes('newPhonenumber');
		expect(relation.getDirty()).to.equal(true);
		relation.setDirty(false);
		relation.removePhonenumber("testPhonenumber");
		expect(relation.getPhonenumbers()).to.be.an('array').that.does.not.include('testPhonenumber');
		expect(relation.getPhonenumbers()).to.be.an('array').that.includes('newPhonenumber');
		expect(relation.getDirty()).to.equal(true);
		expect(relation.hasPhonenumber('testPhonenumber')).to.equal(false);
		expect(relation.hasPhonenumber('newPhonenumber')).to.equal(true);
	});

	it('Bankaccounts', async () => {
		let relation = new Relation(exampleData);
		relation.setDirty(false);
		let bankaccountA = new RelationBankaccount({holder: 'A', iban: 'B', bic: 'C'});
		let bankaccountB = new RelationBankaccount({holder: 'A', iban: 'B', bic: 'C'});
		let bankaccountC = new RelationBankaccount({holder: 'D', iban: 'E', bic: 'F'});
		bankaccountA.setIdentifier(42);
		bankaccountB.setIdentifier(42);
		bankaccountC.setIdentifier(43);
		relation.addBankaccount(bankaccountA);
		expect(relation.getBankaccounts()).to.be.an('array').that.includes(bankaccountA);
		expect(relation.getDirty()).to.equal(true);
		relation.setDirty(false);
		expect(relation.hasBankaccount(bankaccountA)).to.equal(true);
		expect(relation.hasBankaccount(bankaccountB)).to.equal(true);
		expect(relation.hasBankaccount(bankaccountC)).to.equal(false);
		relation.removeBankaccount(bankaccountA);
		expect(relation.getBankaccounts()).to.be.an('array').that.does.not.include(bankaccountA);
		expect(relation.getDirty()).to.equal(true);
	});

	it('Groups', async () => {
		let relation = new Relation(exampleData);
		relation.setDirty(false);
		let groupA = new RelationGroup({name: 'A', description: 'B', addtonew: false, picture: null});
		let groupB = new RelationGroup({name: 'A', description: 'B', addtonew: false, picture: null});
		let groupC = new RelationGroup({name: 'C', description: 'D', addtonew: false, picture: null});
		groupA.setIdentifier(42);
		groupB.setIdentifier(42);
		groupC.setIdentifier(43);
		relation.addGroup(groupA);
		expect(relation.getGroups()).to.be.an('array').that.includes(groupA);
		expect(relation.getDirty()).to.equal(true);
		relation.setDirty(false);
		expect(relation.hasGroup(groupA)).to.equal(true);
		expect(relation.hasGroup(groupB)).to.equal(true);
		expect(relation.hasGroup(groupC)).to.equal(false);
		relation.removeGroup(groupA);
		expect(relation.getGroups()).to.be.an('array').that.does.not.include(groupA);
		expect(relation.getDirty()).to.equal(true);
	});

	it('Tokens', async () => {
		let relation = new Relation(exampleData);
		relation.setDirty(false);
		let tokenA = new RelationToken({type: 'A', enabled: true, public: 'B', private: 'C'});
		let tokenB = new RelationToken({type: 'A', enabled: true, public: 'B', private: 'C'});
		let tokenC = new RelationToken({type: 'D', enabled: true, public: 'E', private: 'F'});
		tokenA.setIdentifier(42);
		tokenB.setIdentifier(42);
		tokenC.setIdentifier(43);
		relation.addToken(tokenA);
		expect(relation.getTokens()).to.be.an('array').that.includes(tokenA);
		expect(relation.getDirty()).to.equal(true);
		relation.setDirty(false);
		expect(relation.hasToken(tokenA)).to.equal(true);
		expect(relation.hasToken(tokenB)).to.equal(true);
		expect(relation.hasToken(tokenC)).to.equal(false);
		relation.removeToken(tokenA);
		expect(relation.getTokens()).to.be.an('array').that.does.not.include(tokenA);
		expect(relation.getDirty()).to.equal(true);
	});
});
