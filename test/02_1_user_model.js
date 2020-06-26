'use strict';

const clone      = require('clone');
const expect     = require('chai').expect;
const ImageFile  = require('../models/record/file/image.js');
const User       = require('../models/record/user.js');

let exampleData = {
	username: 'testUsername',
	realname: 'testRealname',
	password: null,
	title: 'testTitle',
	enabled: false,
	permissions: [
		'testPermission'
	],
	picture: null
};

let examplePicture = {
	name: 'testPicture',
	mime: 'image/jpeg',
	data: 'SGVsbG8gd29ybGQ='
};

let exampleDataWithPictureAsSerializedData = Object.assign(clone(exampleData), {
	picture: examplePicture
});

let exampleDataWithPictureAsImageFile = Object.assign(clone(exampleData), {
	picture: new ImageFile(examplePicture)
});

let exampleDataWithPassword = Object.assign(clone(exampleData), {
	password: '$6$c0aT5tDyxN9DVLEM$Ofun4nZfzQ/g2ySgcUvpPcjlPtW7EKBXL64WrZZNHVEtOPlBm1EyBZySf4QmxViBXWeYOezN7n4R3b8A9mGwe0' //Hash of 'test'
});

let exampleDataWithPictureAndPassword = Object.assign(clone(exampleData), {
	picture: examplePicture,
	password: '$6$c0aT5tDyxN9DVLEM$Ofun4nZfzQ/g2ySgcUvpPcjlPtW7EKBXL64WrZZNHVEtOPlBm1EyBZySf4QmxViBXWeYOezN7n4R3b8A9mGwe0' //Hash of 'test'
});

describe('Model: user', () => {	
	it('Create', async () => {
		let user = new User(exampleData);
		expect(user.getPicture()).to.equal(null);
	});
	
	it('Create user with password', async () => {
		let user = new User(exampleDataWithPassword);
	});
	
	it('Create user with picture from ImageFile object', async () => {
		let user = new User(exampleDataWithPictureAsImageFile);
		expect(user.getPicture().getName()).to.equal(examplePicture.name);
	});
	
	it('Create user with picture from serialized image file data', async () => {
		let user = new User(exampleDataWithPictureAsSerializedData);
		expect(user.getPicture().getName()).to.equal(examplePicture.name);
	});
	
	it('Serialize', async () => {
		let user = new User(exampleDataWithPictureAndPassword);
		let serializedUser = user.serialize();
		expect(serializedUser).to.have.property('username');
		expect(serializedUser).to.have.property('realname');
		expect(serializedUser).to.not.have.property('password');
		expect(serializedUser).to.have.property('title');
		expect(serializedUser).to.have.property('enabled');
		expect(serializedUser).to.have.property('permissions');
		expect(serializedUser).to.have.property('picture');
		expect(serializedUser.username).to.equal('testUsername');
		expect(serializedUser.title).to.equal('testTitle');
		expect(serializedUser.permissions).to.be.an('array').that.includes('testPermission');
		expect(serializedUser.picture).to.be.an('object');
		expect(serializedUser.picture).to.have.property('name');
		expect(serializedUser.picture.name).to.equal(examplePicture.name);
		expect(serializedUser.picture).to.have.property('mime');
		expect(serializedUser.picture.mime).to.equal(examplePicture.mime);
		expect(serializedUser.picture).to.have.property('data');
		expect(serializedUser.picture.data).to.equal(examplePicture.data);
		let serializedUserWithSecrets = user.serialize(true);
		expect(serializedUserWithSecrets).to.have.property('password');
		expect(serializedUserWithSecrets.password).to.equal(exampleDataWithPassword.password);
	});
	
	it('Username', async () => {
		let user = new User(exampleData);
		expect(user.getUsername()).to.equal('testUsername');
		user.setDirty(false);
		user.setUsername('Hello world');
		expect(user.getUsername()).to.equal('Hello world');
		expect(user.getDirty()).to.equal(true);
	});
	
	it('Realname', async () => {
		let user = new User(exampleData);
		expect(user.getRealname()).to.equal('testRealname');
		user.setDirty(false);
		user.setRealname('Hello world');
		expect(user.getRealname()).to.equal('Hello world');
		expect(user.getDirty()).to.equal(true);
	});
	
	it('Title', async () => {
		let user = new User(exampleData);
		expect(user.getTitle()).to.equal('testTitle');
		user.setDirty(false);
		user.setTitle('Hello world');
		expect(user.getTitle()).to.equal('Hello world');
		expect(user.getDirty()).to.equal(true);
	});
	
	it('Enabled', async () => {
		let user = new User(exampleData);
		expect(user.getEnabled()).to.equal(false);
		user.setDirty(false);
		user.setEnabled(true);
		expect(user.getEnabled()).to.equal(true);
		expect(user.getDirty()).to.equal(true);
	});
	
	it('Permissions set during creation', async () => {
		let user = new User(exampleData);
		expect(user.getPermissions().length).to.equal(1);
		expect(user.getPermissions()[0]).to.equal('testPermission');
	});
	
	it('Add permission', async () => {
		let user = new User(exampleData);
		user.setDirty(false);
		user.addPermission("Hello world");
		expect(user.getPermissions().length).to.equal(2);
		expect(user.getPermissions()[0]).to.equal('testPermission');
		expect(user.getPermissions()[1]).to.equal('Hello world');
		expect(user.getDirty()).to.equal(true);
		user.setDirty(false);
		user.addPermission("Hello world");
		expect(user.getPermissions().length).to.equal(2);
		expect(user.getPermissions()[0]).to.equal('testPermission');
		expect(user.getPermissions()[1]).to.equal('Hello world');
		expect(user.getDirty()).to.equal(false);
	});
	
	it('Remove permission', async () => {
		let user = new User(exampleData);
		user.addPermission("Hello world");
		user.setDirty(false);
		user.removePermission("testPermission");
		expect(user.getPermissions().length).to.equal(1);
		expect(user.getPermissions()[0]).to.equal('Hello world');
		expect(user.getDirty()).to.equal(true);
		user.setDirty(false);
		user.removePermission("nonExistentPermission");
		expect(user.getDirty()).to.equal(false);
	});
	
	it('Check permission', async () => {
		let user = new User(exampleData);
		expect(user.hasPermission("testPermission")).to.equal(true);
		expect(user.hasPermission("nonExistentPermission")).to.equal(false);
	});
	
	it('Authenticate user without password', async () => {
		let user = new User(exampleData);
		expect(user.validatePassword(null)).to.equal(true);
		expect(user.validatePassword('hello')).to.equal(false);
	});
	
	it('Authenticate user with password', async () => {
		let user = new User(exampleDataWithPassword);
		expect(user.validatePassword(null)).to.equal(false);
		expect(user.validatePassword('hello')).to.equal(false);
		expect(user.validatePassword('test')).to.equal(true); // Valid password
	});
});
