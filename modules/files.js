"use strict";

const mime = require('mime-types');

class Persons {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table: 'files'
		}, opts);
		if (this._opts.database === null) {
			console.log("The files module can not be started without a database!");
			process.exit(1);
		}
		this._table             = this._opts.database.table(this._opts.table);
	}
	
	getFileAsRecord(id) {
		return new Promise((resolve, reject) => {
			if (id === null) return resolve(null);
			if(typeof id !== 'number') return reject("Invalid parameter: please provide the id of a file");
			return this._table.selectRecords({"id":parseInt(id)}).then((records) => {
				console.log("SELECT RECORDS RESULT", records);
				if (records.length > 1) return reject("Duplicate id error!");
				return resolve(records[0]);
			}).catch((error) => { return reject(error); });
		});
	}
	
	async getFileAsBase64(id) {
		var result = await this.getFileAsRecord(id);
		if (result === null) return null;
		result = result.getFields();
		if (result.file === null) return null;
		
		return {
			data: result.file.toString('base64'),
			mime: mime.lookup(result.filename.split('.').pop())
		};
	}

	registerRpcMethods(rpc, prefix="files") {
		if (prefix!=="") prefix = prefix + "/";
		rpc.addMethod(prefix+"get", this.getFileAsBase64.bind(this));
	}
}

module.exports = Persons;
