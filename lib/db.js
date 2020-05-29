'use strict';

const mysql        = require('mysql2');
const mysqlPromise = require('mysql2/promise');
const chalk        = require('chalk');

class Transaction {
	constructor(pool, logFile=null, description="not provided") {
		this.description = description;
		this.createdOn = new Date();
		this.connection = null;
		this.pool = pool;
		this.logFile = logFile;
		return this._init();
	}
		
	async _init() {
		this.connection = await this.pool.getConnection();
		await this.connection.beginTransaction();
		return this;
	}
	
	log(message) {
		var line = ("Transaction "+this.createdOn+" - "+this.description+": "+message).replace("\n","").replace("\r","");
		if (this.logFile) this.logFile.write(line+"\n");
		console.log(chalk.white.bold.inverse(" DATABASE ")+" "+chalk.yellow(line));
	}
	
	logQuery(query, params) {
		this.log("Executing query: '"+query+"', "+JSON.stringify(params));
	}
	
	execute(query, opts) {
		this.logQuery(query, opts);
		if (this.connection === null) {
			this.log("Tried to execute query on this transaction even though it was already closed");
			process.exit(1);
		}
		return this.connection.execute(query, opts);
	}
	
	async commit() {
		if (this.connection !== null) {
			await this.connection.commit();
			await this.connection.release();
			this.log("Transaction committed");
		} else {
			this.log("Tried to commit this transaction even though it was already closed");
			process.exit(1);
		}
		this.connection = null;
	}
	
	async rollback() {
		try {
			if (this.connection !== null) {
				await this.connection.rollback();
				await this.connection.release();
				this.log("Transaction rolled back");
			} else {
				this.log("Tried to rollback this transaction even though it was already closed");
				process.exit(1);
			}
			this.connection = null;
		} catch(error) {
			this.log("Rollback error: exception occured!");
			console.error(error);
			this.log(error);
		}
	}
}

class Database {
	constructor( opts = {} ) {
		this._opts = Object.assign({
			host: '127.0.0.1',
			port: 3306,
			user: 'root',
			password: '',
			database: 'database',
			onConnect: null,
			logFile: null
		}, opts);
		
		if (
			(this._opts.host === null) ||
			(this._opts.port === null) ||
			(this._opts.user === null) ||
			(this._opts.password === null) ||
			(this._opts.database === null)
		) {
			throw "Unable to connect to the database due to missing database connection settings.";
		}
		
		this._pool = mysqlPromise.createPool({
			host: this._opts.host,
			port: this._opts.port,
			user: this._opts.user,
			password: this._opts.password,
			database: this._opts.database
		});
		
		this.escapeId = mysql.escapeId;
		
		this._tables = [];
		
		this._onConnected(); // Remove this FIXME
	}
	
	async end() {
		if (this._pool !== null) {
			await this._pool.end();
			this._pool = null;
			//console.log(chalk.white.bold.inverse(" DATABASE ")+" "+chalk.yellow("Pool closed"));
		}
	}
	
	/* Event handlers */
	
	async _onConnected() {
		// Legacy function required for modules depending on deprecrated generated schema records and tables
		await this._refreshTables();
		if (this._opts.onConnect !== null) {
			this._opts.onConnect();
		}
	}
	
	_onError(error, transaction=null) {
		if (transaction !== null) {
			console.log("An error occured during database transaction, executing rollback!");
			transaction.rollback();
		}
		if (error.code == "ECONNREFUSED") {
			console.log(chalk.white.bold.inverse(" DATABASE ")+" "+chalk.red("Fatal error: could not connect to the database backend."));
			process.exit(1);
		} else if(error.fatal) {
			console.log(chalk.white.bold.inverse(" DATABASE ")+" "+chalk.red("Fatal error in database backend: "), error);
			//throw error;
			process.exit(1);
		} else {
			console.log(chalk.white.bold.inverse(" DATABASE ")+" "+chalk.red("Error in database backend:"), error);
			//throw error;
			process.exit(1);
		}
	}
	
	/* Transaction */
	
	transaction(description="") {
		return new Transaction(this._pool, this._opts.logFile, description);
	}
	
	/* Query */
	
