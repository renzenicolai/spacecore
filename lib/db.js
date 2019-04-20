"use strict";

const mysql = require('mysql2');
const mysqlPromise = require('mysql2/promise');

class Record {
	/* This class describes a generic database record */
	
	constructor( table, data, index ) {
		this._table = table;
		this._data = data;
		this._dirty = false;
		this._index = index;
		this._subRecords = [];
	}
	
	addSubRecord(keyName, record) {
		this._subRecords.push({key: keyName, record: record});
	}
	
	getIndex() {
		if (this._index in this._data) return this._data[this._index];
		return null;
	}
	
	setIndex(id, create=false) {
		if (this._index in this._data || create) {
			this._data[this._index] = id;
			return true;
		}
		return false;
	}
	
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
	
	setFields(data,force=false) {
		if (!force){
			for (var i in data) {
				if (!(i in this._data)) return false;
			}
		}
		
		this._data = data;
		this._dirty = true;
		this.populate();
		
		return true;
	}
	
	getFields() {
		return this._data;
	}
	
	getKeys() {
		var keys = [];
		for (var i in this._data) keys.push(i);
		return keys;
	}
	
	isDirty() {
		return this._dirty;
	}
	
	print() {
		console.log(this._table.name()+" record");
		console.log("=============================");
		for (var i in this._data) {
			console.log(i+":\t"+this._data[i]);
		}
		console.log("=============================");
	}
	
	setFieldDate(field, dateObject=null) {
		if (dateObject === null) dateObject = new Date();
		return this.setField(field, Math.floor(dateObject / 1000));
	}
	
	getFieldDate(field) {
		return new Date(this.getField(field)*1000);
	}
	
	_flushSubRecords(transaction=null) {
		var promises = [];
		for (var item in this._subRecords) {
			console.log("Now handling subrecord",item,"with key column",this._subRecords[item].key,"set to",this.getIndex());
			this._subRecords[item].record.setField(this._subRecords[item].key, this.getIndex());
			promises.push(this._subRecords[item].record.flush(transaction, true));
		}
		return Promise.all(promises).then((results) => {
			return true;
		});
	}
	
	flush(transaction=null, recursive=false) {
		if (this._dirty) {
			var index = this.getIndex();
			if (index == null) {
				return this._table._createRecordInternal(this, transaction).then((result) => {
					this.setIndex(result, true);
					if (recursive) {
						return this._flushSubRecords(transaction); //Sub-records
					}
					return this.getIndex(); //Created, return id.
				});
			} else {
				return this._table._updateRecordInternal(this, transaction).then((result) => {
					if (recursive) {
						return this._flushSubRecords(transaction); //Sub-records
					}
					return this.getIndex(); //Updated, return id.
				});
			}
		}

		if (recursive) {
			return this._flushSubRecords(); //Sub-records
		}
		
		return false; //No change.
	}
	
	destroy(transaction=null) {
		var index = this.getIndex();
		if (index === null) return false;
		
		return this._table._destroyRecordInternal(this, transaction).then((result) => {
			this.setIndex(null);
			return true;
		});
	}
}

