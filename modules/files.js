"use strict";

const mime = require('mime-types');

class Persons {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table: 'files'
		}, opts);
		if (this._opts.database == null) {
			print("The files module can not be started without a database!");
			process.exit(1);
		}
		this._table             = this._opts.database.table(this._opts.table);
	}
	
	getFile(id) {
		return new Promise((resolve, reject) => {
			console.log('File', id);
			if (id === null) {
				return resolve({
					id: null,
					user_id: null,
					filename: null,
					file: null,
					description: null
				});
			}
			if(typeof id !== 'number') return reject("Invalid parameter: please provide the id of a file");
			return this._table.selectRecords({"id":parseInt(id)}).then((records) => {
				if (records.length > 1) return reject("Duplicate id error!");
				var result = records[0].getFields();
				return resolve(result);
			}).catch((error) => { return reject(error); });
		});
	}

	registerRpcMethods(rpc, prefix="files") {
		if (prefix!="") prefix = prefix + "/";
		rpc.addMethod(prefix+"get", this.getFile.bind(this));
	}
}

module.exports = Persons;