	async query(query, opts, transaction=null) {
		if (transaction !== null) {
			return transaction.execute(query, opts);
		} else {
			// Normal query
			if (this._pool === null) throw "Pool closed, can not execute query.";
			return this._pool.execute(query, opts);
		}
	}
	
	// LEGACY TABLE HANDLING CODE
	
	_refreshTables() {
		return this.query("SELECT table_name FROM information_schema.tables where table_schema=?;", [this._opts.database]).then( ([rows, fields]) => {
			this._tables = [];
			var promises = [];
			
			for (var i = 0; i < rows.length; i++) {
				//console.log(chalk.white.bold.inverse(" DATABASE ")+" "+"Creating table '"+rows[i].table_name+"'...");
				var table = new Table({
					db: this,
					table: rows[i].table_name
				});
				this._tables.push(table);
				promises.push(table.initSchema());
			}
			
			return Promise.all(promises);
		}).catch(this._onError);
	}
	
	table(table, schema=null) {
		if (this._tables.length<1) {
			this._refreshTables();
		}
		for (var i = 0; i<this._tables.length; i++) {
			if (this._tables[i].name()==table) return this._tables[i];
		}
		throw "Error: table '"+table+"' does not exist!";
	}
}

class Record {
	constructor(table, data, index) {
		this._table = table;
		this._data = data;
		this._index = index;
		
		this._dirty = false; // Weither or not the record has been changed while not being flushed to the database
		this._subRecords = []; // List of records referred to by this records data
	}
	
	async populate() {
		// Empty.
	}
	
	/* Serialize: get flat object from record */
	
	serialize() {
		let description = {};
		for (field in this._data) {
			description[field] = this._data[field];
		}
		return description;
	}
	
	/* Record index: the identifier used to identify this record in the database */
	
	getIndex() {
		let index = null;
		if (this._index in this._data) {
			index = this._data[this._index];
		}
		return index;
	}
	
	setIndex(id, create=false) {
		let result = false;
		if (this._index in this._data || create) {
			this._data[this._index] = id;
			result = true;
		}
		return result;
	}
	
	/* Fields: direct access to the data contained in this record */
	
	setField(field, value) {
		if (field in this._data) {
			this._data[field] = value;
			this._dirty = true;
			return true;
		}
		return false;
	}
	
	getField(field) {
		if (field in this._data) {
			return this._data[field];
		} else {
			return null;
		}
	}
	
	getFields() {
		return this._data;
	}
	
	isDirty() {
		return this._dirty;
	}
	
	setFieldDate(field, dateObject=null) {
		if (dateObject === null) dateObject = new Date();
		return this.setField(field, Math.floor(dateObject / 1000));
	}
	
	getFieldDate(field) {
		return new Date(this.getField(field)*1000);
	}
	
	/* Sub-records: records contained within the data of this record */
	
	addSubRecord(keyName, record) {
		this._subRecords.push({key: keyName, record: record});
	}
	
	_flushSubRecords(transaction=null) {
		var promises = [];
		for (var item in this._subRecords) {
			this._subRecords[item].record.setField(this._subRecords[item].key, this.getIndex());
			promises.push(this._subRecords[item].record.flush(transaction, true));
		}
		return Promise.all(promises).then((results) => {
			return true;
		});
	}
	
	/* Database sync: flushing changes to the database */
	
	async flush(transaction=null, recursive=false) {
		if (this._dirty) {
			if (typeof this._table !== 'object') {
				throw "Attempted to flush record without an assigned table";
			}
			if (this.getIndex() === null) { // The record does not yet have an index, this means the record does not exist in the database yet.
				let result = await this._table._createRecordInternal(this, transaction);
				this.setIndex(result, true);
			} else { // The record already has an index, this means the record already exists in the database
				let result = await this._table._updateRecordInternal(this, transaction);
			}
		}
		if (recursive) {
			return this._flushSubRecords(transaction);
		}
		return this.getIndex();
	}
	
	/* Cleanup */
	
	destroy(transaction=null) {
		var index = this.getIndex();
		if (index === null) return false;
		
		return this._table._destroyRecordInternal(this, transaction).then((result) => {
			this.setIndex(null);
			return true;
		});
	}
}

class Table {
	constructor( opts = {} ) {
		this._opts = Object.assign({
			db: null,
			table: null
		}, opts);
		
		this._defaultData = {};
		this._index = null;
		this._columns = [];
	}
			
