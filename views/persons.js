"use strict";

const Tasks = require('../lib/tasks.js');
const Tokens = require('../lib/tokens.js');
const FileController = require('../controllers/files.js');

class Persons {
	constructor(database, products) {
		this._database = database;
		this._products = products;
		this._fileController = new FileController(database);

		/* Tables */
		this._table               = this._database.table('persons');
		this._table_group         = this._database.table('person_group');
		this._table_group_mapping = this._database.table('person_group_mapping');
		this._table_token         = this._database.table('person_token');
		this._table_bankaccount   = this._database.table('bankaccounts');
		this._table_address       = this._database.table('person_address');
		this._table_email         = this._database.table('person_email');
		this._table_phone         = this._database.table('person_phone');
	}

	/* Persons */

	_getGroups(person_id) {
		return this._table_group_mapping.selectRecordsRaw("SELECT mapping.id as 'mapping_id', group.id, group.name, group.description FROM `person_group_mapping` AS `mapping` INNER JOIN `person_group` AS `group` ON mapping.person_group_id = group.id WHERE `person_id` = ?", [person_id], false);
	}

	async _getTokens(person_id) {
		var persons = await this._table_token.list({person_id: person_id});
		var tasks = [
			Tasks.create('type', this._getTokenType.bind(this), persons, 'type')
		];
		return Tasks.merge(tasks, persons);
	}

	_getBankaccounts(person_id) {
		return this._table_bankaccount.list({person_id: person_id});
	}

	_getAddresses(person_id) {
		return this._table_address.list({person_id: person_id});
	}

	_getEmail(person_id) {
		return this._table_email.list({person_id: person_id});
	}

	_getPhone(person_id) {
		return this._table_phone.list({person_id: person_id});
	}

	_getPersons(person_id) {
		return this._table.list({id: person_id},"OR");
	}

	async _getSinglePerson(person_id) {
		var result = await this._table.list({id: person_id});
		if (result.length !== 1) return null;
		return result[0];
	}

	async _getPersonsInGroup(person_group_id) {
		var mapping = await this._table_group_mapping.list({person_group_id: person_group_id});
		var persons = [];
		for (var i in mapping) {
			persons.push(mapping[i].person_id);
		}
		if (persons.length < 1) return [];
		return this._getPersons(persons);
	}

	async _getTokenType(token_type) {
		return Tokens.getType(token_type);
	}
	
	async _createFileFromPostData(file) {
		if (typeof file !== 'object') throw 'File parameter should be an object';
		if (typeof file.data !== 'string') throw 'Data should be a base64 encoded string';
		if (typeof file.mime !== 'string')  throw 'MIME type missing';
		if (typeof file.name !== 'string')  throw 'Name missing';
		return this._fileController.createFromBase64(file.name, file.mime, file.data);
	}
	
	async _getFileAndSerialize(identifier) {
		let record = await this._fileController.get(identifier);
		let result = null;
		if (record !== null) {
			result = record.serialize();
		}
		return result;
	}

	async list(session, params) {
		var persons = await this._table.list(params);
		var tasks = [
			Tasks.create('avatar',       this._getFileAndSerialize.bind(this), persons, 'avatar_id'),
			Tasks.create('groups',       this._getGroups.bind(this),                              persons, 'id'),
			Tasks.create('bankaccounts', this._getBankaccounts.bind(this),                        persons, 'id'),
			Tasks.create('tokens',       this._getTokens.bind(this),                              persons, 'id'),
			Tasks.create('addresses',    this._getAddresses.bind(this),                           persons, 'id'),
			Tasks.create('email',        this._getEmail.bind(this),                               persons, 'id'),
			Tasks.create('phone',        this._getPhone.bind(this),                               persons, 'id')
		];
		return Tasks.merge(tasks, persons);
	}
	
	async listForVending(session, params) { //Limited version of the normal list function
		var persons = await this._table.list(params);
		var tasks = [
			Tasks.create('avatar',       this._getFileAndSerialize.bind(this), persons, 'avatar_id'),
			Tasks.create('groups',       this._getGroups.bind(this),                              persons, 'id')
		];
		return Tasks.merge(tasks, persons);
	}
	
	async listForVendingNoAvatar(session, params) { //Limited version of the normal list function
		var persons = await this._table.list(params);
		var tasks = [
			Tasks.create('groups',       this._getGroups.bind(this),                              persons, 'id')
		];
		return Tasks.merge(tasks, persons);
	}