class dbTransaction {
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
		this.log("Created.");
		return this;
	}
	
	message(message) {
		this.log("Message: "+message);
	}
	
	logQuery(query, params) {
		this.log("Query: '"+query+"' "+JSON.stringify(params));
	}
	
	log(message) {
		var line = "Transaction "+this.createdOn+" - "+this.description+": "+message;
		console.log(line);
		this.logFile.write(line+"\n");
	}
	
	async commit() {
		if (this.connection !== null) {
			this.log("Commit started.");
			await this.connection.commit();
			this.log("Commit completed.");
			await this.connection.release();
			this.log("Connection released.");
		} else {
			this.log("Commit error.");
			process.exit(1);
		}
		this.connection = null;
	}
	
	async rollback() {
		try {
			if (this.connection !== null) {
				this.log("Rollback started.");
				await this.connection.rollback();
				this.log("Rollback completed.");
				if (this.connection !== null) {
					await this.connection.release();
					this.log("Connection released.");
				} else {
					this.log("Connection NULL.");
				}
			} else {
				this.log("Rollback error: connection null.");
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

class Table {
	constructor( opts = {} ) {
		this._opts = Object.assign({
			db: null,
			table: null
		}, opts);
		
		this._columns = [];
		this._defaultData = {};
		this._index = null;
		this._connection = null;
	}
			
	_generateDefaultData(columns) {
		var result = {};
		for (var i = 0; i < columns.length; i++) {
			var type = this._columns[i].DATA_TYPE;
			result[this._columns[i].COLUMN_NAME] = null;
		}
		this._defaultData = result;
		return result;
	}
	
	initSchema() {
		return this._opts.db._executeQuery("select * from information_schema.columns where table_schema=? and table_name=?;", [this._opts.db._opts.database, this._opts.table]).then( ([rows, fields]) => {
			this._columns = rows;
			this._generateDefaultData(rows);
			this._index = null;
			this._columnString = "";
			this._isNullable = [];
			for (var i = 0; i < this._columns.length; i++) {
								
				var name = this._columns[i]['COLUMN_NAME'];
				var dataType = this._columns[i]['DATA_TYPE'];
				
				this._isNullable[name] = (this._columns[i]['IS_NULLABLE'] === 'YES');
				
				if (dataType === "timestamp") {
					this._columnString += "UNIX_TIMESTAMP(`"+name+"`) AS `"+name+"`";
				} else {
					this._columnString += "`"+name+"`";
				}
				if (i < this._columns.length - 1) this._columnString += ", ";
				
				var type = this._columns[i].COLUMN_KEY;
				if (type=="PRI") {
					if (this._index!=null) {
						throw "[DATABASE] Error: table '"+this._opts.table+"' has multiple primary indexes.";
					} else {
						this._index = this._columns[i].COLUMN_NAME;
					}
				}
			}
			if (this._index == null) {
				console.log("Table "+this._opts.table+" has no primary index. A primary index is required for all tables!");
			}
			//console.log("[DATABASE] Schema for table '"+this._opts.table+"' loaded.");
		}).catch(this._opts.db._errorHandler);
	}
	
	_createRecordInternal(record, transaction=null) {
		var cols = [];
		var valuePlaceholders = [];
		var values = [];
		var fields = record.getFields();
		for (var field in fields) {
			cols.push(mysql.escapeId(field));
			if (this._getColumnTypeForColumnName(field) === "timestamp") {
				throw "Error: inserting a timestamp into the database is not supported!!";
			}

			if (this._opts.db._opts.useTimestampHack) {
				//Automatically fill out the timestamp fields with the current time if the timestamp may not be null
				if ((fields[field] === null) && (!this._isNullable[field])) {
					//Field is null and can not be null, this normally results in an error
					if (field.startsWith('timestamp')) {
						//But for timestamp fields we make an exception...
						record.setFieldDate(field); //Without a date object this defaults to the current date
						fields[field] = record.getField(field);
					}
				}
			}
			
			values.push(fields[field]);
			valuePlaceholders.push('?');
		}
				
		return new Promise((resolve, reject) => {
			var sql = "INSERT INTO "+mysql.escapeId(this._opts.table)+" ("+cols.join(", ")+") VALUES ("+valuePlaceholders.join(", ")+");";
			console.log(sql);
			//console.log(values);
			var query = this._opts.db._executeQuery(sql, values, transaction).then( ([result]) => {
				return resolve(result.insertId);
			}).catch( (error) => {
				if (error.code == "ER_NO_SUCH_TABLE") {
					console.log("[DATABASE] Error: table '"+this._opts.table+"' does not exist.");
					return reject("table '"+this._opts.table+"' does not exist");
				} else {
					this._opts.db._errorHandler(error);
					return reject(error);
				}
			});
		});
	}
	
	_destroyRecordInternal(record, transaction=null) {
		return new Promise((resolve, reject) => {
			var sql = "DELETE FROM "+mysql.escapeId(this._opts.table)+" WHERE "+mysql.escapeId(this._index)+" = ?";
			var query = this._opts.db._executeQuery(sql, [record.getIndex()], transaction).then( ([result]) => {
				return resolve(result);
			}).catch( (error) => {
				if (error.code == "ER_NO_SUCH_TABLE") {
					console.log("[DATABASE] Error: table '"+this._opts.table+"' does not exist.");
					return reject("table '"+this._opts.table+"' does not exist");
				} else {
					this._opts.db._errorHandler(error, transaction);
					return reject(error);
				}
			});
		});
	}
	
	_getColumnTypeForColumnName(query) {
		for (var i in this._columns) {
			var name = this._columns[i]['COLUMN_NAME'];
			var dataType = this._columns[i]['DATA_TYPE'];
			if (name === query) return dataType;
		}
		return null;
	}
	
	_updateRecordInternal(record, transaction=null) {
		if (this._index == null) return new Promise((resolve, reject) => { reject("Update not possible: table has no index."); });
		var cols = [];
		var values = [];
		var fields = record.getFields();
		for (var field in fields) {
			if (field != this._index) {
				if (this._getColumnTypeForColumnName(field) === "timestamp") {
					throw "Error: updating a timestamp in the database is not supported!!";
				}
				cols.push(mysql.escapeId(field)+" = ?");
				values.push(fields[field]);
			}
		}
		
		values.push(record.getIndex());
				
		return new Promise((resolve, reject) => {
			var sql = "UPDATE "+mysql.escapeId(this._opts.table)+" SET "+cols.join(", ")+" WHERE "+mysql.escapeId(this._index)+" = ?;";
			//console.log(sql);
			//console.log(values);
			var query = this._opts.db._executeQuery(sql, values, transaction).then( ([result]) => {
				//console.log(result);
				return resolve(result);
			}).catch( (error) => {
				if (error.code == "ER_NO_SUCH_TABLE") {
					console.log("[DATABASE] Error: table '"+this._opts.table+"' does not exist.");
					return reject("table '"+this._opts.table+"' does not exist");
				} else {
					this._opts.db._errorHandler(error, transaction);
					return reject(error);
				}
			});
		});
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
	
	selectRecords(whereParams,extra="", whereKeysSeparator="AND", asRecord=true) {
		var whereKeys = [];
		var whereValues = [];
		
		for (var item in whereParams) {
			//console.log(item);
			//console.log("Where?",item,whereParams[item], typeof whereParams[item]);
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
				return new Promise((resolve, reject) => { reject("Invalid where value type ["+(typeof whereParams[item])+"]"); });
			}
		}
		
		var where = "";
		if (whereKeys.length>0) {
			where = "where ";
			for (var i = 0; i < whereKeys.length; i++) {
				where += whereKeys[i];
				if (i < whereKeys.length - 1) where += ' '+whereKeysSeparator+' ';
				//console.log("loop ",i);
			}
		}
		
		//console.log('where:',whereKeys,whereValues);
				
		if (extra!="") extra = " "+extra;
		
		
		return new Promise((resolve, reject) => {
			var sql = "SELECT "+this._columnString+" FROM "+mysql.escapeId(this._opts.table)+" "+where+extra+";";
			var query = this._opts.db._executeQuery(sql, whereValues).then( ([rows, fields]) => {
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
					console.log("[DATABASE] Error: table '"+this._opts.table+"' does not exist.");
					return reject("table '"+this._opts.table+"' does not exist");
				} else {
					this._opts.db._errorHandler(error);
					return reject(error);
				}
			});
		});
	}
	
	selectRecordsRaw(sql, params, asRecord=true) {
		return new Promise((resolve, reject) => {
			var query = this._opts.db._executeQuery(sql, params).then( ([rows, fields]) => {
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
					console.log("[DATABASE] Error: table '"+this._opts.table+"' does not exist.");
					return reject("table '"+this._opts.table+"' does not exist");
				} else {
					this._opts.db._errorHandler(error);
					return reject(error);
				}
			});
		});
	}
	
	schema() {
		return this._columns();
	}
	
	name() {
		return this._opts.table;
	}
	
	createRecord() {
		return new Record(this, Object.assign({}, this._defaultData), this._index);
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
			logFile: null,
			useTimestampHack: true
		}, opts);
		
		this._tables = [];
		
		this.connection = null;
		
		this._pool = mysqlPromise.createPool({
			host: this._opts.host,
			port: this._opts.port,
			user: this._opts.user,
			password: this._opts.password,
			database: this._opts.database
		});
		//	.then(this._connectHandler.bind(this))
		//	.catch(this._errorHandler.bind(this));
		this._connectHandler();
	}
	
	transaction(description="") {
		return new dbTransaction(this._pool, this._opts.logFile, description);
	}
		
	registerRpcMethods(rpc, prefix) {
		if (prefix!="") prefix = prefix + "/";
		rpc.addMethod(prefix+"select", (params) => {
			return new Promise((resolve, reject) => {
				if (params.length>0 && params.length<3) {
					var table = this.table(params[0]);
					if (table==null) return reject("table does not exist");
					var where={};
					if (params.length==2) {
						where=params[1];
					}
					return table.selectRecords(where).then((records) => {
						var result = [];
						for (var i = 0; i<records.length; i++) {
							result.push(records[i].getFields());
						}
						return resolve(result);
					}).catch((error) => { reject(error); });
				} else {
					return reject("invalid parameter count");
				}
			});
		});	
	}
	
	
	table(table) {
		if (this._tables.length<1) {
			this._refreshTables();
			//console.log("DB REFRESH TABLES");
		}
		for (var i = 0; i<this._tables.length; i++) {
			if (this._tables[i].name()==table) return this._tables[i];
		}
		return null;
	}
		
	_executeQuery(query, opts, transaction=null) {
		if (transaction !== null) transaction.logQuery(query, opts);
		if (transaction !== null && transaction.connection === null) {
			transaction.message("ERROR!");
			process.exit(1);
		}
		if (transaction === null || transaction.connection === null) {
			return this._pool.execute(query, opts);
		} else {
			return transaction.connection.execute(query, opts);
		}
	}
	
	_refreshTables() {
		return this._executeQuery("SELECT table_name FROM information_schema.tables where table_schema=?;", [this._opts.database]).then( ([rows, fields]) => {
			
			/*if (this._tables.length > 0) {
				console.log("[DATABASE] Flushing cache...");
				for (var i = 0; i < this._tables.length; i++) {
					this._tables[i].flush();
				}
			}*/
			
			this._tables = [];
			var promises = [];
			
			for (var i = 0; i < rows.length; i++) {
				console.log("[DATABASE] Creating table '"+rows[i].table_name+"'...");
				var table = new Table({
					db: this,
					table: rows[i].table_name
				});
				this._tables.push(table);
				promises.push(table.initSchema());
			}
			
			return Promise.all(promises);
		}).catch(this._errorHandler);
	}
	
	_connectHandler( conn ) {
		this.connection = conn;
		console.log("[DATABASE] Connected to MySQL server");
		this._refreshTables().then((x) => {
			//console.log("[DATABASE] Database layer started");
			if (this._opts.onConnect != null) {
				this._opts.onConnect();
			}	
		});
	}
		
	_errorHandler(error, transaction=null) {
		
		if (transaction !== null) {
			console.log("Error occured during database transaction, executing rollback!");
			transaction.rollback();
		}
		
		if (error.code == "ECONNREFUSED") {
			console.log("Fatal error: could not connect to the database backend.");
			process.exit(1);
		} else if(error.fatal) {
			console.log("Fatal error in database backend: ", error);
			process.exit(1);
		} else {
			console.log('Error in database backend: ', error);
			//process.exit(1);
		}
	}
}

module.exports = Database;
