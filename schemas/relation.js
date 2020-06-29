'use strict'; 

const Schema = require('./schema.js');

class RelationAddressSchema extends Schema {
	constructor(database) {
		super(database, 'relation_addresses');
		this._schema = {
			id:       { index: true,  type: 'int(11)',      isNullable: false },
			relation: { index: false, type: 'int(11)',      isNullable: false },
			address:  { index: false, type: 'varchar(300)', isNullable: false }
		};
		
		this._constraints = [
			{name: 'relation_of_relation_address', key: 'relation', table: 'relations', column: 'id'}
		];
	}
}

class RelationEmailAddressSchema extends Schema {
	constructor(database) {
		super(database, 'relation_emailaddresses');
		this._schema = {
			id:       { index: true,  type: 'int(11)',      isNullable: false },
			relation: { index: false, type: 'int(11)',      isNullable: false },
			address:  { index: false, type: 'varchar(300)', isNullable: false }
		};
		
		this._constraints = [
			{name: 'relation_of_relation_emailaddress', key: 'relation', table: 'relations', column: 'id'}
		];
	}
}

class RelationBankaccountSchema extends Schema {
	constructor(database) {
		super(database, 'relation_bankaccounts');
		this._schema = {
			id:       { index: true,  type: 'int(11)',      isNullable: false },
			relation: { index: false, type: 'int(11)',      isNullable: false },
			holder:   { index: false, type: 'varchar(200)', isNullable: false },
			iban:     { index: false, type: 'varchar(200)', isNullable: false },
			bic:      { index: false, type: 'varchar(200)', isNullable: false }
		};
		
		this._constraints = [
			{name: 'relation_of_relation_bankaccount', key: 'relation', table: 'relations', column: 'id'}
		];
	}
}

class RelationPhonenumberSchema extends Schema {
	constructor(database) {
		super(database, 'relation_phonenumbers');
		this._schema = {
			id:          { index: true,  type: 'int(11)',      isNullable: false },
			relation:    { index: false, type: 'int(11)',      isNullable: false },
			phonenumber: { index: false, type: 'varchar(200)', isNullable: false }
		};
		
		this._constraints = [
			{name: 'relation_of_relation_phonenumber', key: 'relation', table: 'relations', column: 'id'}
		];
	}
}

class RelationTokenSchema extends Schema {
	constructor(database) {
		super(database, 'relation_tokens');
		this._schema = {
			id:         { index: true,  type: 'int(11)',       isNullable: false                },
			relation:   { index: false, type: 'int(11)',       isNullable: false                },
			enabled:    { index: false, type: 'tinyint(1)',    isNullable: false, default: 0    },
			type:       { index: false, type: 'varchar(200)',  isNullable: false,               },
			public:     { index: false, type: 'varchar(1024)', isNullable: false,               },
			private:    { index: false, type: 'varchar(1024)', isNullable: true,  default: null },
		};
		
		this._constraints = [
			{name: 'relation_of_relation_token', key: 'relation', table: 'relations', column: 'id'}
		];
	}
}

class RelationGroupSchema extends Schema {
	constructor(database) {
		super(database, 'relation_groups');
		this._schema = {
			id:          { index: true,  type: 'int(11)',      isNullable: false,               },
			name:        { index: false, type: 'varchar(200)', isNullable: false,               },
			description: { index: false, type: 'text',         isNullable: false,               },
			addtonew:    { index: false, type: 'tinyint(1)',   isNullable: false, default: 0    },
			picture:     { index: false, type: 'int(11)',      isNullable: true,  default: null }
		};

		this._constraints = [
			{name: 'picture_of_relation_group', key: 'picture', table: 'files', column: 'id'}
		];

		this._children = [
			new RelationGroupMappingSchema(database)
		];
	}
}

class RelationGroupMappingSchema extends Schema {
	constructor(database) {
		super(database, 'relation_group_mappings');
		this._schema = {
			id:          { index: true,  type: 'int(11)', isNullable: false },
			relation:    { index: false, type: 'int(11)', isNullable: false },
			group:       { index: false, type: 'int(11)', isNullable: false }
		};
		
		this._constraints = [
			{name: 'relation_of_relation_group_mapping', key: 'relation', table: 'relations',       column: 'id'},
			{name: 'group_of_relation_group_mapping',    key: 'group',    table: 'relation_groups', column: 'id'},
		];
	}
}

class RelationSchema extends Schema {
	constructor(database) {
		super(database, 'relations');
		this._schema = {
			id:        { index: true,  type: 'int(11)',      isNullable: false,                      },
			nickname:  { index: false, type: 'varchar(100)', isNullable: false,                      },
			realname:  { index: false, type: 'varchar(100)', isNullable: false, default: 'Anonymous' },
			picture:   { index: false, type: 'int(11)',      isNullable: true,  default: null        }
		}
		
		this._constraints = [
			{name: 'picture_of_relation', key: 'picture', table: 'files', column: 'id'}
		];
		
		this._children = [
			new RelationAddressSchema(database),
			new RelationEmailAddressSchema(database),
			new RelationBankaccountSchema(database),
			new RelationPhonenumberSchema(database),
			new RelationTokenSchema(database),
			new RelationGroupSchema(database)
		];
	}
}

module.exports = RelationSchema;