	async create(session, params) {
		var nick_name = "";
		var first_name = "";
		var last_name = "";
		var avatar = null;

		if (typeof params === "string") {
			nick_name = params.toLowerCase();
			first_name = params;
		} else if ((typeof params === "object") && (typeof params.nick_name === "string")) {
			nick_name = params.nick_name.toLowerCase();
			first_name = params.nick_name;
			if (typeof params.first_name === "string") first_name = params.first_name;
			if (typeof params.last_name  === "string") last_name  = params.last_name;
			if (typeof params.avatar === "object") avatar = params.avatar;
		} else {
			throw "Invalid parameters supplied";
		}

		var checks = await Promise.all([
			this.list(session, {nick_name: nick_name}),
			this._products.find(session, nick_name)
		]);

		if (checks[0].length > 0) throw "This nickname exists already!";
		if (checks[1].length > 0) throw "This nickname would conflict with a product!";

		var defaultGroups = await this.listGroups(session, {addToNew:1});
		var dbTransaction = await this._database.transaction("Add person ("+nick_name+")");
		var personRecord = this._table.createRecord();

		personRecord.setField("nick_name", nick_name);
		personRecord.setField("first_name", first_name);
		personRecord.setField("last_name", last_name);
		personRecord.setField("balance", 0);

		try {
			if (Array.isArray(avatar) && (avatar.length > 0)) {
				var avatarRecord = await this._createFileFromPostData(avatar[0]);
				await this._fileController.put(avatarRecord, dbTransaction);
				personRecord.setField('avatar_id', avatarRecord.getIdentifier());
			}

			await personRecord.flush(dbTransaction);

			var groupMappingPromises = [];
			for (var i in defaultGroups) {
				var mappingRecord = this._table_group_mapping.createRecord();
				mappingRecord.setField("person_group_id", defaultGroups[i].id);
				mappingRecord.setField("person_id", personRecord.getIndex());
				groupMappingPromises.push(mappingRecord.flush(dbTransaction));
			}

			await Promise.all(groupMappingPromises);
		} catch (e) {
			await dbTransaction.rollback();
			throw e;
		}

		await dbTransaction.commit();
		
		return personRecord.getIndex();
	}

	async _findById(params) {
		var id = null;
		if (typeof params === 'number') {
			id = params;
		} else if ((typeof params === 'object') && (typeof params.id === 'number')) {
			id = params.id;
		} else {
			throw "Invalid parameters";
		}

		var result = await this._table.selectRecords({id: id});
		if (result.length !== 1) throw "Person not found.";

		return result[0];
	}

	async edit(session, params) {
		if (typeof params !== 'object') throw "Invalid parameters";
		
		var person = await this._findById(params);

		if (typeof params.first_name === 'string') {
			person.setField('first_name', params.first_name);
		} else if (typeof params.first_name !== 'undefined') {
			throw "'first_name' parameter has invalid type, must be string!";
		}

		if (typeof params.last_name === 'string') {
			person.setField('last_name', params.last_name);
		} else if (typeof params.last_name !== 'undefined') {
			throw "'last_name' parameter has invalid type, must be string!";
		}

		if (typeof params.nick_name === 'string') {
			person.setField('nick_name', params.nick_name.toLowerCase());
		} else if (typeof params.nick_name !== 'undefined') {
			throw "'nick_name' parameter has invalid type, must be string!";
		}

		if ((typeof params.avatar === 'object') && Array.isArray(params.avatar) && (params.avatar.length > 0)) {
			var avatarRecord = await this._createFileFromPostData(params.avatar[0]);
			await this._fileController.put(avatarRecord);
			person.setField('avatar_id', avatarRecord.getIdentifier());
		}

		return person.flush();
	}

	async _removeAll(person, table, transaction = null) {
		var records = await table.selectRecords({person_id: person.getIndex()});
		var operations = [];
		for (var i in records) operations.push(records[i].destroy(transaction));
		return Promise.all(operations);
	}

	async remove(session, params) {
		var person = await this._findById(params);
		var dbTransaction = await this._database.transaction("Remove person #"+person.getIndex());

		try {
			await this._removeAll(person, this._table_group_mapping, dbTransaction); //Delete all group associations
			await this._removeAll(person, this._table_token,         dbTransaction); //Delete all tokens
			await this._removeAll(person, this._table_bankaccount,   dbTransaction); //Delete all bankaccounts
			await this._removeAll(person, this._table_address,       dbTransaction); //Delete all bankaccounts
			await this._removeAll(person, this._table_email,         dbTransaction); //Delete all email addresses
			await this._removeAll(person, this._table_phone,         dbTransaction); //Delete all phonenumbers
			await person.destroy(dbTransaction);                                     //Delete the person itself
			await dbTransaction.commit();                                            //Commit the transaction
		} catch (e) {
			await dbTransaction.rollback();                                          //Cancel the transaction
			console.log("Could not remove person:",e);
			throw "Can not remove this person!";
		}
		return true;
	}