	_generateDefaultData(columns) {
		var result = {};
		for (var c in this._columns) {
			result[c] = null;
		}
		this._defaultData = result;
		return result;
	}
	
	initSchema() {
		return this._opts.db.query("select * from information_schema.columns where table_schema=? and table_name=?;", [this._opts.db._opts.database, this._opts.table]).then( ([rows, fields]) => {
			this._index = null;
			this._columns = [];
			for (var i = 0; i < rows.length; i++) {
								
				var name = rows[i].COLUMN_NAME;
				var dataType = rows[i].DATA_TYPE;
				
				this._columns[name] = (rows[i].IS_NULLABLE === 'YES');
				
				var type = rows[i].COLUMN_KEY;
				if (type=="PRI") {
					if (this._index!=null) {
						throw "Table '"+this._opts.table+"' has multiple primary indexes.";
					} else {
						this._index = rows[i].COLUMN_NAME;
					}
				}
			}
			if (this._index == null) {
				throw "Table "+this._opts.table+" has no primary index. A primary index is required for all tables!";
			}
			
			//console.log(this._opts.table, this._index, this._columns);
			
			this._generateDefaultData();
			
		}).catch(this._opts.db._onError);
	}
	
	async _createRecordInternal(record, transaction=null) {
		var cols = [];
		var valuePlaceholders = [];
		var values = [];
		var fields = record.getFields();
		for (var field in fields) {
			cols.push(mysql.escapeId(field));
			values.push(fields[field]);
			valuePlaceholders.push('?');
		}
		
		var sql = "INSERT INTO "+mysql.escapeId(this._opts.table)+" ("+cols.join(", ")+") VALUES ("+valuePlaceholders.join(", ")+");";
		
		try {
			var result = await this._opts.db.query(sql, values, transaction);
			return result[0].insertId;
		} catch (error) {
			if (error.code == "ER_NO_SUCH_TABLE") {
				console.log(chalk.white.bold.inverse(" DATABASE ")+" "+chalk.red("Table '"+this._opts.table+"' does not exist."));
				throw "Table '"+this._opts.table+"' does not exist";
			} else {
				this._opts.db._onError(error);
				throw error;
			}
		}
	}
	
	async _destroyRecordInternal(record, transaction=null) {
		var sql = "DELETE FROM "+mysql.escapeId(this._opts.table)+" WHERE "+mysql.escapeId(this._index)+" = ?";
		try {
			var result = await this._opts.db.query(sql, [record.getIndex()], transaction);
			return result;
		} catch (error) {
			if (error.code == "ER_NO_SUCH_TABLE") {
				console.log(chalk.white.bold.inverse(" DATABASE ")+" "+chalk.red("Table '"+this._opts.table+"' does not exist."));
				throw "Table '"+this._opts.table+"' does not exist";
			} else {
				this._opts.db._onError(error);
				throw error;
			}
		}
	}
		
	async _updateRecordInternal(record, transaction=null) {
		if (this._index == null) {
			throw "Update not possible: table has no index.";
		}
		
		var cols = [];
		var values = [];
		var fields = record.getFields();
		for (var field in fields) {
			if (field != this._index) {
				cols.push(mysql.escapeId(field)+" = ?");
				values.push(fields[field]);
			}
		}
		
		values.push(record.getIndex());
		
		try {
			var sql = "UPDATE "+mysql.escapeId(this._opts.table)+" SET "+cols.join(", ")+" WHERE "+mysql.escapeId(this._index)+" = ?;";
			var result = await this._opts.db.query(sql, values, transaction);
			return result;
		} catch (error) {
			if (error.code == "ER_NO_SUCH_TABLE") {
				console.log(chalk.white.bold.inverse(" DATABASE ")+" "+"Error: table '"+this._opts.table+"' does not exist.");
				throw "table '"+this._opts.table+"' does not exist";
			} else {
				this._opts.db._onError(error, transaction);
				throw error;
			}
		}
	}
	
	list(where={}, separator="AND") {
		return new Promise((resolve, reject) => {
			if (typeof where !== 'object') return reject("Query should be an object.");
			return this.selectRecords(where, "", separator, false).then((records) => {
				return resolve(records);
			}).catch((error) => { return reject(error); });
		});
	}
	
