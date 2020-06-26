'use strict'; 

class Schema {
	constructor(database, table) {
		this._database = database;
		this._table = table;
		this._schema = {};
		this._constraints = [];
		this._children = [];
		this._engine = 'InnoDB';
		this._charset = 'utf8mb4';
		this._collate = 'utf8mb4_unicode_ci';
	}
	
	getTable() {
		return this._table;
	}
	
	async check() {
		for (let i = 0; i < this._children.length; i++) {
			await this._children[i].check();
		}
		let [records, fields] = await this._database.query("select * from information_schema.columns where table_schema=? and table_name=?;", [this._database.getName(), this._table]);
		let errors = [];
		// First check if there are no stray columns
		for (let i = 0; i < records.length; i++) {
			let record = records[i];
			let schema = this._schema[record.COLUMN_NAME];
			if (record.COLUMN_NAME in this._schema) {
				if ((record.COLUMN_KEY === 'PRI') && (!schema.index)) {
					errors.push('Column `'+record.COLUMN_NAME+'` in table `'+this._table+'` is primary index while it shouldn\'t be');
				}
				if ((record.COLUMN_KEY !== 'PRI') && (schema.index)) {
					errors.push('Column `'+record.COLUMN_NAME+'` in table `'+this._table+'` should be primary index');
				}
				if ((record.COLUMN_KEY === 'PRI') && (record.EXTRA !== 'auto_increment')) {
					errors.push('Column `'+record.COLUMN_NAME+'` in table `'+this._table+'` should have auto increment enabled');
				}
				if (record.COLUMN_TYPE !== schema.type) {
					errors.push('Column `'+record.COLUMN_NAME+'` in table `'+this._table+'` should be of type '+schema.type);
				}
				if ((record.IS_NULLABLE === 'YES') && (!schema.isNullable)) {
					errors.push('Column `'+record.COLUMN_NAME+'` in table `'+this._table+'` should not be allowed to be set to NULL');
				}
				if ((record.IS_NULLABLE !== 'YES') && (schema.isNullable)) {
					errors.push('Column `'+record.COLUMN_NAME+'` in table `'+this._table+'` should be allowed to be set to NULL');
				}
			} else {
				errors.push('Stray column `'+record.COLUMN_NAME+'` found in table `'+this._table+'`');
			}
		}
		for (let name in this._schema) {
			let parameters = this._schema[name];
			let found = false;
			for (let i = 0; i < records.length; i++) {
				if (records[i].COLUMN_NAME === name) {
					found = true;
					break;
				}
			}
			if (!found) {
				let description = parameters.type+
				(parameters.index?' configured as primary index with auto increment enabled':'')+(parameters.isNullable?' configured to be nullable':'');
				errors.push('Missing column `'+name+'` in table `'+this._table+'`, should be: '+description);
			}
		}
		
		return errors;
	}
	
	async create(createTable=true, createConstraints=true, parentTransaction = null) {
		let transaction = (parentTransaction !== null) ? parentTransaction : (await this._database.transaction('Create table '+this._table));
		
		if (createTable) {
			let query = 'CREATE TABLE `'+this._table+'` (\n';
			let last = ''; for (let name in this._schema) { last = name; }
			let alter = [];
			for (let name in this._schema) {
				let parameters = this._schema[name];
				let def = '`'+name+'` '+parameters.type+
						((!parameters.isNullable)?' NOT NULL':'')+
						(
							('default' in parameters)?
								(
									' DEFAULT '+
									(
									(parameters.default === null)?
										'NULL':
										(
											(typeof parameters.default === 'string')?
											'\''+parameters.default+'\'':
											parameters.default
										)
									)
								)
								:''
						);
				query += def+((name!==last)?',':'')+'\n';
				if (parameters.index) {
					alter.push('ALTER TABLE `'+this._table+'` ADD PRIMARY KEY (`'+name+'`);\n');
					alter.push('ALTER TABLE `'+this._table+'` MODIFY '+def+' AUTO_INCREMENT;');
				}
			}
			query +=') ENGINE='+this._engine+' DEFAULT CHARSET='+this._charset+' COLLATE='+this._collate+';';
			let [records, fields] = await this._database.query(query, [], transaction);
			for (let i = 0; i < alter.length; i++) {
				let [records, fields] = await this._database.query(alter[i], [], transaction);
			}
			
			for (let i = 0; i < this._children.length; i++) {
				await this._children[i].create(true, false, transaction);
			}
		}
		
		if (createConstraints) {
			let constraints = [];
			for (let i = 0; i < this._constraints.length; i++) {
				let constraint = this._constraints[i];
				constraints.push('ALTER TABLE `'+this._table+'` ADD KEY `'+constraint.name+'` (`'+constraint.key+'`);');
				constraints.push('ALTER TABLE `'+this._table+'` ADD CONSTRAINT `'+constraint.name+'` FOREIGN KEY (`'+constraint.key+'`) REFERENCES `'+constraint.table+'` (`'+constraint.column+'`);');
			}
			for (let i = 0; i < constraints.length; i++) {
				let [records, fields] = await this._database.query(constraints[i], [], transaction);
			}
			for (let i = 0; i < this._children.length; i++) {
				await this._children[i].create(false, true, transaction);
			}
		}
		
		if (parentTransaction === null) {
			await transaction.commit();
		}
	}
	
	async drop(parentTransaction = null, showErrors = false) {
		let transaction = (parentTransaction !== null) ? parentTransaction : (await this._database.transaction('Drop table '+this._table));
		
		for (let i = 0; i < this._children.length; i++) {
			try {
				await this._children[i].drop(transaction, showErrors);
			} catch (error) {
				if (showErrors) {
					console.log(error);
				}
			}
		}
		
		try {
			let [records, fields] = await this._database.query('DROP TABLE `'+this._table+'`;', [], transaction);
		} catch (error) {
			if (showErrors) {
				console.log(error);
			}
		}
		
		if (parentTransaction === null) {
			await transaction.commit();
		}
	}
}

module.exports = Schema;