	async find(session, params) {
		if (typeof params !== 'string') throw "Parameter should be the nickname as a string!";
		var results = await this.list(session, {nick_name: params.toLowerCase()});
		if (results.length < 1) return null;
		if (results.length > 1) throw "Multiple persons with the same nickname found, please check the database.";
		return results[0];
	}
	
	async findForVending(session, params) {
		if (typeof params !== 'string') throw "Parameter should be the nickname as a string!";
		var results = await this.listForVending(session, {nick_name: params.toLowerCase()});
		if (results.length < 1) return null;
		if (results.length > 1) throw "Multiple persons with the same nickname found, please check the database.";
		return results[0];
	}

	async findByToken(session, params) {
		if (typeof params !== 'string') throw "Parameter should be the token as a string!";
		var tokens = await this._table_token.list({public: params});
		if (tokens.length < 1) return null;
		if (tokens.length > 1) throw "Multiple tokens with the same public key found, please check the database.";
		var results = await this.list(session, {id: tokens[0].person_id});
		if (results.length < 1) return null;
		if (results.length > 1) throw "Multiple persons with the same id found, please check the database.";
		return results[0];
	}
	
	async findByTokenForVending(session, params) {
		if (typeof params !== 'string') throw "Parameter should be the token as a string!";
		var tokens = await this._table_token.list({public: params});
		if (tokens.length < 1) return null;
		if (tokens.length > 1) throw "Multiple tokens with the same public key found, please check the database.";
		var results = await this.listForVending(session, {id: tokens[0].person_id});
		if (results.length < 1) return null;
		if (results.length > 1) throw "Multiple persons with the same id found, please check the database.";
		return results[0];
	}

