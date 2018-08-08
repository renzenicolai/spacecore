"use strict";

const mime = require('mime-types');

class Persons {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table: 'persons',
			table_address: 'person_address',
			table_bankaccount: 'person_bankaccount',
			table_email: 'person_email',
			table_phone: 'person_phone',
			table_file: 'person_file'
		}, opts);
		if (this._opts.database == null) {
			print("The persons module can not be started without a database!");
			process.exit(1);
		}
		this._table             = this._opts.database.table(this._opts.table);
		this._table_address     = this._opts.database.table(this._opts.table_address);
		this._table_bankaccount = this._opts.database.table(this._opts.table_bankaccount);
		this._table_email       = this._opts.database.table(this._opts.table_email);
		this._table_phone       = this._opts.database.table(this._opts.table_phone);
		this._table_file        = this._opts.database.table(this._opts.table_file);
	}
	
	list(session, params={}) {
		return this._table.list(params).then((result) => {
			var promises = [];
			for (var i in result) {
				promises.push(this._getFile(result[i].avatar));
			}
			return Promise.all(promises).then((resultArray) => {
				for (var i in resultArray) {
					result[i].avatar = null;
					if (resultArray[i].file !== null) {
						result[i].avatar = {
							data: resultArray[i].file.toString('base64'),
							mime: mime.lookup(resultArray[i].filename.split('.').pop())
						};
					}
				}
				return Promise.resolve(result);
			}).catch((err) => {
				console.log("FILE ERROR IN PERSON LIST 2",err);
				return Promise.reject(err);
			});
		});
	}
		
	/*list(session, params={}) {
		return new Promise((resolve, reject) => {
			if (typeof params !== 'object') return reject("Invalid params (1)");			
			return this._table.selectRecords(params).then((records) => {
				var result = [];
				for (var i = 0; i<records.length; i++) {
					result.push(records[i].getFields());
				}
				return resolve(result);
			}).catch((error) => { return reject(error); });
		});
	}*/
	
	_getFile(id) {
		return new Promise((resolve, reject) => {
			console.log('File', id);
			if (id === null) {
				return resolve({
					id: null,
					person_id: null,
					filename: null,
					file: null,
					description: null
				});
			}
			if(typeof id !== 'number') return reject("Invalid parameter: please provide the id of a file");
			return this._table_file.selectRecords({"id":parseInt(id)}).then((records) => {
				if (records.length > 1) return reject("Duplicate id error!");
				var result = records[0].getFields();
				return resolve(result);
			}).catch((error) => { return reject(error); });
		});
	}

	details(session, id) {
		return new Promise((resolve, reject) => {
			if(typeof id !== 'number') return reject("Invalid parameter: please provide the id of a person");
			return this._table.selectRecords({"id":parseInt(id)}).then((records) => {
				if (records.length > 1) return reject("Duplicate id error!");
				var result = records[0].getFields();
				return this._getFile(result.avatar).then((avatar_res) => {
					if (avatar_res.file !== null) {
						result.avatar = {
								data: avatar_res.file.toString('base64'),
								mime: mime.lookup(avatar_res.filename.split('.').pop())
							};
					}
					return this._table_address.selectRecords({'person_id':id}).then((address_res) => {
						var addresses = [];
						for (var i in address_res) {
							addresses.push(address_res[i].getFields());
						}
						result.address = addresses;
						return this._table_bankaccount.selectRecords({'person_id':id}).then((bankaccount_res) => {
							var bankaccounts = [];
							for (var i in bankaccount_res) {
								bankaccounts.push(bankaccount_res[i].getFields());
							}
							result.bankaccount = bankaccounts;
							return this._table_email.selectRecords({'person_id':id}).then((email_res) => {
								var email = [];
								for (var i in email_res) {
									email.push(email_res[i].getFields());
								}
								result.email = email;
								return this._table_phone.selectRecords({'person_id':id}).then((phone_res) => {
									var phone = [];
									for (var i in phone_res) {
										phone.push(phone_res[i].getFields());
									}
									result.phone = phone;
									return resolve(result);
								});
							});
						});
					});
					
				});
			}).catch((error) => { return reject(error); });
		});
	}
	
	/*add(session, params) {
		return new Promise((resolve, reject) => {
			if((params.length > 2) || (params.length < 1)) return reject("invalid parameter count");
			var nick_name = params[0];
			var member = false;
			if ((params.length == 2) && params[1]) member = true;
			if (typeof nick_name != "string") return reject("Param 1 (nick_name) should be string.");
			
			this.find([nick_name]).then((existing_persons) => {
				if (existing_persons.length>0) {
					return reject("The nickname '"+nick_name+"' has already been registered. Please pick another nickname.");
				} else {
					var record = this._table.createRecord();
					record.setField('nick_name', nick_name);
					record.setField('first_name', '');
					record.setField('last_name', '');					
					resolve(record.flush());
				}
			}).catch((error) => { reject(error); });
		});
	}*/
	
	registerRpcMethods(rpc, prefix="person") {
		if (prefix!="") prefix = prefix + "/";
		rpc.addMethod(prefix+"list", this.list.bind(this));
		rpc.addMethod(prefix+"details", this.details.bind(this));
		//rpc.addMethod(prefix+"add", this.add.bind(this));
	}
}

module.exports = Persons;
