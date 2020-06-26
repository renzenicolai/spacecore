'use strict';

const mysql        = require('mysql2');
const mysqlPromise = require('mysql2/promise');
const chalk        = require('chalk');

class Transaction {
	constructor(pool, logFile=null, description="not provided", verbose=false) {
		this.description = description;
		this.createdOn = new Date();
		this.connection = null;
		this.pool = pool;
		this.logFile = logFile;
		this.verbose = verbose;
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
		if (this.verbose) console.log(chalk.white.bold.inverse(" DATABASE ")+" "+chalk.yellow(line));
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
			logFile: null,
			verbose: false
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
	}
	
	async end() {
		if (this._pool !== null) {
			await this._pool.end();
			this._pool = null;
			//console.log(chalk.white.bold.inverse(" DATABASE ")+" "+chalk.yellow("Pool closed"));
		}
	}
	
	/* Event handlers */
	
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
		return new Transaction(this._pool, this._opts.logFile, description, this._opts.verbose);
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
	
	getName() {
		return this._opts.database;
	}
}

module.exports = Database;
