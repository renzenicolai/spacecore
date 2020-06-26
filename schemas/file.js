'use strict'; 

const Schema = require('./schema.js');

class FileSchema extends Schema {
	constructor(database) {
		super(database, 'files');
		this._schema = {
			id:   { index: true,  type: 'int(11)',      isNullable: false },
			name: { index: false, type: 'varchar(200)', isNullable: false },
			mime: { index: false, type: 'varchar(200)', isNullable: false },
			data: { index: false, type: 'longblob',     isNullable: false }
		}
	}
}

module.exports = FileSchema;
