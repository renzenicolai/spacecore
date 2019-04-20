"use strict";

const mime = require('mime-types');

class Products {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			files: null,
			table: 'products',
			table_group_mapping: 'product_group_mapping',
			table_group: 'product_group',
			table_location: 'product_location',
			table_brand: 'product_brand',
			table_package: 'product_package',
			table_price: 'product_price',
			table_stock: 'product_stock',
			table_identifier: 'product_identifier',
			table_identifier_type: 'product_identifier_type'
		}, opts);
		if (this._opts.database === null) {
			console.log("The products module can not be started without a database!");
			process.exit(1);
		}
		
		if (this._opts.files === null) {
			console.log("The products module can not be started without the files module!");
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
	
	async list(session, params) {
		var products = await this._table.list(params);
		
		var promises = [];
		for (var i in products) {
			promises.push(this._opts.files.getFileAsBase64(products[i].picture_id));
		}
		var pictures = await Promise.all(promises);
		
		for (var i in pictures) products[i].picture = pictures[i];
		
		promises = [];
		for (i in products) {
			promises.push(this._table_group_mapping.selectRecordsRaw("SELECT mapping.id as 'mapping_id', group.id, group.name, group.description FROM `product_group_mapping` AS `mapping` INNER JOIN `product_group` AS `group` ON mapping.product_group_id = group.id WHERE `product_id` = ?", [products[i].id], false));
		}
		var groups = await Promise.all(promises);
		for (i in groups) products[i].groups = groups[i];
					
		promises = [];
		for (i in products) {
			promises.push(this._table_stock.selectRecordsRaw("SELECT `id`, `product_id`, `amount_initial`, `amount_current`, `timestamp_initial`, `timestamp_current`, `person_id`, `comment` FROM `product_stock` WHERE `product_id` = ? AND `amount_current` > 0 ORDER BY `timestamp_initial` ASC", [products[i].id], false));
		}
		var stock = await Promise.all(promises);
		for (i in stock) products[i].stock = stock[i];
		
		promises = [];
		for (i in products) promises.push(this._table_brand.selectRecords({"id":products[i].brand_id}));
		var brands = await Promise.all(promises);
		for (i in brands) {
			products[i].brand = null;
			if (brands[i].length > 0) products[i].brand = brands[i][0].getFields();
		}
		
		promises = [];
		for (i in products) {
			promises.push(this._table_identifier.selectRecords({product_id: products[i].id}));
		}
		var identifiers = await Promise.all(promises);
		for (i in identifiers) {
			products[i].identifier = null;
			if (identifiers[i].length > 0) products[i].identifier = identifiers[i][0].getFields();
		}
		
		promises = [];
		for (var i in products) {
			if (products[i].package_id !== null) {
				promises.push(this._table_package.selectRecords({id: products[i].package_id}));
			} else {
				promises.push(new Promise((resolve, reject) => { resolve([]); }));
			}
		}
		var packages = await Promise.all(promises);
		for (i in packages) {
			products[i].package = null;
			if (packages[i].length > 0) products[i].package = packages[i][0].getFields();
		}
		
		promises = [];
		for (i in products) {
			promises.push(this._table_price.selectRecords({product_id: products[i].id}));
		}
		
		var prices = await Promise.all(promises);
		for (var i in prices) {
			products[i].price = [];
			for (var j in prices[i]) {
				products[i].price.push(prices[i][j].getFields());
			}
		}
		
		return Promise.resolve(products);
	}
	
	async add(session, params) {
		return "Not implemented";
	}
	
	async edit(session, params) {
		return "Not implemented";
	}
	
	async remove(session, params) {
		return "Not implemented";
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
		return this.listIdentifiers(session, params).then((result) => {
			if (result.length < 1) return Promise.resolve([]); //No results, because the barcode was not found.
			var products = [];
			for (var i in result) {
				products.push(result[i].product_id);
			}
			return this.list(session, {id: products});
		});
	}
	
	/*findByLocation(session, params) {
		return this.listLocations(session, params).then((locations) => {
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
	}*/
	
	//Identifier types
		
	listIdentifierTypes(session, params) {
		return this._table_identifier_type.list(params);
	}
	
	async addIdentifierType(session, params) {
		return "Not implemented";
	}
	
	async editIdentifierType(session, params) {
		return "Not implemented";
	}
	
	async removeIdentifierType(session, params) {
		return "Not implemented";
	}
	
	//Identifiers
	
	async listIdentifiers(session, params) {
		var barcode = null;
		var type = null;
		if (typeof params === "object") {
			if (!("barcode" in params)) return "Field 'barcode' not set.";
			barcode = params.barcode;
			if ("type" in params) type = params.type;
		} else if (typeof params === "string") {
			barcode = params;
		} else {
			return "Parameter should be string or object.";
		}

		var types =  await this.listIdentifierTypes();
		
		//var typesById = {};
		//for (var i in types) typesById[types[i].id] = types[i];
		
		var typesByName = {};
		for (var i in types) typesByName[types[i].name] = types[i];
		
		var query  = {value: barcode};
		if (typeof type === "string") {
			if (!(type in typesByName)) return Promise.reject("Unknown type");
			query.type_id = typesByName[type].id;
		} else if (typeof type === "number") {
			query.type_id = type;
		}
		return this._table_identifier.list(query);
	}
	
	async addIdentifier(session, params) {
		return "Not implemented";
	}
	
	async editIdentifier(session, params) {
		return "Not implemented";
	}
	
	async removeIdentifier(session, params) {
		return "Not implemented";
	}
	
	//Locations
		
	listLocations(session, params) {
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
	
	async addLocation(session, params) {
		return "Not implemented";
	}
	
	async editLocation(session, params) {
		return "Not implemented";
	}
	
	async removeLocation(session, params) {
		return "Not implemented";
	}

	listStock(session, params) {
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
			
	listStockRecords(session, params) {
		return this._table_stock.selectRecords(params, "ORDER BY `timestamp_initial` ASC");
	}
	
	async addStock(session, params) {
		if (typeof params !== 'object') {
			return "Params should be object containing 'product_id' and 'amount'.";
		}
		
		if (!("product_id" in params) && (typeof params.product_id === "number")) {
			return "Missing product_id parameter.";
		}
		
		if (!("amount" in params) && (typeof params.amount === "number")) {
			return "Missing amount parameter.";;
		}
		
		var product = params.product_id;
		var amount = params.amount;
		
		var dbTransaction = await this._opts.database.transaction("addStock (Product: "+product+", Amount: "+amount+")");
		
		var record = this._table_stock.createRecord();
		record.setField("product_id", product);
		record.setField("amount_initial", amount);
		record.setField("amount_current", amount);
		
		return record.flush(dbTransaction).then((result) => {
			dbTransaction.commit();
			return result;
		}).catch((error) => {
			dbTransaction.rollback();
			return error;
		});
	}
	
	async editStock(session, params) {
		return "Not implemented";
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
			return result[0].flush();
		});
	}
	
	async setPrice(session, params) {
		if (!("product_id" in params) && (typeof params.product_id === "number")) {
			return new Promise((resolve, reject) => {return "Missing product_id param."; });
		}
		if (!("group_id" in params) && (typeof params.group_id === "number")) {
			return new Promise((resolve, reject) => {return "Missing group_id param."; });
		}
		if (!("amount" in params) && (typeof params.amount === "number")) {
			return new Promise((resolve, reject) => {return "Missing amount param."; });
		}
		var product = params.product_id;
		var group = params.group_id;
		var amount = params.amount;
		
		var selectResult = await this._table_price.selectRecords({product_id: product, person_group_id: group});
		
		var record = null;
		
		if (selectResult.length < 1) {
			record = this._table_price.createRecord();
			record.setField("product_id", product);
			record.setField("person_group_id", group);
		} else if (selectResult.length > 1) {
			return "Duplicate price record found. Check the database!";
		} else {
			record = selectResult[0];
		}
		record.setField("amount", amount);
			
		return this._opts.database.transaction("setPrice ("+product+", "+group+", "+amount+")").then((dbTransaction) => {				
			return record.flush(dbTransaction).then((result) => {
				dbTransaction.commit();
				return result;
			}).catch((error) => {
				dbTransaction.rollback();
				return error;
			});
		});
	}
	

	registerRpcMethods(rpc, prefix="product") {
		if (prefix!=="") prefix = prefix + "/";
		
		/* Products */
		rpc.addMethod(prefix+"list", this.list.bind(this));
		rpc.addMethod(prefix+"add", this.add.bind(this));
		rpc.addMethod(prefix+"edit", this.edit.bind(this));
		rpc.addMethod(prefix+"remove", this.remove.bind(this));
		rpc.addMethod(prefix+"find/name", this.findByName.bind(this));
		rpc.addMethod(prefix+"find/name/like", this.findByNameLike.bind(this));
		rpc.addMethod(prefix+"find/id", this.findById.bind(this));
		rpc.addMethod(prefix+"find/barcode", this.findByBarcode.bind(this));
		//rpc.addMethod(prefix+"find/location", this.findByLocation.bind(this));
		rpc.addMethod(prefix+"price/set", this.setPrice.bind(this))
		
		/* Identifier types */
		rpc.addMethod(prefix+"barcode/type/list", this.listIdentifierTypes.bind(this));
		rpc.addMethod(prefix+"barcode/type/add", this.addIdentifierType.bind(this));
		rpc.addMethod(prefix+"barcode/type/edit", this.editIdentifierType.bind(this));
		rpc.addMethod(prefix+"barcode/type/remove", this.removeIdentifierType.bind(this));
		
		/* Identifiers */
		rpc.addMethod(prefix+"barcode/list", this.listIdentifiers.bind(this));
		rpc.addMethod(prefix+"barcode/add", this.addIdentifier.bind(this));
		rpc.addMethod(prefix+"barcode/edit", this.editIdentifier.bind(this));
		rpc.addMethod(prefix+"barcode/remove", this.removeIdentifier.bind(this));
		
		/* Locations */
		rpc.addMethod(prefix+"location/list", this.listLocations.bind(this));
		rpc.addMethod(prefix+"location/add", this.addLocation.bind(this));
		rpc.addMethod(prefix+"location/edit", this.editLocation.bind(this));
		rpc.addMethod(prefix+"location/remove", this.removeLocation.bind(this));
		
		/* Stock */
		rpc.addMethod(prefix+"stock", this.listStock.bind(this));
		rpc.addMethod(prefix+"stock/add", this.addStock.bind(this));
		rpc.addMethod(prefix+"stock/edit", this.editStock.bind(this));
		rpc.addMethod(prefix+"stock/remove", this.removeStock.bind(this));
	}
}

module.exports = Products;
