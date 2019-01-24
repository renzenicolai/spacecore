"use strict";

const mime = require('mime-types');

class Persons {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table: 'persons',
			table_group_mapping: 'person_group_mapping',
			table_group: 'person_group',
			files: null
		}, opts);
		if (this._opts.database === null) {
			console.log("The persons module can not be started without a database!");
			process.exit(1);
		}
		this._table               = this._opts.database.table(this._opts.table);
		this._table_group_mapping = this._opts.database.table(this._opts.table_group_mapping);
		this._table_group         = this._opts.database.table(this._opts.table_group);
	}

	list(session, params) {
		return this._table.list(params).then((result) => {
			var promises = [];
			for (var i in result) {
				promises.push(this._getFile(result[i].avatar_id));
			}
			return Promise.all(promises).then((resultArray) => {
				for (var i in resultArray) {
					result[i].avatar = null;
					if ("file" in resultArray[i]) {
						result[i].avatar = {
							data: resultArray[i].file.toString('base64'),
							mime: mime.lookup(resultArray[i].filename.split('.').pop())
						};
					}
				}
				
				var promises = [];
				for (i in result) {
					promises.push(this._table_group_mapping.selectRecordsRaw("SELECT mapping.id as 'mapping_id', group.id, group.name, group.description, group.min_saldo, group.max_saldo, group.alert_msg, group.alert_sound, group.alert_visual, group.alert_mail FROM `person_group_mapping` AS `mapping` INNER JOIN `person_group` AS `group` ON mapping.person_group_id = group.id WHERE `person_id` = ?", [result[i].id], false));
				}
				
				return Promise.all(promises).then((resultArray) => {
					for (i in resultArray) {
						result[i].groups = [];
						for (var item in resultArray[i]) {
							var group = resultArray[i][item];
							console.error(group.min_saldo, group.max_saldo, result[i].saldo);
							if (group.min_saldo === null || result[i].saldo>=group.min_saldo) {
								if (group.max_saldo === null || result[i].saldo<=group.max_saldo) {
									result[i].groups.push(group);
								}
							}
						}
					}
					return Promise.resolve(result);
				});
			});
		});
	}

	find(session, params) {
		return this.list(session, {"nick_name": params});
	}

	_getFile(id) {
		if (this._opts.files === null) {
			return new Promise((resolve, reject) => {
				return resolve(null);
			});
		}
		return this._opts.files.getFile(id);
	}

	findById(session, params) {
		return new Promise((resolve, reject) => {
			if (params.length != 1) return reject("Expected 1 parameter: the id of a person");
			var id = params[0];
			if(typeof id !== 'number') return reject("Invalid parameter: please provide the id of a person");
			return this.list(session, {"id": id});
		});
	}
	
	async getRecord(id) {
		return this._table.selectRecords({id: id}).then((result) => {
			if (result.length !== 1) return Promise.reject("Invalid id.");
			return Promise.resolve(result[0]);
		});
	}

	getGroups(session, params) {
		return this._table_group.list(params);
	}

	registerRpcMethods(rpc, prefix="person") {
		if (prefix!=="") prefix = prefix + "/";
		rpc.addMethod(prefix+"list", this.list.bind(this));
		rpc.addMethod(prefix+"find/id", this.findById.bind(this));
		rpc.addMethod(prefix+"find", this.find.bind(this));
		rpc.addMethod(prefix+"groups", this.getGroups.bind(this));
	}
}

module.exports = Persons;
