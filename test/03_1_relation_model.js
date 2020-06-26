'use strict';

const clone = require('clone');
const expect = require('chai').expect;
const ImageFile = require('../models/record/file/image.js');
const Relation = require('../models/record/relation.js');

let exampleData = {
	nickname: 'testNickname',
	realname: 'testRealname',
	picture: null,
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

let examplePicture = {
	name: 'testAvatar',
	mime: 'image/jpeg',
	data: 'SGVsbG8gd29ybGQ='
};

let exampleDataWithPictureAsSerializedData = Object.assign(clone(exampleData), {
	picture: examplePicture
});

let exampleDataWithPictureAsImageFile = Object.assign(clone(exampleData), {
	picture: new ImageFile(examplePicture)
});

describe('Model: relation', () => {
	it('Create relation', async () => {
		let relation = new Relation(exampleData);
		expect(relation.getPicture()).to.equal(null);
	});
	
	it('Create relation with picture from ImageFile object', async () => {
		let relation = new Relation(exampleDataWithPictureAsImageFile);
		expect(relation.getPicture().getName()).to.equal('testAvatar');
	});
	
	it('Create relation with picture from serialized image file data', async () => {
		let relation = new Relation(exampleDataWithPictureAsSerializedData);
		expect(relation.getPicture().getName()).to.equal('testAvatar');
	});
	
	it('Serialize', async () => {
		let relation = new Relation(exampleDataWithPictureAsSerializedData);
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
