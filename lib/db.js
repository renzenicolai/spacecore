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
	}
	
	getIndex() {
		if (this._index in this._data) return this._data[this._index];
		return null;
	}
	
	setIndex(id) {
		if (this._index in this._data) {
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
	
	flush() {
		if (this._dirty) {
			var index = this.getIndex();
			if (index == null) {
				console.log("INSERT");
				return this._table._createRecordInternal(this);
			} else {
				console.log("UPDATE");
				return this._table._updateRecordInternal(this);
			}
		}
		console.log("NOT DIRTY");
		return false;
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
		this._initSchema();
		this._index = null;
	}
	
	_generateDefaultData(columns) {
		var result = {};
		for (var i = 0; i < columns.length; i++) {
			var type = this._columns[i].DATA_TYPE;
			var data = null;
			/*if (type=="int") {
				data = 0;
			} else if (type=="tinyint") {
				data = 0;
			} else if (type=="varchar") {
				data = "";
			} else if (type=="decimal") {
				data = 0.00;
			} else if (type=="longtext") {
				data = "";
			} else {
				console.log('[DATABASE] Error: unknown data type `'+type+'` in table `'+this._opts.table+'`!');
			}*/
			result[this._columns[i].COLUMN_NAME] = data;
		}
		this._defaultData = result;
		return result;
	}
	
	_initSchema() {
		var query = this._opts.db.connection.execute("select * from information_schema.columns where table_schema=? and table_name=?;", [this._opts.db._opts.database, this._opts.table]).then( ([rows, fields]) => {
			this._columns = rows;
			//console.log(rows);
			this._generateDefaultData(rows);
			this._index = null;
			for (var i = 0; i < this._columns.length; i++) {
				var type = this._columns[i].COLUMN_KEY;
				if (type=="PRI") {
					if (this._index!=null) {
						console.log("[DATABASE] Error: table '"+this._opts.table+"' has multiple primary indexes.",this._columns);
					} else {
						this._index = this._columns[i].COLUMN_NAME;
					}
				}
			}
			if (this._index == null) {
				console.log("Table "+this._opts.table+" has no primary index. A primary index is required for all tables!");
			}
		}).catch(this._opts.db._errorHandler);
	}
	
	_createRecordInternal(record) {
		var cols = [];
		var valuePlaceholders = [];
		var values = [];
		var fields = record.getFields();
		for (var field in fields) {
			cols.push(mysql.escapeId(field));
			values.push(fields[field]);
			valuePlaceholders.push('?');
		}
				
		return new Promise((resolve, reject) => {
			var sql = "INSERT INTO "+mysql.escapeId(this._opts.table)+" ("+cols.join(", ")+") VALUES ("+valuePlaceholders.join(", ")+");";
			console.log(sql);
			console.log(values);
			var query = this._opts.db.connection.execute(sql, values).then( ([result]) => {
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
	
	_updateRecordInternal(record) {
		if (this._index == null) return new Promise((resolve, reject) => { reject("Update not possible: table has no index."); });
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
				
		return new Promise((resolve, reject) => {
			var sql = "UPDATE "+mysql.escapeId(this._opts.table)+" SET "+cols.join(", ")+" WHERE "+mysql.escapeId(this._index)+" = ?;";
			console.log(sql);
			console.log(values);
			var query = this._opts.db.connection.execute(sql, values).then( ([result]) => {
				console.log(result);
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
	
	list(where={}) {
		return new Promise((resolve, reject) => {
			if (typeof where !== 'object') return reject("Invalid where");
			return this.selectRecords(where).then((records) => {
				var result = [];
				for (var i = 0; i<records.length; i++) {
					result.push(records[i].getFields());
				}
				return resolve(result);
			}).catch((error) => { return reject(error); });
		});
	}
	
	selectRecords(whereParams,extra="") {
		var whereKeys = [];
		var whereValues = [];
		
		for (var item in whereParams) {
			//console.log(item);
			if ((typeof whereParams[item] === "string") || (typeof whereParams[item] === "number") || (typeof whereParams[item] === "boolean")) {
				whereKeys.push(mysql.escapeId(item)+" = ?");
				whereValues.push(whereParams[item]);
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
				if (i < whereKeys.length - 1) where += ' and ';
				//console.log("loop ",i);
			}
		}
		
		//console.log('where:',whereKeys,whereValues);
		
		if (extra!="") extra = " "+extra;
		
		return new Promise((resolve, reject) => {
			var sql = "SELECT * FROM "+mysql.escapeId(this._opts.table)+" "+where+extra+";";
			//console.log(sql);
			var query = this._opts.db.connection.execute(sql, whereValues).then( ([rows, fields]) => {
				var result = [];
				for (var i = 0; i < rows.length; i++) {
					result.push(new Record(this, rows[i], this._index));
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
		return new Record(this, this._defaultData);
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
			onConnect: null
		}, opts);
		
		this._tables = [];
		
		this.connection = null;
		
		mysqlPromise.createConnection(this._opts)
			.then(this._connectHandler.bind(this))
			.catch(this._errorHandler.bind(this));
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
	
	_refreshTables() {
		
		return this.connection.execute("SELECT table_name FROM information_schema.tables where table_schema=?;", [this._opts.database]).then( ([rows, fields]) => {
			
			/*if (this._tables.length > 0) {
				console.log("[DATABASE] Flushing cache...");
				for (var i = 0; i < this._tables.length; i++) {
					this._tables[i].flush();
				}
			}*/
			
			this._tables = [];
			
			for (var i = 0; i < rows.length; i++) {
				console.log("[DATABASE] Creating table '"+rows[i].table_name+"'...");
				this._tables.push(new Table({
					db: this,
					table: rows[i].table_name
				}));
			}
			
			return Promise.resolve();
		}).catch(this._errorHandler);
	}
	
	_connectHandler( conn ) {
		this.connection = conn;
		console.log("[DATABASE] Connected to MySQL server");
		this._refreshTables().then((x) => {
			if (this._opts.onConnect != null) {
				this._opts.onConnect();
			}	
		});
	}
		
	_errorHandler( error ) {
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