	async addTokenToPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.person !== 'number') ||
			(typeof params.type   !== 'number') ||
			(typeof params.public !== 'string') ||
			(typeof params.enabled !== 'boolean')
		) throw "Invalid parameters";

		var type = await Tokens.getType(params.type);
		
		if (typeof type !== 'object') throw "Invalid token type";

		var record = this._table_token.createRecord();
		record.setField("person_id", params.person);
		record.setField("type", params.type);
		record.setField("public", params.public);
		record.setField("enabled", params.enabled);
		if (type.requirePrivate) {
			if ((typeof params.private !== 'string') || (params.private.length < 1)) {
				throw "Private key is required for this type of key!";
			}
			record.setField("private", params.private);
		}
		return record.flush();
	}
	
	async editTokenOfPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.id !== 'number')
		) throw "Invalid parameters";
		var record = await this._table_token.selectRecords({id: params.id});
		if (record.length !== 1) throw "Token not found.";
		record = record[0];
		if (typeof params.type    === 'number')  record.setField("type",    params.type);
		if (typeof params.public  === 'string')  record.setField("public",  params.public);
		if (typeof params.private === 'string')  record.setField("private", params.private);
		if (typeof params.enabled === 'boolean') record.setField("enabled", params.enabled);
		return record.flush();
	}
	
	async removeTokenFromPerson(session, params) {
		return this._removeRecordFromPerson(this._table_token, params);
	}

	async addBankaccountToPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.person !== 'number') ||
			(typeof params.name !== 'string') ||
			(typeof params.iban !== 'string')
		) throw "Invalid parameters";

		var record = this._table_bankaccount.createRecord();
		record.setField("person_id", params.person);
		record.setField("name", params.name);
		record.setField("iban", params.iban);
		record.setField("internal", false);
		return record.flush();
	}
	
	async editBankaccountOfPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.id !== 'number')
		) throw "Invalid parameters";
		var record = await this._table_bankaccount.selectRecords({id: params.id});
		if (record.length !== 1) throw "Bankaccount not found.";
		record = record[0];
		if (record.getField("internal")) throw "Database error: this is not a persons bankaccount!";
		if (typeof params.iban === 'string') record.setField("iban", params.iban);
		if (typeof params.name === 'string') record.setField("name", params.name);
		return record.flush();
	}
	
	async removeBankaccountFromPerson(session, params) {
		return this._removeRecordFromPerson(this._table_bankaccount, params);
	}

	async addAddressToPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.person !== 'number') ||
			(typeof params.street !== 'string') ||
			(typeof params.housenumber !== 'string') ||
			(typeof params.postalcode !== 'string') ||
			(typeof params.city !== 'string')
		) throw "Invalid parameters";

		var record = this._table_address.createRecord();
		record.setField("person_id", params.person);
		record.setField("street", params.street);
		record.setField("housenumber", params.housenumber);
		record.setField("postalcode", params.postalcode);
		record.setField("city", params.city);
		return record.flush();
	}
	
	async editAddressOfPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.id !== 'number')
		) throw "Invalid parameters";
		var record = await this._table_address.selectRecords({id: params.id});
		if (record.length !== 1) throw "Address not found.";
		record = record[0];
		if (typeof params.street      === 'string') record.setField("street",      params.street);
		if (typeof params.housenumber === 'string') record.setField("housenumber", params.housenumber);
		if (typeof params.postalcode  === 'string') record.setField("postalcode",  params.postalcode);
		if (typeof params.city        === 'string') record.setField("city",        params.city);
		return record.flush();
	}
	
	async removeAddressFromPerson(session, params) {
		return this._removeRecordFromPerson(this._table_address, params);
	}
	
	async addEmailToPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.person !== 'number') ||
			(typeof params.address !== 'string')
		) throw "Invalid parameters";

		var record = this._table_email.createRecord();
		record.setField("person_id", params.person);
		record.setField("address", params.address);
		return record.flush();
	}
	
	async editEmailOfPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.id !== 'number')
		) throw "Invalid parameters";
		var record = await this._table_email.selectRecords({id: params.id});
		if (record.length !== 1) throw "Email address not found.";
		record = record[0];
		if (typeof params.address === 'string') record.setField("address", params.address);
		return record.flush();
	}
	
	async removeEmailFromPerson(session, params) {
		return this._removeRecordFromPerson(this._table_email, params);
	}
	
	async addPhoneToPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.person !== 'number') ||
			(typeof params.phonenumber !== 'string')
		) throw "Invalid parameters";

		var record = this._table_phone.createRecord();
		record.setField("person_id", params.person);
		record.setField("phonenumber", params.phonenumber);
		return record.flush();
	}
	
	async editPhoneOfPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.id !== 'number')
		) throw "Invalid parameters";
		var record = await this._table_phone.selectRecords({id: params.id});
		if (record.length !== 1) throw "Phonenumber not found.";
		record = record[0];
		if (typeof params.phonenumber === 'string') record.setField("phonenumber", params.phonenumber);
		return record.flush();
	}
	
	async removePhoneFromPerson(session, params) {
		return this._removeRecordFromPerson(this._table_phone, params);
	}
	
	async _removeRecordFromPerson(table, params) {
		if ((typeof params        !== 'object') ||
			(typeof params.person !== 'number') ||
			(typeof params.id     !== 'number')
		) throw "Invalid parameters";

		var records = await table.selectRecords({person_id: params.person, id: params.id});
		if (records.length < 1) return false;

		for (var i in records) {
			await records[i].destroy();
		}
		return true;
	}

	async addGroupToPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.person !== 'number') ||
			(typeof params.group !== 'number')
		) throw "Invalid parameters";

		var existingRecords = await this._table_group_mapping.list({
			person_id: params.person,
			person_group_id: params.group
		});
		
		if (existingRecords.length > 0) {
			throw "The person is already in the group!";
		}

		var record = this._table_group_mapping.createRecord();
		record.setField("person_id", params.person);
		record.setField("person_group_id", params.group);
		return record.flush();
	}

	async removeGroupFromPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.person !== 'number') ||
			(typeof params.group !== 'number')
		) throw "Invalid parameters";

		var results = await this._table_group_mapping.selectRecords({
			person_id: params.person,
			person_group_id: params.group
		});

		if (results.length < 1) throw "The person is not in the group!";

		var tasks = [];
		for (var i in results) tasks.push(results[i].destroy());
		return Promise.all(tasks);
	}

	/* Tokens */
	async listTokenTypes(session, params) {
		return Tokens.listTypes();
	}
	
	async getTokenDb(session, params) {
		var tokens = await this._table_token.list(null);
		var tasks = [
			Tasks.create('person', this._getSinglePerson.bind(this), tokens, 'person_id'),
			Tasks.create('type',   this._getTokenType.bind(this),    tokens, 'type')
		];
		var database = await Tasks.merge(tasks, tokens);
		
		var lockomaticDb = {};
		
		for (var i = 0; i < database.length; i++) {
			var token = database[i];
			if ((token.type.id === 0) && (token.enabled)) { //Id only iButton that is enabled
				var entry = [{type:"id", name: token.person.nick_name, mail: "", org:"", role:"Member"}];
				lockomaticDb[token.public] = entry;
			}
		}
		
		console.log(lockomaticDb);
		
		return lockomaticDb;
	}

	/* Groups */

	async listGroups(session, params) {
		var groups = await this._table_group.list(params);
		var tasks = [
			Tasks.create('persons', this._getPersonsInGroup.bind(this), groups, 'id')
		];
		return Tasks.merge(tasks, groups);
	}

	async createGroup(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.name !== 'string') ||
			(typeof params.description !== 'string') ||
			(typeof params.default !== 'boolean')
		) throw "Invalid parameters";

		var record = this._table_group.createRecord();
		record.setField('name', params.name);
		record.setField('description', params.description);
		record.setField('addToNew', params.default);

		return record.flush();
	}

	async editGroup(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.id !== 'number')
		) throw "Invalid parameters";

		var result = await this._table_group.selectRecords({
			id: params.id
		});

		if (result.length !== 1) {
			throw "Group not found.";
		}

		result = result[0]; //We expect to find only one result, because we select using a unique column.

		if (typeof params.name === 'string') {
			result.setField('name', params.name);
		} else if (typeof params.name !== 'undefined') {
			throw "'name' parameter has invalid type, must be string!";
		}

		if (typeof params.description === 'string') {
			result.setField('description', params.description);
		} else if (typeof params.description !== 'undefined') {
			throw "'description' parameter has invalid type, must be string!";
		}

		if (typeof params.default === 'boolean') {
			result.setField('addToNew', params.default);
		} else if (typeof params.default !== 'undefined') {
			throw "'default' parameter has invalid type, must be boolean!";
		}

		return result.flush();
	}

	async removeGroup(session, params) {
		var force = false;
		var id = null;
		if (typeof params === 'number') {
			id = params;
		} else if ((typeof params === 'object') && (typeof params.id === 'number')) {
			id = params.id;
			if (typeof params.force === 'boolean') force = params.force;
		} else {
			throw "Invalid parameters";
		}

		var result = await this._table_group.selectRecords({
			id: id
		});

		if (result.length !== 1) {
			throw "Group not found.";
		}

		result = result[0]; //We expect to find only one result, because we select using a unique column.

		/* Persons in group */

		var personsInGroup = await this._table_group_mapping.selectRecords({
			person_group_id: id
		});

		var dbTransaction = await this._database.transaction("removeGroup-"+id);

		if (personsInGroup.length > 0) {
			var personsInGroupOperations = [];
			if (force) {
				for (var i in personsInGroup) {
					personsInGroupOperations.push(personsInGroup[i].destroy(dbTransaction));
				}
				await Promise.all(personsInGroupOperations);
			} else {
				dbTransaction.rollback();
				throw "The group was not removed because it contains persons.";
			}
		}

		await result.destroy(dbTransaction); //Delete the group itself
		await dbTransaction.commit(); //Commit the full transaction
		return true;
	}

	async listTokens(session, params) {
		var tokens = await this._table_token.list(params);
		var tasks = [
			Tasks.create('person', this._getSinglePerson.bind(this), tokens, 'person_id'),
			Tasks.create('type',   this._getTokenType.bind(this),    tokens, 'type')
		];
		return Tasks.merge(tasks, tokens);
	}

	/* Exported helper functions */

	select(where={}, extra="", separator="AND") {
		return this._table.selectRecords(where, extra, separator);
	}

	getRecord(id) {
		return this._table.selectRecords({id: id}).then((result) => {
			if (result.length !== 1) return Promise.reject("Invalid id.");
			return Promise.resolve(result[0]);
		});
	}

	/* RPC function registration */

	registerRpcMethods(rpc, prefix="person") {
		if (prefix!=="") prefix = prefix + "/";

		/*
		 * Persons: list
		 *
		 * Retrieve a list of persons that fits the supplied query
		 * 
		 */
		rpc.addMethod(
			prefix+"list",
			this.list.bind(this),
			[
				{
					name: 'query',
					type: 'any',
					description: 'Database query'
				}
			]
		);

		/*
		 * Persons: list for vending
		 *
		 * Retrieve a list of persons that fits the supplied query
		 * Without sensitive information
		 * 
		 */
		rpc.addMethod(
			prefix+"listForVending",
			this.listForVending.bind(this),
			[
				{
					name: 'query',
					type: 'any',
					description: 'Database query'
				}
			]
		);

		/*
		 * Persons: list for vending without avatar
		 *
		 * Retrieve a list of persons that fits the supplied query
		 * Without sensitive information or avatars
		 * 
		 */
		rpc.addMethod(
			prefix+"listForVendingNoAvatar",
			this.listForVendingNoAvatar.bind(this),
			[
				{
					name: 'query',
					type: 'any',
					description: 'Database query'
				}
			]
		);

		/*
		 * Persons: create
		 *
		 * Create a person
		 * 
		 */
		rpc.addMethod(
			prefix+"create",
			this.create.bind(this),
			[
				{
					type: 'string',
					desciption: 'Nickname of the person to be created'
				},
				{
					type: 'object',
					desciption: 'Object describing the person to be created',
					required: {
						nick_name: {
							type: 'string',
							description: 'Nickname of the person'
						}
					},
					optional: {
						first_name: {
							type: 'string',
							description: 'Fist name of the person'
						},
						last_name: {
							type: 'string',
							description: 'Last name of the person'
						},
						avatar: {
							type: 'object',
							description: 'Avatar of the person (file object)',
							required: {
								mime: {
									type: 'string'
								},
								name: {
									type: 'string'
								},
								data: {
									type: 'string'
								}
							}
						}
					}
				}
			]
		);

		/*
		 * Persons: edit
		 *
		 * Edit a person
		 * 
		 */
		rpc.addMethod(
			prefix+"edit",
			this.edit.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the changes to be made to the person',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the person to be edited'
						}
					},
					optional: {
						nick_name: {
							type: 'string',
							description: 'Nickname of the person'
						},
						first_name: {
							type: 'string',
							description: 'First name of the person'
						},
						last_name: {
							type: 'string',
							description: 'Last name of the person'
						},
						avatar: {
							type: 'object',
							description: 'Avatar of the person (file object)',
							required: {
								mime: {
									type: 'string'
								},
								name: {
									type: 'string'
								},
								data: {
									type: 'string'
								}
							}
						}
					}
				}
			]
		);

		/*
		 * Persons: remove
		 *
		 * Delete a person
		 * 
		 */
		rpc.addMethod(
			prefix+"remove",
			this.remove.bind(this),
			{
				type: 'number',
				description: 'Identifier of the person to be removed'
			},
			{
				type: 'object',
				required: {
					type: 'number',
					description: 'Identifier of the person to be removed'
				}
			}
		);
		
		/*
		 * Persons: find
		 *
		 * Find a person by nickname
		 * 
		 */
		rpc.addMethod(
			prefix+"find",
			this.find.bind(this),
			[
				{
					type: 'string',
					description: 'Nickname of the person'
				}
			]
		);

		/*
		 * Persons: find for vending
		 *
		 * Find a person by nickname
		 * Without sensitive information
		 * 
		 */
		rpc.addMethod(
			prefix+"findForVending",
			this.findForVending.bind(this),
			[
				{
					type: 'string',
					description: 'Nickname of the person'
				}
			]
		);

		/*
		 * Persons: find by token
		 *
		 * Find a person by token
		 * 
		 */
		rpc.addMethod(
			prefix+"findByToken",
			this.findByToken.bind(this),
			[
				{
					type: 'string',
					description: 'Token number'
				}
			]
		);

		/*
		 * Persons: find by token
		 *
		 * Find a person by token
		 * Without sensitive information
		 * 
		 */
		rpc.addMethod(
			prefix+"findByTokenForVending",
			this.findByTokenForVending.bind(this),
			[
				{
					type: 'string',
					description: 'Token number'
				}
			]
		);
		
		/*
		 * Tokens: add
		 *
		 * Add a token to a person
		 * 
		 */
		rpc.addMethod(
			prefix+"addToken",
			this.addTokenToPerson.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the token and the person to add it to',
					required: {
						person: {
							type: 'number',
							description: 'Identifier of the person that the token will be added to'
						},
						type: {
							type: 'number',
							description: 'Identifier of the type of the token'
						},
						public: {
							type: 'string',
							description: 'Public key of the token'
						},
						enabled: {
							type: 'boolean',
							description: 'Flag that determines if the token is enabled for use'
						}
					},
					optional: {
						private: {
							type: 'string',
							description: 'Private key of the token'
						}
					}
				}
			]
		);

		/*
		 * Tokens: edit
		 *
		 * Edit a token
		 * 
		 */
		rpc.addMethod(
			prefix+"editToken",
			this.editTokenOfPerson.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the token to be edited',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the token to edit'
						}
					},
					optional: {
						type: {
							type: 'number',
							description: 'Type of the token (0: generic iButton, 1: iButton with SHA1, 2: generic NFC tag)'
						},
						public: {
							type: 'string',
							description: 'Public key of the token'
						},
						enabled: {
							type: 'boolean',
							description: 'Flag that determines if the token is enabled for use'
						},
						private: {
							type: 'string',
							description: 'Private key of the token'
						}
					}
				}
			]
		);

		/*
		 * Tokens: remove
		 *
		 * Delete a token
		 * 
		 */
		rpc.addMethod(
			prefix+"removeToken",
			this.removeTokenFromPerson.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the token to be removed and the person to remove it from',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the token'
						},
						person: {
							type: 'number',
							description: 'Identifier of the person'
						}
					}
				}
			]
		);
		
		/*
		 * Bankaccount: add
		 *
		 * Add a bankaccount to a person
		 * 
		 */
		rpc.addMethod(
			prefix+"addBankaccount",
			this.addBankaccountToPerson.bind(this),
			[
				{
					type: 'object',
					required: {
						person: {
							type: 'number',
							description: 'Identifier of the person the bankaccount will be added to'
						},
						iban: {
							type: 'string',
							description: 'IBAN account number'
						},
						name: {
							type: 'string',
							description: 'Name of the account holder'
						}
					}
				}
			]
		);

		/*
		 * Bankaccount: edit
		 *
		 * Edit a bankaccount
		 * 
		 */
		rpc.addMethod(
			prefix+"editBankaccount",
			this.editBankaccountOfPerson.bind(this),
			[
				{
					type: 'object',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the bankaccount'
						}
					},
					optional: {
						iban: {
							type: 'string',
							description: 'IBAN account number'
						},
						name: {
							type: 'string',
							description: 'Name of the account holder'
						}
					}
				}
			]
		);

		/*
		 * Bankaccount: remove
		 *
		 * Delete a bankaccount
		 * 
		 */
		rpc.addMethod(
			prefix+"removeBankaccount",
			this.removeBankaccountFromPerson.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the baknaccount to be removed and the person to remove it from',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the bankaccount'
						},
						person: {
							type: 'number',
							description: 'Identifier of the person'
						}
					}
				}
			]
		);
		
		/*
		 * Address: add
		 *
		 * Add an address to a person
		 *
		 */
		rpc.addMethod(
			prefix+"addAddress",
			this.addAddressToPerson.bind(this),
			[
				{
					type: 'object',
					required: {
						person: {
							type: 'number',
							description: 'Identifier of the person'
						},
						street: {
							type: 'string',
							desciption: 'Street'
						},
						housenumber: {
							type: 'string',
							desciption: 'Housenumber'
						},
						postalcode: {
							type: 'string',
							desciption: 'Postal code'
						},
						city: {
							type: 'string',
							desciption: 'City'
						}
					}
				}
			]
		);

		/*
		 * Address: edit
		 *
		 * Edit an address of a person
		 *
		 */
		rpc.addMethod(
			prefix+"editAddress",
			this.editAddressOfPerson.bind(this),
			[
				{
					type: 'object',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the address'
						}
					},
					optional: {
						street: {
							type: 'string',
							desciption: 'Street'
						},
						housenumber: {
							type: 'string',
							desciption: 'Housenumber'
						},
						postalcode: {
							type: 'string',
							desciption: 'Postal code'
						},
						city: {
							type: 'string',
							desciption: 'City'
						}
					}
				}
			]
		);

		/*
		 * Address: remove
		 *
		 * Remove an address from a person
		 *
		 */
		rpc.addMethod(
			prefix+"removeAddress",
			this.removeAddressFromPerson.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the address to be removed and the person to remove it from',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the address'
						},
						person: {
							type: 'number',
							description: 'Identifier of the person'
						}
					}
				}
			]
		);
		
		/*
		 * E-mail: add
		 *
		 * Add an e-mail address to a person
		 *
		 */
		rpc.addMethod(
			prefix+"addEmail",
			this.addEmailToPerson.bind(this),
			[
				{
					type: 'object',
					required: {
						person: {
							type: 'number',
							description: 'Identifier of the person'
						},
						address: {
							type: 'string',
							desciption: 'Email address'
						}
					}
				}
			]
		);

		/*
		 * E-mail: edit
		 *
		 * Edit an e-mail address of a person
		 *
		 */
		rpc.addMethod(
			prefix+"editEmail",
			this.editEmailOfPerson.bind(this),
			[
				{
					type: 'object',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the email address'
						}
					},
					optional: {
						address: {
							type: 'string',
							description: 'Email address'
						}
					}
				}
			]
		);

		/*
		 * E-mail: remove
		 *
		 * Remove an e-mail address from a person
		 *
		 */
		rpc.addMethod(
			prefix+"removeEmail",
			this.removeEmailFromPerson.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the email address to be removed and the person to remove it from',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the email address'
						},
						person: {
							type: 'number',
							description: 'Identifier of the person'
						}
					}
				}
			]
		);
		
		/*
		 * Phone: add
		 *
		 * Add a phonenumber to a person
		 *
		 */
		rpc.addMethod(
			prefix+"addPhone",
			this.addPhoneToPerson.bind(this),
			[
				{
					type: 'object',
					required: {
						person: {
							type: 'number',
							description: 'Identifier of the person'
						},
						phonenumber: {
							type: 'string',
							desciption: 'Phonenumber'
						}
					}
				}
			]
		);

		/*
		 * Phone: edit
		 *
		 * Edit a phonenumber of a person
		 *
		 */
		rpc.addMethod(
			prefix+"editPhone",
			this.editPhoneOfPerson.bind(this),
			[
				{
					type: 'object',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the phonenumber'
						}
					},
					optional: {
						phonenumber: {
							type: 'string',
							description: 'Phonenumber'
						}
					}
				}
			]
		);

		/*
		 * Phone: remove
		 *
		 * Remove a phonenumber from a person
		 *
		 */
		rpc.addMethod(
			prefix+"removePhone",
			this.removePhoneFromPerson.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the phonenumber to be removed and the person to remove it from',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the phonenumber'
						},
						person: {
							type: 'number',
							description: 'Identifier of the person'
						}
					}
				}
			]
		);
		
		/*
		 * Group: add person
		 *
		 * Add a person to a group
		 *
		 */
		rpc.addMethod(
			prefix+"addToGroup",
			this.addGroupToPerson.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the person and the group it is to be added to',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the group'
						},
						person: {
							type: 'number',
							description: 'Identifier of the person'
						}
					}
				}
			]
		);

		/*
		 * Group: remove person
		 *
		 * Remove a person from a group
		 *
		 */
		rpc.addMethod(
			prefix+"removeFromGroup",
			this.removeGroupFromPerson.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the person and the group it is to be removed from',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the group'
						},
						person: {
							type: 'number',
							description: 'Identifier of the person'
						}
					}
				}
			]
		);

		/*
		 * Token: list
		 *
		 * List tokens
		 *
		 */
		rpc.addMethod(
			prefix+"token/list",
			this.listTokens.bind(this),
			[
				{
					name: 'query',
					type: 'any',
					description: 'Database query'
				}
			]
		);

		/*
		 * Token type: list
		 *
		 * List token types
		 *
		 */
		rpc.addMethod(
			prefix+"token/type/list",
			this.listTokenTypes.bind(this),
			[
				{
					type: 'none'
				}
			]
		);

		/*
		 * Token: database
		 *
		 * Export the token database as configuration file for the Lock-O-matic
		 *
		 */
		rpc.addMethod(
			prefix+"token/db",
			this.getTokenDb.bind(this),
			[
				{
					type: 'none'
				}
			]
		);

		/*
		 * Group: list
		 *
		 * List person groups
		 *
		 */
		rpc.addMethod(
			prefix+"group/list",
			this.listGroups.bind(this),
			[
				{
					name: 'query',
					type: 'any',
					description: 'Database query'
				}
			]
		);

		/*
		 * Group: create
		 *
		 * Create a person group
		 *
		 */
		rpc.addMethod(
			prefix+"group/create",
			this.createGroup.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the group',
					required: {
						name: {
							type: 'string',
							description: 'Name of the group'
						},
						description: {
							type: 'string',
							description: 'Description of the group'
						},
						default: {
							type: 'boolean',
							description: 'Flag indicating weither or not the group should be added to new persons by default'
						}
					}
				}
			]
		);

		/*
		 * Group: edit
		 *
		 * Edit a person group
		 *
		 */
		rpc.addMethod(
			prefix+"group/edit",
			this.editGroup.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the group to be edited',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the group'
						}
					},
					optional: {
						name: {
							type: 'string',
							description: 'Name of the group'
						},
						description: {
							type: 'string',
							description: 'Description of the group'
						},
						default: {
							type: 'boolean',
							description: 'Flag indicating weither or not the group should be added to new persons by default'
						}
					}
				}
			]
		);

		/*
		 * Group: remove
		 *
		 * Delete a person group
		 *
		 */
		rpc.addMethod(
			prefix+"group/remove",
			this.removeGroup.bind(this),
			[
				{
					type: 'number',
					description: 'Identifier of the group to be removed'
				},
				{
					type: 'object',
					description: 'Object describing the group to be removed',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the group to be removed'
						}
					},
					optional: {
						force: {
							type: 'boolean',
							description: 'Flag that indicates weither or not the group should be removed when there are persons in the group'
						}
					}
				}
			]
		);
	}
}

module.exports = Persons;
