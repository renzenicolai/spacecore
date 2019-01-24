"use strict";

const mime = require('mime-types');

class Products {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			table: 'products',
			table_group_mapping: 'product_group_mapping',
			table_group: 'product_group',
			table_location: 'product_location',
			table_brand: 'product_brand',
			table_package: 'product_package',
			table_price: 'product_price',
			table_stock: 'product_stock',
			table_identifier: 'product_identifier',
			table_identifier_type: 'product_identifier_type',
			files: null
		}, opts);
		if (this._opts.database === null) {
			console.log("The products module can not be started without a database!");
			process.exit(1);
		}
		this._table                  = this._opts.database.table(this._opts.table);
		this._table_group_mapping    = this._opts.database.table(this._opts.table_group_mapping);
		this._table_group            = this._opts.database.table(this._opts.table_group);
		this._table_location         = this._opts.database.table(this._opts.table_location);
		this._table_brand            = this._opts.database.table(this._opts.table_brand);
		this._table_package          = this._opts.database.table(this._opts.table_package);
		this._table_price            = this._opts.database.table(this._opts.table_price);
		this._table_stock            = this._opts.database.table(this._opts.table_stock);
		this._table_identifier       = this._opts.database.table(this._opts.table_identifier);
		this._table_identifier_type  = this._opts.database.table(this._opts.table_identifier_type);
	}
	
	list(session, params) {
		console.log("PRODUCTS LIST",params);
		return this._table.list(params).then((result) => {
			var promises = [];
			for (var i in result) {
				promises.push(this._getFile(result[i].picture_id));
			}
			return Promise.all(promises).then((resultArray) => {
				for (var i in resultArray) {
					result[i].picture = null;
					if ("file" in resultArray[i] && resultArray[i].file !== null) {
						result[i].picture = {
							data: resultArray[i].file.toString('base64'),
							mime: mime.lookup(resultArray[i].filename.split('.').pop())
						};
					}
				}
				
				var promises = [];
				for (i in result) {
					promises.push(this._table_group_mapping.selectRecordsRaw("SELECT mapping.id as 'mapping_id', group.id, group.name, group.description FROM `product_group_mapping` AS `mapping` INNER JOIN `product_group` AS `group` ON mapping.product_group_id = group.id WHERE `product_id` = ?", [result[i].id], false));
				}
				
				return Promise.all(promises).then((resultArray) => {
					for (i in resultArray) {
						result[i].groups = resultArray[i];
					}
					
					var promises = [];
					for (i in result) {
						promises.push(this._table_stock.selectRecordsRaw("SELECT stock.id as 'stock_id', location.id, location.name, location.description, location.sub, stock.id, stock.amount_current FROM `product_stock` AS `stock` INNER JOIN `product_location` AS `location` ON stock.product_location_id = location.id WHERE `product_id` = ? AND `amount_current` > 0 AND `visible` > 0 ORDER BY `timestamp_initial` ASC", [result[i].id], false));
					}
					
					return Promise.all(promises).then((resultArray) => {
						for (i in resultArray) {
							result[i].stock = resultArray[i];
						}
						
						var promises = [];
						for (i in result) {
							promises.push(this._table_brand.selectRecords({"id":result[i].brand_id}));
						}
						
						return Promise.all(promises).then((resultArray) => {
							for (i in resultArray) {
								result[i].brand = null;
								if (resultArray[i].length > 0) result[i].brand = resultArray[i][0].getFields();
							}
							
							var promises = [];
							for (i in result) {
								promises.push(this._table_identifier.selectRecords({product_id: result[i].id}));
							}
							
							return Promise.all(promises).then((resultArray) => {
								for (i in resultArray) {
									result[i].identifier = null;
									if (resultArray[i].length > 0) result[i].identifier = resultArray[i][0].getFields();
								}
								
								var promises = [];
								for (var i in result) {
									promises.push(this._table_package.selectRecords({id: result[i].package_id}));
								}
								
								return Promise.all(promises).then((resultArray) => {
									for (i in resultArray) {
										result[i].package = null;
										if (resultArray[i].length > 0) result[i].package = resultArray[i][0].getFields();
									}
									
									var promises = [];
									for (i in result) {
										promises.push(this._table_price.selectRecords({product_id: result[i].id}));
									}
									
									return Promise.all(promises).then((resultArray) => {
										for (var i in resultArray) {
											result[i].price = [];
											for (var j in resultArray[i]) {
												result[i].price.push(resultArray[i][j].getFields());
											}
										}
										
										return Promise.resolve(result);
									});
								});
							});
						});
					});
				});
			});
		});
	}

	_getFile(id) {
		if (this._opts.files === null) {
			return new Promise((resolve, reject) => {
				return resolve(null);
			});
		}
		return this._opts.files.getFile(id);
	}
	
	findByName(session, params) {
		return this.list(session, {"name": params});
	}
	
	findByNameLike(session, params) {
		return this.list(session, {"name": {"LIKE":"%"+params+"%"}});
	}

	findById(session, params) {
		return new Promise((resolve, reject) => {
			if (params.length != 1) return reject("Expected 1 parameter: the id of a product");
			var id = params[0];
			if(typeof id !== 'number') return reject("Invalid parameter: please provide the id of a product");
			return this.list(session, {"id": id});
		});
	}
	
	findByBarcode(session, params) {
		return this.getIdentifier(session, params).then((result) => {
			if (result.length < 1) return Promise.resolve([]); //No results, because the barcode was not found.
			var products = [];
			for (var i in result) {
				console.log("RES", result[i]);
				products.push(result[i].product_id);
			}
			var query = {id: products};
			return this.list(session, query);
		});
	}
	
	add(session, params) {
		return Promise.reject("Not implemented");
	}
	
	getIdentifierTypes(session, params) {
		return this._table_identifier_type.list(params);
	}
	
	getIdentifier(session, params) {
		var barcode = null;
		var type = null;
		if (typeof params === "object") {
			console.log("Params is object.");
			if (!("barcode" in params)) return Promise.reject("Field 'barcode' not set.");
			barcode = params.barcode;
			if ("type" in params) type = params.type;
		} else if (typeof params === "string") {
			console.log("Params is string.");
			barcode = params;
		} else {
			return Promise.reject("Params should be string or object.");
		}
		console.log("getIdentifier", barcode, type);
		return this.getIdentifierTypes().then((types) => {
			var typesById = {};
			for (var i in types) typesById[types[i].id] = types[i];
			var typesByName = {};
			for (i in types) typesByName[types[i].name] = types[i];
			var query  = {value: barcode};
			if (typeof type === "string") {
				if (!(type in typesByName)) return Promise.reject("Unknown type");
				query.type_id = typesByName[type].id;
			} else if (typeof type === "number") {
				query.type_id = type;
			}
			return this._table_identifier.list(query);
		});
	}
	
	getLocation(session, params) {
		var query = null;
		if (typeof params === "string") {
			query = {"name": params};
		} else if (typeof params === "number") {
			query = {"id": params};
		} else if (params === null) {
			//No query.
		} else {
			return Promise.reject("Parameter should be either string with name or number with id.");
		}
		return this._table_location.list(query);
	}
	
	findByLocation(session, params) {
		return this.getLocation(session, params).then((locations) => {
			var location_ids = [];
			for (var i in locations) location_ids.push(locations[i].id);
			return this._table_stock.list({"product_location_id": location_ids}).then((mappings) => {
				//console.log("MAPPING", mappings);
				var product_ids = [];
				for (var i in mappings) {
					if (!(mappings[i].product_id in product_ids)) {
						product_ids.push(mappings[i].product_id);
					}
				}
				return this.list(session, {id: product_ids});
			});
		});
	}
	
	getStock(session, params) {
		console.log(params);
		return this._table_stock.list(params).then((result) => {
			var location_promises = [];
			for (var i in result) {
				location_promises.push(this._table_location.list({id: result[i]['product_location_id']}));
			}
			return Promise.all(location_promises).then((locations) => {
				for (var i in result) {
					if (locations[i].length > 0) {
						result[i].product_location = locations[i][0];
					}
				}
				return result;
			});
		});
	}
	
	getStockRecords(session, params) {
		console.log("STOCK RECORDS QUERY", params);
		return this._table_stock.selectRecords(params, "ORDER BY `timestamp_initial` ASC");
	}
	
	addStock(session, params) {
		if (!("product_id" in params) && (typeof params.product_id === "number")) {
			return new Promise((resolve, reject) => {return "Missing product_id param."; });
		}
		if (!("location_id" in params) && (typeof params.location_id === "number")) {
			return new Promise((resolve, reject) => {return "Missing location_id param."; });
		}
		if (!("amount" in params) && (typeof params.amount === "number")) {
			return new Promise((resolve, reject) => {return "Missing amount param."; });
		}
		var product = params.product_id;
		var location = params.location_id;
		var amount = params.amount;
		
		return this._opts.database.transaction("addStock ("+product+", "+location+", "+amount+")").then((dbTransaction) => {
			var record = this._table_stock.createRecord();
			record.setField("product_id", product);
			record.setField("product_location_id", location);
			record.setField("amount_initial", amount);
			record.setField("amount_current", amount);
			return record.flush(dbTransaction).then((result) => {
				dbTransaction.commit();
				return result;
			}).catch((error) => {
				dbTransaction.rollback();
				return error;
			});
		});
	}
	
	removeStock(session, params) {
		if (!("id" in params) && (typeof params.product_id === "number")) {
			return new Promise((resolve, reject) => {return "Missing id param."; });
		}
		if (!("amount" in params) && (typeof params.amount === "number")) {
			return new Promise((resolve, reject) => {return "Missing amount param."; });
		}
		var id = params.id;
		var amount = params.amount;
		if (amount < 0) return new Promise((resolve, reject) => {
				return resolve("Invalid amount.");
			});
		return this._table_stock.selectRecords({id: id}).then((result) => {
			if (result.length != 1) return new Promise((resolve, reject) => {
				return resolve("Invalid id.");
			});
			var oldAmount = result[0].getField("amount_current");
			var newAmount = oldAmount - amount;
			if (newAmount < 0) newAmount = 0;
			result[0].setField("amount_current", newAmount);
			console.log("Flushing...");
			return result[0].flush();
		});
	}
	

	registerRpcMethods(rpc, prefix="product") {
		if (prefix!=="") prefix = prefix + "/";
		rpc.addMethod(prefix+"list", this.list.bind(this));
		rpc.addMethod(prefix+"find/name", this.findByName.bind(this));
		rpc.addMethod(prefix+"find/name/like", this.findByNameLike.bind(this));
		rpc.addMethod(prefix+"find/id", this.findById.bind(this));
		rpc.addMethod(prefix+"find/barcode", this.findByBarcode.bind(this));
		rpc.addMethod(prefix+"find/location", this.findByLocation.bind(this));
		rpc.addMethod(prefix+"barcode", this.getIdentifier.bind(this));
		rpc.addMethod(prefix+"barcode/types", this.getIdentifierTypes.bind(this));
		rpc.addMethod(prefix+"location", this.getLocation.bind(this));
		rpc.addMethod(prefix+"stock", this.getStock.bind(this));
		rpc.addMethod(prefix+"stock/add", this.addStock.bind(this));
		rpc.addMethod(prefix+"stock/remove", this.removeStock.bind(this));
		rpc.addMethod(prefix+"add", this.add.bind(this));
	}
}

module.exports = Products;
