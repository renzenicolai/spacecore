"use strict";

const mime = require('mime-types');

class Persons {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table: 'persons',
			table_group_mapping: 'person_group_mapping',
			table_group: 'person_group',
			files: null,
			products: null
		}, opts);
		if (this._opts.database === null) {
			console.log("The persons module can not be started without a database!");
			process.exit(1);
		}
		this._table               = this._opts.database.table(this._opts.table);
		this._table_group_mapping = this._opts.database.table(this._opts.table_group_mapping);
		this._table_group         = this._opts.database.table(this._opts.table_group);
	}
	
	/* Persons */
	
	list(session, params) {
		return this._table.list(params).then((result) => {
			var promises = [];
			for (var i in result) {
				promises.push(this._opts.files.getFileAsBase64(result[i].avatar_id));
			}
			return Promise.all(promises).then((resultArray) => {
				for (var i in resultArray) {
					result[i].avatar = resultArray[i];
				}
				
				var promises = [];
				for (i in result) {
					promises.push(this._table_group_mapping.selectRecordsRaw("SELECT mapping.id as 'mapping_id', group.id, group.name, group.description FROM `person_group_mapping` AS `mapping` INNER JOIN `person_group` AS `group` ON mapping.person_group_id = group.id WHERE `person_id` = ?", [result[i].id], false));
				}
				
				return Promise.all(promises).then((resultArray) => {
					for (i in resultArray) {
						result[i].groups = resultArray[i];
					}
					return Promise.resolve(result);
				});
			});
		});
	}
	
	add(session, params) {
		var nick_name = "";
		var first_name = "";
		var last_name = "";
		
		if (typeof params === "string") {
			nick_name = params;
			first_name = params;
		} else if ((typeof params === "object") && (typeof params.nick_name === "string")) {
			nick_name = params.nick_name;
			if (typeof params.first_name === "string") first_name = params.first_name;
			if (typeof params.last_name === "string") last_name = params.last_name;
		} else {
			return new Promise((resolve, reject) => {
				return reject("Invalid argument.");
			});
		}
				
		return this.list(session, {nick_name: nick_name}).then((result) => {
			if (result.length > 0) return new Promise((resolve, reject) => {
				console.log(result);
				return reject("Nickname already in use for another user.");
			});
			return this._opts.products.findByNameLike(session, nick_name).then((result) => {
				if (result.length > 0) return new Promise((resolve, reject) => {
					return reject("Nickname already in use for product.");
				});
								
				return this.listGroups(session, {addToNew:1}).then((groupResult) => {
					return this._opts.database.transaction("addPerson ("+nick_name+")").then((dbTransaction) => {
						var personRecord = this._table.createRecord();
						personRecord.setField("nick_name", nick_name);
						personRecord.setField("first_name", first_name);
						personRecord.setField("last_name", last_name);
						personRecord.setField("saldo", 0);
						return personRecord.flush(dbTransaction).then((personResult) => {
							if (!personResult) {
								console.log("Error: PERSON NOT CREATED");
								return new Promise(function(resolve, reject) {
									return reject("Error: person not created?!");
								});
							}
							//console.log("RECORD", personRecord, dbTransaction, personResult);
							var person_id = personRecord.getIndex();
							//console.log("New user ID",person_id);
							var mapping_record_promises = [];
							for (var i in groupResult) {
								var mappingRecord = this._table_group_mapping.createRecord();
								mappingRecord.setField("person_group_id", groupResult[i].id);
								mappingRecord.setField("person_id", person_id);
								mapping_record_promises.push(mappingRecord.flush(dbTransaction));
							}
							return Promise.all(mapping_record_promises).then( (result) => {
								dbTransaction.commit();
								return "Account created!";
							});
						}).catch((error) => {
							console.log("ERROR", error);
							dbTransaction.rollback();
							return error;
						});
					});
				});
			});
		});
	}
	
	async edit(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.id !== 'number')
		) throw "Invalid parameters";
		
		var result = await this._table.selectRecords({
			id: params.id
		});
		
		if (result.length !== 1) {
			throw "Person not found.";
		}
		
		result = result[0]; //We expect to find only one result, because we select using a unique column.
		
		if (typeof params.first_name === 'string') {
			result.setField('first_name', params.first_name);
		} else if (typeof params.first_name !== 'undefined') {
			throw "'first_name' parameter has invalid type, must be string!";
		}
		
		if (typeof params.last_name === 'string') {
			result.setField('last_name', params.last_name);
		} else if (typeof params.last_name !== 'undefined') {
			throw "'last_name' parameter has invalid type, must be string!";
		}
		
		if (typeof params.nick_name === 'string') {
			result.setField('nick_name', params.nick_name);
		} else if (typeof params.nick_name !== 'undefined') {
			throw "'nick_name' parameter has invalid type, must be string!";
		}
				
		return result.flush();
	}
	
	async remove(session, params) {
		var id = null;
		if (typeof params === 'number') {
			id = params;
		} else if ((typeof params === 'object') && (typeof params.id === 'number')) {
			id = params.id
		} else {
			throw "Invalid parameters";
		}
		
		var result = await this._table.selectRecords({
			id: id
		});
		
		if (result.length !== 1) {
			throw "Person not found.";
		}
				
		result = result[0]; //We expect to find only one result, because we select using a unique column.
		
		var groups = await this._table_group_mapping.selectRecords({
			person_id: id
		});
		
		var dbTransaction = await this._opts.database.transaction("removePerson-"+id);
				
		if (groups.length > 0) {
			var groupOperations = [];
			for (var i in groups) {
				groupOperations.push(groups[i].destroy(dbTransaction)); //Delete the group mapping record
			}
			await Promise.all(groupOperations);
		}
		
		await result.destroy(dbTransaction); //Delete the person itself
		await dbTransaction.commit(); //Commit the full transaction
		return true;
		
		//FIXME: This function causes actual errors when trying to remove a user with transactions
		//       Instead of causing an error we should detect this and abort with a proper error message.
	}
	
	find(session, params) {
		return this.list(session, {"nick_name": params});
	}
	
	async addGroupToPerson(session, params) {
		if (
			(typeof params !== 'object') ||
			(typeof params.person !== 'number') ||
			(typeof params.group !== 'number')
		) throw "Invalid parameters";
		
		var results = await this._table_group_mapping.list({
			person_id: params.person,
			person_group_id: params.group			
		});
		
		if (results.length > 0) {
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
		
		if (results.length < 1) {
			throw "The person is not in the group!";
		}
				
		var tasks = [];
		for (var i in results) {
			var result = results[i];
			tasks.push(result.destroy());
		}
		
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
