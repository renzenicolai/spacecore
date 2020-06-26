'use strict';

const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;
chai.use(chaiAsPromised);

const env            = require('../test-environment.js');
const Schema         = require('../schemas/user.js');
const FileSchema     = require('../schemas/file.js');
const Session        = require('../models/session.js');
const User           = require('../models/record/user.js');
const Controller     = require('../controllers/user.js');
const View           = require('../views/user.js');


describe('View: user', () => {
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

	it('authenticate without password', async () => {
		let database = env.database();
		let user = new User({
			username: 'test',
			realname: 'test',
			password: null,
			title: 'test',
			enabled: true,
			permissions: [''],
			picture: null
		});
		let controller = new Controller(database);
		await controller.put(user);
		let session = new Session();
		let view = new View(database);
		let successResult = await view.authenticate(session, {username: 'test'});
		expect(successResult).to.be.an('object');
		expect(successResult).to.have.property('username');
		expect(successResult.username).to.equal('test');
		expect(view.authenticate(session, {username: 'test', password: 'wrong'})).to.be.rejectedWith( view.errors.invalid );
		expect(view.authenticate(session, {username: 'wrong'})).to.be.rejectedWith( view.errors.invalid );
		await controller.remove(user);
	});

	it('authenticate with password', async () => {
		let database = env.database();
		let user = new User({
			username: 'test',
			realname: 'test',
			password: '$6$c0aT5tDyxN9DVLEM$Ofun4nZfzQ/g2ySgcUvpPcjlPtW7EKBXL64WrZZNHVEtOPlBm1EyBZySf4QmxViBXWeYOezN7n4R3b8A9mGwe0',
			title: 'test',
			enabled: true,
			permissions: [''],
			picture: null
		});
		let controller = new Controller(database);
		await controller.put(user);
		let session = new Session();
		let view = new View(database);
		let successResult = await view.authenticate(session, {username: 'test', password: 'test'});
		expect(successResult).to.be.an('object');
		expect(successResult).to.have.property('username');
		expect(successResult.username).to.equal('test');
		expect(view.authenticate(session, {username: 'test', password: 'wrong'})).to.be.rejectedWith( view.errors.invalid );
		expect(view.authenticate(session, {username: 'test'})).to.be.rejectedWith( view.errors.invalid );
		expect(view.authenticate(null, {username: 'test'})).to.be.rejectedWith( view.errors.session );
		await controller.remove(user);
	});
	
	it('Edit current user', async () => {
		let database = env.database();
		let user = new User({
			username: 'test',
			realname: 'test',
			password: null,
			title: 'test',
			enabled: true,
			permissions: [''],
			picture: null
		});
		let controller = new Controller(database);
		await controller.put(user);
		let session = new Session();
		let view = new View(database);
		expect(view.editCurrentUser(null, {password: 'changedPassword', realname: 'changedRealname', title: 'changedTitle'})).to.be.rejectedWith(view.errors.session);
		expect(view.editCurrentUser(session, {password: 'changedPassword', realname: 'changedRealname', title: 'changedTitle'})).to.be.rejectedWith(view.errors.session_user);
		session.setUser(user);
		let result = await view.editCurrentUser(session, {password: 'changedPassword', realname: 'changedRealname', title: 'changedTitle'});
		expect(result).to.equal(user.getIdentifier());
		expect(user.getPasswordHash()).to.not.equal(null);
		expect(user.getRealname()).to.equal('changedRealname');
		expect(user.getTitle()).to.equal('changedTitle');
		await controller.remove(user);
	});

	it('List', async () => {
		let database = env.database();
		let userA = new User({
			username: 'testA1',
			realname: 'testA2',
			password: null,
			title: 'testA3',
			enabled: true,
			permissions: [''],
			picture: null
		});
		let userB = new User({
			username: 'testB1',
			realname: 'testB2',
			password: null,
			title: 'testB3',
			enabled: false,
			permissions: [''],
			picture: null
		});
		let userC = new User({
			username: 'testC1',
			realname: 'testC2',
			password: null,
			title: 'testC3',
			enabled: true,
			permissions: [''],
			picture: null
		});
		let controller = new Controller(database);
		await controller.put(userA);
		await controller.put(userB);
		await controller.put(userC);
		let view = new View(database);
		// Find by id
		let findId = await view.listUsers(null, {id: userA.getIdentifier()});
		expect(findId).to.have.lengthOf(1);
		expect(findId[0].username).to.equal('testA1');
		// Find enabled
		let findEnabled = await view.listUsers(null, {enabled: true});
		expect(findEnabled).to.have.lengthOf(2);
		expect(findEnabled[0].username).to.equal('testA1');
		expect(findEnabled[1].username).to.equal('testC1');
		let findDisabled = await view.listUsers(null, {enabled: false});
		expect(findDisabled).to.have.lengthOf(1);
		expect(findDisabled[0].username).to.equal('testB1');
		// Find by username
		let findUsername = await view.listUsers(null, {username: 'testC1'});
		expect(findUsername).to.have.lengthOf(1);
		expect(findUsername[0].username).to.equal('testC1');
		let findUsernameAll = await view.listUsers(null, {username: 'test%'});
		expect(findUsernameAll).to.have.lengthOf(3);
		// Find by realname
		let findRealname = await view.listUsers(null, {realname: 'testC2'});
		expect(findRealname).to.have.lengthOf(1);
		expect(findRealname[0].username).to.equal('testC1');
		let findRealnameAll = await view.listUsers(null, {realname: 'test%'});
		expect(findRealnameAll).to.have.lengthOf(3);
		// Find by title
		let findTitle = await view.listUsers(null, {title: 'testC3'});
		expect(findTitle).to.have.lengthOf(1);
		expect(findTitle[0].username).to.equal('testC1');
		let findTitleAll = await view.listUsers(null, {title: 'test%'});
		expect(findTitleAll).to.have.lengthOf(3);
		await controller.remove(userA);
		await controller.remove(userB);
		await controller.remove(userC);
	});

	it('create', async () => {
		let database = env.database();
		let view = new View(database);
		let identifier = await view.createUser(null, {
			username: 'testUsername',
			passwordHash: 'testHash',
			realname: 'testRealname',
			title: 'testTitle',
			enabled: true,
			permissions: ['test']
		});
		let controller = new Controller(database);
		let user = await controller.get(identifier);
		expect(user.getUsername()).to.equal('testUsername');
		expect(user.getPasswordHash()).to.equal('testHash');
		expect(user.getRealname()).to.equal('testRealname');
		expect(user.getTitle()).to.equal('testTitle');
		expect(user.getEnabled()).to.equal(true);
		expect(user.getPermissions()).to.be.an('array').that.includes('test');
	});

	it('edit', async () => {
		let database = env.database();
		let userA = new User({
			username: 'test',
			realname: 'test',
			password: null,
			title: 'test',
			enabled: true,
			permissions: [''],
			picture: null
		});
		let userB = new User({
			username: 'test2',
			realname: 'test',
			password: null,
			title: 'test',
			enabled: true,
			permissions: [''],
			picture: null
		});
		let controller = new Controller(database);
		let identifier = await controller.put(userA);
		await controller.put(userB);
		let view = new View(database);
		expect(view.editUser(null, {id: 0})).to.be.rejectedWith( view.errors.not_found );
		expect(view.editUser(null, {id: identifier, username: 'test2'})).to.be.rejectedWith( view.errors.username_in_use );
		let result = await view.editUser(null, {
			id: identifier,
			username: 'testUsernameForViewEdit',
			passwordHash: 'testHash',
			realname: 'testRealname',
			title: 'testTitle',
			enabled: true,
			permissions: ['test']
		});
		let user = await controller.get(identifier);
		expect(user.getUsername()).to.equal('testUsernameForViewEdit');
		expect(user.getPasswordHash()).to.equal('testHash');
		expect(user.getRealname()).to.equal('testRealname');
		expect(user.getTitle()).to.equal('testTitle');
		expect(user.getEnabled()).to.equal(true);
		expect(user.getPermissions()).to.be.an('array').that.includes('test');
		await controller.remove(userA);
		await controller.remove(userB);
	});

	it('remove', async () => {
		let database = env.database();
		let view = new View(database);
		let controller = new Controller(database);
		let user = new User({
			username: 'test',
			realname: 'test',
			password: null,
			title: 'test',
			enabled: true,
			permissions: [''],
			picture: null
		});
		let identifier = await controller.put(user);
		let resultA = await view.removeUser(null, identifier);
		expect(resultA).to.equal(true);
		let resultB = await controller.get(identifier);
		expect(resultB).to.equal(null);
		let resultC = await view.removeUser(null, identifier);
		expect(resultC).to.equal(false);
	});
});


