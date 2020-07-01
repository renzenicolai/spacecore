'use strict'; 

const Schema = require('./schema.js');

class UserPermissionsSchema extends Schema {
	constructor(database) {
		super(database, 'user_permissions');
		this._schema = {
			id:       { index: true,  type: 'int(11)',      isNullable: false },
			user:     { index: false, type: 'int(11)',      isNullable: false },
			endpoint: { index: false, type: 'varchar(200)', isNullable: false }
		};
		
		this._constraints = [
			{name: 'user_of_user_permission', key: 'user', table: 'users', column: 'id'}
		];
	}
}

class UserSchema extends Schema {
	constructor(database) {
		super(database, 'users');
		this._schema = {
			id:       { index: true,  type: 'int(11)',      isNullable: false,                      },
			username: { index: false, type: 'varchar(200)', isNullable: false,                      },
			realname: { index: false, type: 'varchar(200)', isNullable: false, default: 'Anonymous' },
			title:    { index: false, type: 'varchar(200)', isNullable: false, default: 'User'      },
			password: { index: false, type: 'varchar(200)', isNullable: true,  default: null        },
			enabled:  { index: false, type: 'tinyint(1)',   isNullable: false, default: 0           },
			picture:  { index: false, type: 'int(11)',      isNullable: true,  default: null        }
		};
		
		this._constraints = [
			{name: 'picture_of_user', key: 'picture', table: 'files', column: 'id'}
		];
		
		this._children = [
			new UserPermissionsSchema(database)
		];
	}
}

module.exports = UserSchema;
