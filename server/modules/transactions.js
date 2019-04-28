"use strict";

const mime = require('mime-types');

class Transactions {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table: 'transactions',
			table_rows: 'transaction_rows',
			table_rows_stock_mapping: 'product_stock_mapping',
			persons: null,
			products: null
		}, opts);
		if (this._opts.database === null) {
			console.log("The transactions module can not be started without a database!");
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
		return this._table.list(params, whereKeySeparator).then(async (result) => {
			var promises = [];
			for (var i in result) {
				promises.push(this._table_rows.selectRecords({"transaction_id":result[i].id},"","AND",false));
			}
			
			if (resolvePersons) {
				var personPromises = [];
				for (var i in result) {
					personPromises.push(this._opts.persons.list({id: result[i].person_id}));
				}
				var persons = await Promise.all(personPromises);
				for (var i in persons) {
					if (persons[i].length < 1) {
						throw "Unknown person in transaction?!";
					}
					result[i].person = persons[i][0];
				}
			}
			
			return Promise.all(promises).then((resultArray) => {
				
				for (var i in resultArray) {
					result[i].rows = resultArray[i];
					
				}
				return result;
			});
		});
	}
	
	async listLast(session, params) {
		var filter = {};
		var amount = 5;
		
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
			var promises = [];
			for (var i in result) {
				promises.push(this._table_rows.selectRecords({"transaction_id":result[i].id},"","AND",false));
			}
			return Promise.all(promises).then((resultArray) => {
				for (var i in resultArray) {
					result[i].rows = resultArray[i];
				}
				return result;
			});
		});
	}
	
	listQuery(session, params) {
		if ((typeof params !== "object") || (params.length < 1) || (params.length > 2)) {
			return new Promise((resolve, reject) => {return reject("Invalid param.");});
		}
		var query = params[0];
		var amount = null;
		if (params.length > 1) {
			amount = params[1];
			if (typeof amount !== "number") {
				return new Promise((resolve, reject) => {return reject("Invalid amount param.");});
			}
		}
		var limit = "";
		if (amount != null) {
			limit = "DESC LIMIT "+amount;
		}
		return this._table.listExtra(query, "ORDER BY `timestamp`"+limit).then((result) => {
			var promises = [];
			for (var i in result) {
				promises.push(this._table_rows.selectRecords({"transaction_id":result[i].id},"","AND",false));
			}
			return Promise.all(promises).then((resultArray) => {
				for (var i in resultArray) {
					result[i].rows = resultArray[i];
				}
				return result;
			});
		});
	}
	
	async execute(session, params) {
		if (!("person_id" in params)) {
			throw "Please provide a person_id in params.";
		}
		if ((!("products" in params)) && (!("other" in params))) {
			throw "Please provide products or other rows in params.";
		}

		var persons = await this._opts.persons.list(session, {"id": params.person_id});
		if (persons.length < 1 || persons.length > 1) {
			throw "Person not found!";
		}
		var person = persons[0];
		
		return this._opts.persons.getRecord(person.id).then(person_record => {
			
			var product_amounts = {};
			var product_stocks = {};
			var product_stock_request = {};
			var product_promises = [];
			
			if ("products" in params) {
				for (var i in params.products) {
					if (typeof params.products[i] === "number") {
						if (params.products[i] in product_amounts) {
							product_amounts[params.products[i]]++;
						} else {
							product_amounts[params.products[i]] = 1;
							product_promises.push(this._opts.products.list(session, {"id":params.products[i]}));
						}
					} else if (
						typeof params.products[i] === "object" && 
						"id" in params.products[i] &&
						typeof params.products[i].id === "number"
					) {
						var amount = 1;
						if ("amount" in params.products[i] && typeof params.products[i].amount === "number") {
							amount = params.products[i].amount;
						}
						//Since we are using FIFO for stock management the user can not state which stock entries to use. This might change in the future, I'm leaving the logic in here.
						/*if ("stock" in params.products[i] && typeof params.products[i].stock === "number") {
							product_stock_request[params.products[i].id] = [params.products[i].stock];
						} else if ("stock" in params.products[i] && Array.isArray(params.products[i].stock)) {
							product_stock_request[params.products[i].id] = params.products[i].stock;
						}*/
						if ("stock" in params.products[i]) {
							console.log("Warning: stock row selection is disabled!");
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
							
			return Promise.all(product_promises).then((product_results) => {
				var stock_promises = [];
				
				for (var product in product_results) {
					if (product_results[i].length < 0 || product_results[i].length > 1) {
						return new Promise(function(resolve, reject) {
							return reject("Invalid product id provided.");
						});
					}
					var product_id = product_results[product][0]['id'];
					stock_promises.push(this._opts.products.listStockRecords(session, {'product_id': product_id, 'amount_current':{">":0}}));
				}
				
				return Promise.all(stock_promises).then((stockRecords) => {					
					var transaction_rows = [];
					var transaction = this._table.createRecord();
					transaction.setField("person_id", person.id);
					var transaction_total = 0;
					for (var i in product_results) {
						if (product_results[i].length < 0 || product_results[i].length > 1) {
							return new Promise(function(resolve, reject) {
								return reject("Invalid product id provided.");
							});
						}
						var product =  product_results[i][0];
						var stockList = stockRecords[i];
						var requestedStockList = [];
						var amount = product_amounts[product.id];
												
						var record = this._table_rows.createRecord();
						record.setField("product_id", product.id);
						var description = product.name;
						if (product.package_id !== null) description += " ("+product.package.name+")";
						record.setField("description", description);
						var price = 0xFFFFFFFFFFFFFFFF;
						var price_valid = false;
						for (var j in product.price) {
							var price_available = false;
							for (var k in person.groups) {
								if (product.price[j].person_group_id === person.groups[k].id) {
									price_available = true;
									break;
								}
							}
							if (price_available) {
								if (product.price[j].amount < price) {
									price = product.price[j].amount;
									price_valid = true;
								}
							}
						}
						if (!price_valid) return new Promise(function(resolve, reject) {
							return reject(product.name+" can not be bought by "+person.nick_name+".");
						});
						record.setField("price", price);
						record.setField("amount", product_amounts[product.id]);
						transaction_total += price*product_amounts[product.id];
						
						var blockIfNotInStock = false;
						
						
						if (product.id in product_stock_request) {
							blockIfNotInStock = true;
							var stockById = {};
							for (var item in stockList) {
								stockById[stockList[item].getIndex()] = stockList[item];
							}
							
							var request = product_stock_request[product.id];
							for (var item in request) {
								if (!(request[item] in stockById)) {
									return new Promise((resolve, reject) => {
										reject({code: 2, message: "Can not find requested stock ("+request[item]+")"});
									});
								}
								requestedStockList.push(stockById[request[item]]);
							}
						} else {
							requestedStockList = stockList;
						}
						
						var selectedStock = [];
						
						var amountRemaining = amount;
						for (var item in requestedStockList) {
							if (amountRemaining > 0) {
								var currentStockId = requestedStockList[item].getIndex();
								var amountInCurrentStock = requestedStockList[item].getField("amount_current");
								var amountFromCurrentStock = 0;
								if (amountInCurrentStock >= amountRemaining) {
									amountFromCurrentStock = amountRemaining;
									amountRemaining = 0;
								} else {
									amountFromCurrentStock = amountInCurrentStock;
									amountRemaining -= amountInCurrentStock;
								}
								requestedStockList[item].setField("amount_current", amountInCurrentStock - amountFromCurrentStock);
								requestedStockList[item].setFieldDate("timestamp_current"); //Update to current timestamp
								selectedStock.push(requestedStockList[item]);
								
								//This creates the mapping record that links each stock mutation to the transaction row responsible
								//Note that the transaction row id still needs to be added. This is done once the transaction row id is known.
								var mappingRecord = this._table_rows_stock_mapping.createRecord();
								mappingRecord.setField("product_stock_id", currentStockId);
								mappingRecord.setField("amount", amountFromCurrentStock);
								record.addSubRecord("transaction_row_id", mappingRecord); //Now there is a record in your record, so you can flush your records while you flush your records \(^_^)/
								blockIfNotInStock = true; //If shit hits the fan we stop.
							}
						}
						
						if (blockIfNotInStock && amountRemaining > 0) {
							return new Promise((resolve, reject) => {
								reject({code: 3, message: "Not enough items in stock to complete order!"});
							});
						}
						
						transaction_rows.push(record);
					}
					
					if ("other" in params) {
						for (i in params.other) {
							var otherRecord = this._table_rows.createRecord();
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
							transaction_rows.push(otherRecord);
							transaction_total += params.other[i].price;
						}
					}
					
					transaction.setField("total", transaction_total);
					var saldo = person_record.getField("saldo");
					person_record.setField("saldo", saldo - transaction_total);
					
					//Complete the transaction
					return this._opts.database.transaction(person_record.getField("nick_name")).then((dbTransaction) => {
						return transaction.flush(dbTransaction).then((result) => {
							if (!result) return new Promise(function(resolve, reject) {
								return reject("Error: transaction not created?!");
							});
							var promise_rows = [];
							var transaction_id = transaction.getIndex();
							for (var i in transaction_rows) {
								transaction_rows[i].setField("transaction_id", transaction_id);
								promise_rows.push(transaction_rows[i].flush(dbTransaction, true));
							}
							return Promise.all(promise_rows).then((resultArray) => {
								for (var i in resultArray) {
									if (!resultArray[i]) {
										return new Promise(function(resolve, reject) {
											return reject("Error: transaction row not created?!");
										});
									}
								}
								
								var selected_stock_promises = [];
								for (var item in selectedStock) {
									selected_stock_promises.push(selectedStock[item].flush(dbTransaction));
								}
								
								return Promise.all(selected_stock_promises).then((resultArray) => {
									for (var i in resultArray) {
										if (!resultArray[i]) {
											return new Promise(function(resolve, reject) {
												return reject("Error: stock row not created?!");
											});
										}
									}
									
									var rows = [];
									for (i in transaction_rows) {
										rows.push(transaction_rows[i].getFields());
									}
									return person_record.flush(dbTransaction).then((result) => {
										dbTransaction.commit();
										return {
											"transaction": transaction.getFields(),
											"rows": rows,
											"person": person_record.getFields()
										};
									});
								});
							});
						}).catch( (error) => {
							console.log("ROLLBACK", error);
							dbTransaction.rollback();
							return error;
						});
					});
				});
			});
		});
	}
	
	async analysisStock(session, params) {
		if (typeof params !== 'object') {
			throw "Expected a parameter object.";
		}
		if (typeof params.operation !== 'string') {
			throw "Expected an operation.";
		}
		
		if (params.operation === "unknownOrigin") {
			var rows = await this._table_rows.selectRecordsRaw("SELECT * FROM `transaction_rows` WHERE `id` NOT IN (SELECT transaction_row_id FROM `product_stock_mapping`) AND `price` > 0", [], false);
			
			var rowIds = [];
			var transactionIds = [];
			
			for (var i in rows) {
				var row = rows[i];
				rowIds.push(row['id']);
				if (!(row['transaction_id'] in transactionIds)) {
					transactionIds.push(row['transaction_id']);
				}
			}
			
			var transactions = await this.list(session, {id: transactionIds}, "OR", true);
			
			for (var i in transactions) {
				for (var j in transactions[i].rows) {
					var isUnknown = false;
					var id = transactions[i].rows[j].id;
					if (rowIds.lastIndexOf(id)>=0) {
						isUnknown = true;
					}
					transactions[i].rows[j]['isUnknown'] = isUnknown;
				}
			}
			
			return transactions;
			
		} else {
			throw "Unsupported operation.";
		}
	}
	
	registerRpcMethods(rpc, prefix="transaction") {
		if (prefix!=="") prefix = prefix + "/";
		rpc.addMethod(prefix+"list", this.list.bind(this));
		rpc.addMethod(prefix+"list/last", this.listLast.bind(this));
		rpc.addMethod(prefix+"list/query", this.listQuery.bind(this));
		rpc.addMethod(prefix+"execute", this.execute.bind(this));
		rpc.addMethod(prefix+"analysis/stock", this.analysisStock.bind(this));
	}
}

module.exports = Transactions;