	listExtra(where={}, extra="", separator="AND") {
		return new Promise((resolve, reject) => {
			if (typeof where !== 'object') return reject("Query should be an object.");
			return this.selectRecords(where, extra, separator, false).then((records) => {
				return resolve(records);
			}).catch((error) => { return reject(error); });
		});
	}
	
	async selectRecords(whereParams, extra="", whereKeysSeparator="AND", asRecord=true) {
		var whereKeys = [];
		var whereValues = [];
		
		for (var item in whereParams) {
			if ((typeof whereParams[item] === "string") || (typeof whereParams[item] === "number") || (typeof whereParams[item] === "boolean")) {
				whereKeys.push(mysql.escapeId(item)+" = ?");
				whereValues.push(whereParams[item]);
			} else if (Array.isArray(whereParams[item])) {
				if (whereParams[item].length < 1) return new Promise((resolve, reject) => reject("Query contains empty array."));
				for (var i = 0; i < whereParams[item].length; i++) {
					whereKeys.push(mysql.escapeId(item)+" = ?");
					whereValues.push(whereParams[item][i]);
				}
			} else if (typeof whereParams[item] === 'object') {
				for (var operator in whereParams[item]) {
					if (typeof operator !== "string") return new Promise((resolve, reject) => { reject("Invalid operator type"); });
					if ((operator==="=") || (operator==="<=>") || (operator===">") || (operator===">=") || (operator==="IS") || (operator==="IS NOT") || (operator==="<") || (operator==="<=") || (operator==="LIKE") || (operator==="!=") || (operator==="<>") || (operator==="NOT LIKE") ) {
						whereKeys.push(mysql.escapeId(item)+" "+operator+" ?");
						whereValues.push(whereParams[item][operator]);
					} else if ((operator==="IS NOT NULL") || (operator==="IS NULL")) {
						whereKeys.push(mysql.escapeId(item)+" "+operator);
					} else {
						return new Promise((resolve, reject) => { reject("Invalid operator"); });
					}
				}
			} else {
				throw "Invalid where value type ["+(typeof whereParams[item])+"]";
			}
		}
		
		var where = "";
		if (whereKeys.length>0) {
			where = "where ";
			for (var j = 0; j < whereKeys.length; j++) {
				where += whereKeys[j];
				if (j < whereKeys.length - 1) where += ' '+whereKeysSeparator+' ';
			}
		}
		
		if (extra!="") extra = " "+extra;
		
		
		let sql = "SELECT * FROM "+mysql.escapeId(this._opts.table)+" "+where+extra+";";
		try {
			let [rows, fields] = await this._opts.db.query(sql, whereValues);
			let result = [];
					for (var i = 0; i < rows.length; i++) {
						if (asRecord) {
							result.push(new Record(this, rows[i], this._index));
						} else {
							result.push(rows[i]);
						}
					}
					return result;
		} catch (error) {
			if (error.code == "ER_NO_SUCH_TABLE") {
				console.log(chalk.white.bold.inverse(" DATABASE ")+" "+"Error: table '"+this._opts.table+"' does not exist.");
				throw "table '"+this._opts.table+"' does not exist";
			} else {
				this._opts.db._onError(error);
				throw error;
			}
		}
	}
	
	selectRecordsRaw(sql, params, asRecord=true) {
		return new Promise((resolve, reject) => {
			var query = this._opts.db.query(sql, params).then( ([rows, fields]) => {
				var result = [];
				for (var i = 0; i < rows.length; i++) {
					if (asRecord) {
						result.push(new Record(this, rows[i], this._index));
					} else {
						result.push(rows[i]);
					}
				}
				return resolve(result);
			}).catch( (error) => {
				if (error.code == "ER_NO_SUCH_TABLE") {
					console.log(chalk.white.bold.inverse(" DATABASE ")+" "+"Error: table '"+this._opts.table+"' does not exist.");
					return reject("table '"+this._opts.table+"' does not exist");
				} else {
					this._opts.db._onError(error);
					return reject(error);
				}
			});
		});
	}
	
	name() {
		return this._opts.table;
	}
	
	createRecord() {
		return new Record(this, Object.assign({}, this._defaultData), this._index);
	}
}

module.exports = Database;
