"use strict";

const mime   = require('mime-types');
const pdf    = require('./export_invoice_pdf.js');
const fs     = require('fs');
const stream = require('stream');
const chalk  = require('chalk');

class WritableBufferStream extends stream.Writable {
		constructor(options) {
			super(options);
			this._chunks = [];
		}

		_write (chunk, enc, callback) {
			this._chunks.push(chunk);
			return callback(null);
		}

		_destroy(err, callback) {
			this._chunks = null;
			return callback(null);
		}

		toBuffer() {
			return Buffer.concat(this._chunks);
		}
	}

class Invoices {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table: 'invoices',
			table_rows: 'invoice_rows',
			table_rows_stock_mapping: 'product_stock_mapping',
			persons: null,
			products: null,
			mqtt: null,
			mqtt_topic: null
		}, opts);
		if (this._opts.database === null) {
			console.log("The invoice module can not be started without a database!");
			process.exit(1);
		}
		this._table                    = this._opts.database.table(this._opts.table);
		this._table_rows               = this._opts.database.table(this._opts.table_rows);
		this._table_rows_stock_mapping = this._opts.database.table(this._opts.table_rows_stock_mapping);
	}
	
	select(where={}, extra="", separator="AND") {
		return this._table.selectRecords(where, extra, separator);
	}

	async list(session, params, whereKeySeparator="AND", resolvePersons=false) {
		let invoices = await this._table.list(params, whereKeySeparator);
		let rowPromises = [];
		let personPromises = [];
		for (let i in invoices) {
			rowPromises.push(this._table_rows.selectRecords({"invoice_id":invoices[i].id},"","AND",false));
			if (resolvePersons) {
				personPromises.push(this._opts.persons.list(session, {id: invoices[i].person_id}));
			}
		}
		
		if (resolvePersons) {
			let persons = await Promise.all(personPromises);
			for (let i in persons) {
				if (persons[i].length < 1) throw "Unknown person in invoice";
				invoices[i].person = persons[i][0];
			}
		}
		
		let rows = await Promise.all(rowPromises);
		for (let i in rows) {
			invoices[i].rows = rows[i];
		}
		
		return invoices;
	}
	
	async listLast(session, params) {
		let filter = {};
		let amount = 5;
		
		if (typeof params === 'object') {
			if ("amount" in params) {
				if (typeof params.amount === 'number') {
					amount = params.amount;
				} else {
					throw "Amount should be a number!";
				}
			}
			if ("query" in params) {
				filter = params.query;
			}
		} else if (typeof params === 'number') {
			amount = params;
		} else {
			throw "Invalid parameter type!";
		}
				
		return this._table.listExtra(filter, "ORDER BY `timestamp` DESC LIMIT "+amount).then((result) => {
			let promises = [];
			for (let i in result) {
				promises.push(this._table_rows.selectRecords({"invoice_id":result[i].id},"","AND",false));
			}
			return Promise.all(promises).then((resultArray) => {
				for (let i in resultArray) {
					result[i].rows = resultArray[i];
				}
				return result;
			});
		});
	}
	
	/*async listQuery(session, params) {		
		let query = params[0];
		let amount = null;
		
		if (params.length > 1) {
			amount = params[1];
			if (typeof amount !== "number") {
				throw "Invalid amount param.";
			}
		}
		
		let limit = "";
		if (amount !== null) {
			limit = "DESC LIMIT "+amount;
		}
		
		let result = await this._table.listExtra(query, "ORDER BY `timestamp`"+limit);
		
		let promises = [];
		for (let i in result) {
			promises.push(this._table_rows.selectRecords({"invoice_id":result[i].id},"","AND",false));
		}
		let resultArray = await Promise.all(promises);
		for (let i in resultArray) {
			result[i].rows = resultArray[i];
		}
		
		return result;
	}*/
	
	async _notifyMqtt(data) {
		try {
			if (this._opts.mqtt) {
				this._opts.mqtt.send(this._opts.mqtt_topic, JSON.stringify(data));
			}
		} catch(error) {
			console.log("MQTT error",error);
		}
	}
	
	async create(session, params) {
		// Basic checks
		if (!("person_id" in params))                            throw "Please provide a person_id in params.";
		if ((!("products" in params)) && (!("other" in params))) throw "Please provide products or other rows in params.";
		
		console.log(chalk.bgCyan.white.bold(" INVOICE ")+" Creating invoice for "+params.person_id+"...");
		
		// Find the person
		let persons = await this._opts.persons.listForVendingNoAvatar(session, {"id": params.person_id});
		if (persons.length < 1 || persons.length > 1) throw "Person not found!";
		let person = persons[0];
		let person_record = await this._opts.persons.getRecord(person.id);
		
		// Products added to the invoice
		let product_amounts       = {};
		let product_promises      = [];
		if ("products" in params) {
			for (let i in params.products) {
				if (typeof params.products[i] === "number") {
					if (params.products[i] in product_amounts) {
						product_amounts[params.products[i]]++;
					} else {
						product_amounts[params.products[i]] = 1;
						product_promises.push(this._opts.products.listNoImg(session, {"id":params.products[i]}));
					}
				} else if (
					typeof params.products[i] === "object" && 
					"id" in params.products[i] &&
					typeof params.products[i].id === "number"
				) {
					let amount = 1;
					if ("amount" in params.products[i] && typeof params.products[i].amount === "number") {
						amount = params.products[i].amount;
					}
					if (params.products[i].id in product_amounts) {
						product_amounts[params.products[i].id] += amount;
					} else {
						product_amounts[params.products[i].id] = amount;
						product_promises.push(this._opts.products.list(session, {"id":params.products[i].id}));
					}
				} else {
					throw "Products should be either the product id or an object: {'id':..., 'amount':..., 'stock':...}";
				}
			}
		}
		let product_results = await Promise.all(product_promises);
			
		let stock_promises = [];
		
		for (let product in product_results) {
			if (product.length < 0 || product.length > 1) {
				throw "Invalid product id provided.";
			}
			let product_id = product_results[product][0].id;
			stock_promises.push(this._opts.products.listStockRecords(session, {'product_id': product_id, 'amount_current':{">":0}}));
		}
		
		let stockRecords = await Promise.all(stock_promises);
		
		let invoice_rows = [];
		let invoice = this._table.createRecord();
		invoice.setField("person_id", person.id);
		let invoice_total = 0;
		let selectedStock = [];
		for (let i in product_results) {
			if (product_results[i].length < 0 || product_results[i].length > 1) {
				throw "Invalid product id provided.";
			}
			let product = product_results[i][0];
			let stockList = stockRecords[i];
			let amount = product_amounts[product.id];
			
			let record = this._table_rows.createRecord();
			record.setField("product_id", product.id);
			let description = product.name;
			if (product.package_id !== null) description += " ("+product.package.name+")";
			record.setField("description", description);
			let price = 0xFFFFFFFFFFFFFFFF;
			let price_valid = false;
			for (let j in product.prices) {
				let price_available = false;
				for (let k in person.groups) {
					if (product.prices[j].person_group_id === person.groups[k].id) {
						price_available = true;
						break;
					}
				}
				if (price_available) {
					if (product.prices[j].amount < price) {
						price = product.prices[j].amount;
						price_valid = true;
					}
				}
			}
			if (!price_valid) {
				throw product.name+" can not be bought by "+person.nick_name+".";
			}
			record.setField("price", price);
			record.setField("amount", product_amounts[product.id]);
			invoice_total += price*product_amounts[product.id];
					
			let blockIfNotInStock = false;

			let amountRemaining = amount;
			for (let item in stockList) {
				if (amountRemaining > 0) {
					let currentStockId = stockList[item].getIndex();
					let amountInCurrentStock = stockList[item].getField("amount_current");
					let amountFromCurrentStock = 0;
					if (amountInCurrentStock >= amountRemaining) {
						amountFromCurrentStock = amountRemaining;
						amountRemaining = 0;
					} else {
						amountFromCurrentStock = amountInCurrentStock;
						amountRemaining -= amountInCurrentStock;
					}
					stockList[item].setField("amount_current", amountInCurrentStock - amountFromCurrentStock);
					stockList[item].setFieldDate("timestamp_current"); //Update to current timestamp
					selectedStock.push(stockList[item]);
					
					//This creates the mapping record that links each stock mutation to the invoice row responsible
					//Note that the invoice row id still needs to be added. This is done once the invoice row id is known.
					let mappingRecord = this._table_rows_stock_mapping.createRecord();
					mappingRecord.setField("product_stock_id", currentStockId);
					mappingRecord.setField("amount", amountFromCurrentStock);
					record.addSubRecord("invoice_row_id", mappingRecord); //Now there is a record in your record, so you can flush your records while you flush your records \(^_^)/
					blockIfNotInStock = true; //If shit hits the fan we stop.
				}
			}
			
			if (blockIfNotInStock && amountRemaining > 0) {
				throw "Not enough items in stock to complete order!";
			}
			
			invoice_rows.push(record);
		}
		
		// Other entries added to the invoice
		if ("other" in params) {
			for (let i in params.other) {
				let otherRecord = this._table_rows.createRecord();
				if ("description" in params.other[i]) {
					otherRecord.setField("description", params.other[i].description);
				} else {
					otherRecord.setField("description", "");
				}
				if ("price" in params.other[i]) {
					otherRecord.setField("price", params.other[i].price);
				} else {
					otherRecord.setField("price", 0);
				}
				if ("amount" in params.other[i]) {
					otherRecord.setField("amount", params.other[i].amount);
				} else {
					otherRecord.setField("amount", 0);
				}
				invoice_rows.push(otherRecord);
				invoice_total += params.other[i].price;
			}
		}
		
		// Fill out the total amount and the timestamp
		invoice.setField("total", invoice_total);
		invoice.setField("timestamp", Math.floor(Date.now() / 1000));
		let balance = person_record.getField("balance");
		
		// Update the persons balance
		person_record.setField("balance", balance - invoice_total);
		
		// Complete the invoice
		let dbTransaction = await this._opts.database.transaction(person_record.getField("nick_name"));
		
		try {
			let flushResult = await invoice.flush(dbTransaction);
			if (!flushResult) throw "Error: invoice not created?!";
			
			let promise_rows = [];
			let invoice_id = invoice.getIndex();
			for (let i in invoice_rows) {
				invoice_rows[i].setField("invoice_id", invoice_id);
				promise_rows.push(invoice_rows[i].flush(dbTransaction, true));
			}
			
			let rowResultArray = await Promise.all(promise_rows);
			for (let i in rowResultArray) {
				if (!rowResultArray[i]) throw "Error: invoice row not created?!";
			}
				
			let selected_stock_promises = [];
			for (let item in selectedStock) {
				selected_stock_promises.push(selectedStock[item].flush(dbTransaction));
			}
			let stockResultArray = await Promise.all(selected_stock_promises);
			
			for (let i in stockResultArray) {
				if (!stockResultArray[i]) throw "Error: stock row not created?!";
			}
			
			let rows = [];
			for (let i in invoice_rows) {
				rows.push(invoice_rows[i].getFields());
			}
			let personResult = await person_record.flush(dbTransaction);
			await dbTransaction.commit();
			let result = {
				"invoice": invoice.getFields(),
				"rows": rows,
				"person": person_record.getFields()
			};
			console.log(chalk.bgCyan.white.bold(" INVOICE ")+" Invoice #"+invoice.getIndex()+" for person "+chalk.red(person_record.getField("nick_name"))+" has been created (total: "+chalk.red(invoice.getField("total"))+").");
			this._notifyMqtt(result);
			return result;
		} catch (error) {
			console.log("Transaction failed, rollback occured! ", error);
			dbTransaction.rollback();
			return error;
		}
	}
	
	/*async analysisStock(session, params) {
		if (typeof params !== 'object') {
			throw "Expected a parameter object.";
		}
		if (typeof params.operation !== 'string') {
			throw "Expected an operation.";
		}
		
		if (params.operation === "unknownOrigin") {
			let rows = await this._table_rows.selectRecordsRaw("SELECT * FROM `invoice_rows` WHERE `id` NOT IN (SELECT invoice_row_id FROM `product_stock_mapping`) AND `price` > 0", [], false);
			
			let rowIds = [];
			let invoiceIds = [];
			
			for (let i in rows) {
				let row = rows[i];
				rowIds.push(row.id);
				if (!(row.invoice_id in invoiceIds)) {
					invoiceIds.push(row.invoice_id);
				}
			}
			
			let invoices = await this.list(session, {id: invoiceIds}, "OR", true);
			
			for (let i in invoices) {
				for (let j in invoices[i].rows) {
					let isUnknown = false;
					let id = invoices[i].rows[j].id;
					if (rowIds.lastIndexOf(id)>=0) {
						isUnknown = true;
					}
					invoices[i].rows[j].isUnknown = isUnknown;
				}
			}
			
			return invoices;
			
		} else {
			throw "Unsupported operation.";
		}
	}*/
	
	async pdf(session, params) {
		if (typeof params !== "number") throw "Expected parameter to be the id of the invoice.";
		
		let invoices = await this.list(session, {id : params}, "AND", true);
		if (invoices.length !== 1) throw "Invoice not found";
		let invoice = invoices[0];
				
		//FIXME!!! Store name and address in the invoice itself
		let clientAddress = invoice.person.first_name+" "+invoice.person.last_name+"\n";
		if (invoice.person.addresses.length > 0) {
			let address = invoice.person.addresses[0]; //FIXME!!! Add method for selecting invoice address
			clientAddress += address.street+" "+address.housenumber+"\n";
			clientAddress += address.postalcode+" "+address.city;
		}
		
		let timestamp = new Date(invoice.timestamp*1000);
		
		let rows = [];
		
		for (let i in invoice.rows) {
			let row = invoice.rows[i];
			rows.push([
					{text: row.description},
					{text: "€ "+(row.price/100).toFixed(2)},
					{text: row.amount.toString()},
					{text: "€ "+((row.price*row.amount)/100).toFixed(2)}
				]);
		}
		
		let month = timestamp.getMonth()+1;
		if (month < 10) {
			month = "0"+month.toString();
		} else {
			month = month.toString();
		}
		
		let day = timestamp.getDate();
		if (day < 10) {
			day = "0"+day.toString();
		} else {
			day = day.toString();
		}
		
		let factuur = {
			date: day+"-"+month+"-"+timestamp.getFullYear(),
			identifier: "SPACECORE #"+invoice.id,
			totals: [{text: "Total", value: "€ "+(invoice.total/100).toFixed(2), bold: true}],
			products: rows};
			
		//TODO: Create setting store for storing info about system owner.
		let businessAddress = "Stichting TkkrLab\nRigtersbleek-zandvoort 10\n7521BE Enschede\nIBAN: NL57ABNA0408886641\nKvK: 51974967";
				
		let converter = new WritableBufferStream();
		
		let end = new Promise(function(resolve, reject) {
			converter.on('finish', () => {
				resolve(converter.toBuffer());
			});
		});
		
		let invoiceRenderer = new pdf();
		invoiceRenderer.render(converter, clientAddress, businessAddress, factuur.products, factuur.totals, factuur.identifier, factuur.date);
		
		let buffer = await end;
		
		return {
			name: "invoice.pdf",
			mime: "application/pdf",
			size: buffer.length,
			data: buffer.toString('base64')
		};
	}
	
	registerRpcMethods(rpc, prefix="invoice") {
		if (prefix!=="") prefix = prefix + "/";

		/*
		 * List invoices
		 *
		 * Retrieve a list of invoices that fits the supplied query
		 * 
		 */
		rpc.addMethod(
			prefix+"list",
			this.list.bind(this),
			[
				{
					name: 'query',
					type: 'any',
					description: 'Database query'
				}
			]
		);

		/*
		 * List latest invoices
		 *
		 * Retrieve a list containing the latest invoices that fits the supplied query
		 * The amount of invoices returned can be controlled using the amount parameter and defaults to 5
		 * 
		 */
		rpc.addMethod(
			prefix+"list/last",
			this.listLast.bind(this),
			[
				{
					name: 'amount',
					type: 'number',
					description: 'Amount of invoices'
				},
				{
					type: 'object',
					optional: {
						amount: {
							type: 'number',
							description: 'Amount of invoices'
						},
						query: {
							type: 'any',
							description: 'Database query'
						}
					}
				}
			]
		);

		/*
		 * List invoices by query
		 *
		 * 
		 * 
		 */
		/*rpc.addMethod(
			prefix+"list/query",
			this.listQuery.bind(this)
		);*/

		/*
		 * Create invoice
		 *
		 * Create an invoice for a person containing products, other invoice rows or both
		 * 
		 */
		rpc.addMethod(
			prefix+"create",
			this.create.bind(this),
			[
				{
					type: 'object',
					required: {
						person_id: {
							type: 'number',
							description: 'Identifier of a person'
						}
					},
					optional: {
						products: {
							type: 'array',
							description: 'List of products'
						},
						other: {
							type: 'array',
							description: 'List of other invoice rows'
						}
					}
				}
			]
		);

		/*
		 * Analysis: stock
		 *
		 * 
		 * 
		 */
		/*rpc.addMethod(
			prefix+"analysis/stock",
			this.analysisStock.bind(this)
		);*/

		/*
		 * PDF invoice
		 *
		 * Export an invoice as PDF
		 * 
		 */
		rpc.addMethod(
			prefix+"pdf",
			this.pdf.bind(this),
			[
				{
					name: 'id',
					type: 'number',
					description: 'Invoice identifier'
				}
			]
		);
	}
}

module.exports = Invoices;
