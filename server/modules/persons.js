"use strict";

const Tasks = require('../lib/tasks.js');

class Persons {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table:               'persons',
			table_group:         'person_group',
			table_group_mapping: 'person_group_mapping',
			table_token:         'person_token',
			table_token_type:    'person_token_type',
			table_address:       'person_address',
			table_email:         'person_email',
			table_phone:         'person_phone',
			table_bankaccount:   'bankaccounts',
			files:               null,
			products:            null
		}, opts);
		if (this._opts.database === null) {
			console.log("The persons module can not be started without a database!");
			process.exit(1);
		}
		
		/* Tables */
		this._table               = this._opts.database.table(this._opts.table);                //Persons
		this._table_group         = this._opts.database.table(this._opts.table_group);          //Groups
		this._table_group_mapping = this._opts.database.table(this._opts.table_group_mapping);  //Mapping between persons and groups
		this._table_token         = this._opts.database.table(this._opts.table_token);          //Tokens
		this._table_token_type    = this._opts.database.table(this._opts.table_token_type);     //Token types
		this._table_bankaccount   = this._opts.database.table(this._opts.table_bankaccount);    //Bankaccounts (Warning: this table is shared with other modules)
		this._table_address       = this._opts.database.table(this._opts.table_address);        //Addresses
		this._table_email         = this._opts.database.table(this._opts.table_email);          //Email addresses
		this._table_phone         = this._opts.database.table(this._opts.table_phone);          //Phonenumbers
	}
	
	/* Persons */
	
	_getGroups(person_id) {
		return this._table_group_mapping.selectRecordsRaw("SELECT mapping.id as 'mapping_id', group.id, group.name, group.description FROM `"+this._opts.table_group_mapping+"` AS `mapping` INNER JOIN `"+this._opts.table_group+"` AS `group` ON mapping.person_group_id = group.id WHERE `person_id` = ?", [person_id], false);
	}
	
	_getTokens(person_id) {
		return this._table_token.list({person_id: person_id});
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

	async list(session, params) {
		var persons = await this._table.list(params);
		var tasks = [
			Tasks.create('avatar',    this._opts.files.getFileAsBase64.bind(this._opts.files), persons, 'avatar_id'),
			Tasks.create('groups',    this._getGroups.bind(this),                              persons, 'id'),
			Tasks.create('tokens',    this._getTokens.bind(this),                              persons, 'id'),
			Tasks.create('addresses', this._getAddresses.bind(this),                           persons, 'id'),
			Tasks.create('email',     this._getEmail.bind(this),                               persons, 'id'),
			Tasks.create('phone',     this._getPhone.bind(this),                               persons, 'id')
		];
		return Tasks.merge(tasks, persons);
	}
	
	async add(session, params) {
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
			throw "Invalid argument.";
		}
		
		var checks = await Promise.all([
			this.list(session, {nick_name: nick_name}),
			this._opts.products.findByNameLike(session, nick_name)
		]);
		
		if (checks[0].length > 0) throw "This nickname exists already!";
		if (checks[1].length > 0) throw "This nickname would conflict with a product!";
		
		var defaultGroups = await this.listGroups(session, {addToNew:1});
		
		var dbTransaction = await this._opts.database.transaction("addPerson ("+nick_name+")");
		
		var personRecord = this._table.createRecord();
		
		personRecord.setField("nick_name", nick_name);
		personRecord.setField("first_name", first_name);
		personRecord.setField("last_name", last_name);
		personRecord.setField("saldo", 0);
		
		try {
			if (Array.isArray(avatar) && (avatar.length > 0)) {
				var avatarRecord = await this._opts.files.createFileFromBase64(avatar[0], dbTransaction);
				personRecord.setField('avatar_id', avatarRecord.getIndex());
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
			dbTransaction.rollback();
			throw e;
		}
		
		dbTransaction.commit();
		return personRecord.getIndex();
	}
	
	async _findById(params) {
		var id = null;
		if (typeof params === 'number') {
			id = params;
		} else if ((typeof params === 'object') && (typeof params.id === 'number')) {
			id = params.id
		} else {
			throw "Invalid parameters";
		}
		
		var result = await this._table.selectRecords({id: id});
		if (result.length !== 1) throw "Person not found.";
		
		return result[0];
	}
	
	async edit(session, params) {
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
			var avatar = await this._opts.files.createFileFromBase64(params.avatar[0]);
			person.setField('avatar_id', avatar.getIndex());
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
		var dbTransaction = await this._opts.database.transaction("Remove person #"+person.getIndex());
		
		try {
			await this._removeAll(person, this._table_group_mapping, dbTransaction); //Delete all group associations
			await this._removeAll(person, this._table_token,         dbTransaction); //Delete all tokens
			await this._removeAll(person, this._table_bankaccount,   dbTransaction); //Delete all bankaccounts
			await this._removeAll(person, this._table_address,       dbTransaction); //Delete all bankaccounts
			await this._removeAll(person, this._table_email,         dbTransaction); //Delete all email addresses
			await this._removeAll(person, this._table_phone,         dbTransaction); //Delete all phonenumbers
			await person.destroy(dbTransaction);                                     //Delete the person itself
		} catch (e) {
			await dbTransaction.rollback();                                          //Cancel the transaction
			console.log("Could not remove person:",e);
			throw "Can not remove this person!";
		}
		await dbTransaction.commit();                                                //Commit the transaction
		return true;
	}
	
	async find(session, params) {
		if (typeof params !== 'string') throw "Parameter should be the nickname as a string!";
		return this.list(session, {"nick_name": params.toLowerCase()});
	}
	
	async addGroupToPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.person !== 'number') ||
			(typeof params.group !== 'number')
		) throw "Invalid parameters";
		
		if (await this._table_group_mapping.list({
			person_id: params.person,
			person_group_id: params.group			
		}) > 0) {
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
	
	/* Groups */
	
	listGroups(session, params) {
		return this._table_group.list(params);
	}
		
	async addGroup(session, params) {
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
			id = params.id
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
		
		var dbTransaction = await this._opts.database.transaction("removeGroup-"+id);
				
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
		
	/* Registration */
	
	registerRpcMethods(rpc, prefix="person") {
		if (prefix!=="") prefix = prefix + "/";
		
		/* Persons */
		rpc.addMethod(prefix+"list", this.list.bind(this));                         //Persons: list persons matching filter in query
		rpc.addMethod(prefix+"add", this.add.bind(this));                           //Persons: add a person
		rpc.addMethod(prefix+"edit", this.edit.bind(this));                         //Persons: edit a person
		rpc.addMethod(prefix+"remove", this.remove.bind(this));                     //Persons: remove a person
		rpc.addMethod(prefix+"find", this.find.bind(this));                         //Persons: find a person (wrapper for list function)
		rpc.addMethod(prefix+"addGroup", this.addGroupToPerson.bind(this));         //Persons: add a group to a person
		rpc.addMethod(prefix+"removeGroup", this.removeGroupFromPerson.bind(this)); //Persons: remove a group from a person
		
		/* Groups */
		rpc.addMethod(prefix+"group/list", this.listGroups.bind(this));             //Groups: list groups matching filter in query
		rpc.addMethod(prefix+"group/add", this.addGroup.bind(this));                //Groups: add a group
		rpc.addMethod(prefix+"group/edit", this.editGroup.bind(this));              //Groups: edit a group
		rpc.addMethod(prefix+"group/remove", this.removeGroup.bind(this));          //Groups: remove a group
	}
}

module.exports = Persons;
