"use strict";

const precisionRound = require('../lib/precisionRound.js');

class Persons {
	constructor(opts) {
		this._opts = Object.assign({
			database: null
		}, opts);
		if (this._opts.database == null) {
			print("The persons module can not be started without a database!");
			process.exit(1);
		}
		this._table = this._opts.database.table('persons');
		
		
		this._table_member_types = this._opts.database.table('types_member');
		this._table_member_history = this._opts.database.table('history_member');
	}
	
	list(session, params={}) {
		return this._table.list(params);
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

	details(session, params) {
		return new Promise((resolve, reject) => {
			if(params.length != 1) return reject("invalid parameter count");
			return this._table.selectRecords({"id":parseInt(params)}).then((records) => {
				if (records.length > 1) return reject("Duplicate id error!");
				var result = records[0].getFields();
				return resolve(result);
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
