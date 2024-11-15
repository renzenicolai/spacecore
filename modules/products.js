"use strict";

const Tasks = require("../lib/tasks.js");

const fs = require("fs");

class Products {
	constructor(opts) {
		this._opts = Object.assign({
			database:                null,
			files:                   null,
			table:                  'products',
			table_group:            'product_group',
			table_group_mapping:    'product_group_mapping',
			table_location:         'product_location',
			table_location_mapping: 'product_location_mapping',
			table_brand:            'product_brand',
			table_package:          'product_package',
			table_price:            'product_price',
			table_stock:            'product_stock',
			table_identifier:       'product_identifier',
			table_identifier_type:  'product_identifier_type'
		}, opts);
		
		if (this._opts.database === null) {
			console.log("The products module can not be started without a database!");
			process.exit(1);
		}

		if (this._opts.files === null) {
			console.log("The products module can not be started without the files module!");
			process.exit(1);
		}
		
		/* Tables */
		this._table                  = this._opts.database.table(this._opts.table);                  //Products
		this._table_group            = this._opts.database.table(this._opts.table_group);            //Product groups
		this._table_group_mapping    = this._opts.database.table(this._opts.table_group_mapping);    //Mapping between products and product groups
		this._table_location         = this._opts.database.table(this._opts.table_location);         //Product locations
		this._table_location_mapping = this._opts.database.table(this._opts.table_location_mapping); //Mapping between products and product locations
		this._table_brand            = this._opts.database.table(this._opts.table_brand);            //Product brands
		this._table_package          = this._opts.database.table(this._opts.table_package);          //Product packages
		this._table_price            = this._opts.database.table(this._opts.table_price);            //Product prices
		this._table_stock            = this._opts.database.table(this._opts.table_stock);            //Product stock
		this._table_identifier       = this._opts.database.table(this._opts.table_identifier);       //Product identifiers
		this._table_identifier_type  = this._opts.database.table(this._opts.table_identifier_type);  //Types of product identifiers
	}
	
	/* Products */
	
	async list(session, params) {
		var products = await this._table.list(params);
		var tasks = [
			Tasks.create('picture',      this._opts.files.getFileAsBase64.bind(this._opts.files), products, 'picture_id'),
			Tasks.create('groups',       this._getGroups.bind(this),                              products, 'id'),
			Tasks.create('locations',    this._getLocations.bind(this),                           products, 'id'),
			Tasks.create('stock',        this._getStock.bind(this),                               products, 'id'),
			Tasks.create('brand',        this._getBrand.bind(this),                               products, 'brand_id'),
			Tasks.create('identifiers',  this._getIdentifiers.bind(this),                         products, 'id'),
			Tasks.create('package',      this._getPackage.bind(this),                             products, 'package_id'),
			Tasks.create('prices',       this._getPrices.bind(this),                              products, 'id')
		];
		return Tasks.merge(tasks, products);
	}
	
	async listNoImg(session, params) {
		var products = await this._table.list(params);
		var tasks = [
			Tasks.create('groups',       this._getGroups.bind(this),                              products, 'id'),
			Tasks.create('locations',    this._getLocations.bind(this),                           products, 'id'),
			Tasks.create('stock',        this._getStock.bind(this),                               products, 'id'),
			Tasks.create('brand',        this._getBrand.bind(this),                               products, 'brand_id'),
			Tasks.create('identifiers',  this._getIdentifiers.bind(this),                         products, 'id'),
			Tasks.create('package',      this._getPackage.bind(this),                             products, 'package_id'),
			Tasks.create('prices',       this._getPrices.bind(this),                              products, 'id')
		];
		return Tasks.merge(tasks, products);
	}
	
	async create(session, params) {
		if (typeof params !== 'object')                                                                                           throw "Expected parameter to be an object";
		if (typeof params.name !== 'string')                                                                                      throw "Missing required property 'name'";
		if ((typeof params.description !== 'undefined') && (typeof params.description !== 'string'))                              throw "Expected description to to be a string";
		if ((typeof params.active      !== 'undefined') && (typeof params.active !== 'boolean'))                                  throw "Expected active to be a boolean";
		if ((typeof params.brand_id    !== 'undefined') && (typeof params.brand_id !== 'number')   && (params.brand_id !== null)) throw "Expected brand_id to be a number";
		if ((typeof params.picture_id  !== 'undefined') && (typeof params.picture_id !== 'number') && (params.brand_id !== null)) throw "Expected picture_id to be a number";
		if ((typeof params.package_id  !== 'undefined') && (typeof params.package_id !== 'number') && (params.brand_id !== null)) throw "Expected package_id to be a number";
		if ((typeof params.groups      !== 'undefined') && (!Array.isArray(params.groups)))                                       throw "Expected groups to be an array";
		if ((typeof params.locations   !== 'undefined') && (!Array.isArray(params.locations)))                                    throw "Expected locations to be an array";
		if ((typeof params.prices      !== 'undefined') && (typeof params.prices !== 'object'))                                   throw "Expected proces to be an object";
		var dbTransaction = await this._opts.database.transaction("Add product ("+params.name+")");
		var product = this._table.createRecord();
		try {
			await this.fillProductRecord(product, params, dbTransaction);
			var product_id = await product.flush(dbTransaction);
			
			var operations = [];
			
			if (Array.isArray(params.groups)) {
				for (let i = 0; i < params.groups.length; i++) {
					let group = params.groups[i];
					let groupRecord = this._table_group_mapping.createRecord();
					groupRecord.setField("product_id", product_id);
					groupRecord.setField("product_group_id", group);
					operations.push(groupRecord.flush(dbTransaction));
				}
			}
		
			if (Array.isArray(params.locations)) {
				for (let i = 0; i < params.locations.length; i++) {
					let location = params.locations[i];
					let locationRecord = this._table_location_mapping.createRecord();
					locationRecord.setField("product_id", product_id);
					locationRecord.setField("product_location_id", location);
					operations.push(locationRecord.flush(dbTransaction));
				}
			}
		
			if (typeof params.prices === "object") {
				for (let group in params.prices) {
					let value = params.prices[group];
					let priceRecord = this._table_price.createRecord();
					priceRecord.setField("product_id", product_id);
					priceRecord.setField("person_group_id", Number(group));
					priceRecord.setField("amount", value);
					operations.push(priceRecord.flush(dbTransaction));
				}
			}
			
			await Promise.all(operations);
			await dbTransaction.commit();
			return product.getIndex();
		} catch(e) {
			dbTransaction.rollback();
			throw e;
		}
	}
	
	async edit(session, params) {
		var product = await this._findById(params);
		var dbTransaction = await this._opts.database.transaction("Edit product #"+product.getIndex());
		try {
			await this.fillProductRecord(product, params, dbTransaction);
			
			//Groups
			if (typeof params.groups !== 'undefined') {
				if (!Array.isArray(params.groups)) throw "Expected groups to be a list of group identifiers.";
				let groupOperations = [];
				let currentMappings = await this._table_group_mapping.selectRecords({product_id: product.getIndex()}); //List current mappings
				let currentGroups = [];
				for (let i in currentMappings) { //Loop through all existing mappings
					if (!params.groups.includes(currentMappings[i].getField("product_group_id"))) { //If the mapping exists but shouldn't then...
						groupOperations.push(currentMappings[i].destroy(dbTransaction)); //...remove the mapping
					} else { //The mapping exists and it should keep existing
						currentGroups.push(currentMappings[i].getField("product_group_id")); //Store the id of the group we are already in in a list
					}
				}
				for (let i in params.groups) { //Loop through the identifiers of the groups we want to be in
					let group = params.groups[i];
					if (!currentGroups.includes(group)) { //If the product is not yet in the group we want the product to be in then create the mapping
						let mappingRecord = this._table_group_mapping.createRecord();
						mappingRecord.setField("product_id", product.getIndex());
						mappingRecord.setField("product_group_id", group);
						groupOperations.push(mappingRecord.flush(dbTransaction));
					}
				}
				await Promise.all(groupOperations);
			}
			
			//Locations
			if (typeof params.locations !== 'undefined') {
				console.log(params.locations, typeof params.locations);
				if (!Array.isArray(params.locations)) throw "Expected locations to be a list of location identifiers.";
				let locationOperations = [];
				let currentMappings = await this._table_location_mapping.selectRecords({product_id: product.getIndex()}); //List current mappings
				let currentGroups = [];
				for (let i in currentMappings) { //Loop through all existing mappings
					if (!params.locations.includes(currentMappings[i].getField("product_location_id"))) { //If the mapping exists but shouldn't then...
						locationOperations.push(currentMappings[i].destroy(dbTransaction)); //...remove the mapping
					} else { //The mapping exists and it should keep existing
						currentGroups.push(currentMappings[i].getField("product_location_id")); //Store the id of the location we are already in in a list
					}
				}
				for (let i in params.locations) { //Loop through the identifiers of the locations we want to be in
					let location = params.locations[i];
					if (!currentGroups.includes(location)) { //If the product is not yet in the location we want the product to be in then create the mapping
						let mappingRecord = this._table_location_mapping.createRecord();
						mappingRecord.setField("product_id", product.getIndex());
						mappingRecord.setField("product_location_id", location);
						locationOperations.push(mappingRecord.flush(dbTransaction));
					}
				}
				await Promise.all(locationOperations);
			}
			
			//Identifiers
			if (typeof params.identifiers !== 'undefined') {
				console.log(params.identifiers, typeof params.identifiers);
				if (!Array.isArray(params.identifiers)) throw "Expected identifiers to be a list of strings.";

				let types = await this._table_identifier_type.selectRecords({});
				let type_id = types[0].getField("id");

				let identifierOperations = [];
				let currentMappings = await this._table_identifier.selectRecords({product_id: product.getIndex()}); //List current identifiers
				let currentIdentifiers = [];
				for (let i in currentMappings) { //Loop through all existing mappings
					if (!params.identifiers.includes(currentMappings[i].getField("value"))) { //If the mapping exists but shouldn't then...
						identifierOperations.push(currentMappings[i].destroy(dbTransaction)); //...remove the mapping
					} else { //The mapping exists and it should keep existing
						currentIdentifiers.push(currentMappings[i].getField("value")); //Store the id of the identifier we are already in in a list
					}
				}
				for (let i in params.identifiers) { //Loop through the identifiers of the identifiers we want to be in
					let identifier = params.identifiers[i];
					if (!currentIdentifiers.includes(identifier)) { //If the product is not yet in the identifier we want the product to be in then create the mapping
						let record = this._table_identifier.createRecord();
						record.setField("product_id", product.getIndex());
						record.setField("value", identifier);
						record.setField("type_id", type_id);
						identifierOperations.push(record.flush(dbTransaction));
					}
				}
				await Promise.all(identifierOperations);
			}
			
			//Prices
			if (typeof params.prices !== 'undefined') {
				let priceOperations = [];
				let currentPrices = await this._table_price.selectRecords({product_id: product.getIndex()}); //List current prices
				let existingPrices = [];
				for (let i in currentPrices) { //Loop through all existing prices
					let group = currentPrices[i].getField("person_group_id");
					let value = currentPrices[i].getField("amount");
					if (!(String(group) in params.prices)) { //If the mapping exists but shouldn't then...
						console.log("Price exists for",group,"but it should not exist, removing.");
						priceOperations.push(currentPrices[i].destroy(dbTransaction)); //...remove the price
					} else { //The price exists and should keep existing
						if (value != params.prices[group]) { //The price needs to be updated
							console.log("Price exists for",group,"but it needs to be updated.");
							currentPrices[i].setField("amount", params.prices[group]);
							priceOperations.push(currentPrices[i].flush(dbTransaction)); //...update the price
						}
						existingPrices.push(group);
					}
				}
				for (let group in params.prices) { //Loop through the prices we want to exist
					let value = params.prices[group];
					if (!existingPrices.includes(Number(group))) {
						console.log("Price for",group,"does not yet exist, creating.");
						let priceRecord = this._table_price.createRecord();
						priceRecord.setField("product_id", product.getIndex());
						priceRecord.setField("person_group_id", Number(group));
						priceRecord.setField("amount", value);
						priceOperations.push(priceRecord.flush(dbTransaction));
					} else {
						console.log("Price for",group,"exist already, ignoring.");
					}
				}
				await Promise.all(priceOperations);
			}
			
			await product.flush(dbTransaction);
			await dbTransaction.commit();
			return product.getIndex();
		} catch(e) {
			dbTransaction.rollback();
			throw e;
		}
	}
	
	async fillProductRecord(product, params, transaction=null) {
		product.setField("name", params.name);
		
		if (typeof params.description !== "string") params.description = "";
		product.setField("description", params.description);
		
		if (typeof params.active === "boolean") {
			product.setField("active", params.active);
		} else {
			product.setField("active", false);
		}
		
		if (typeof params.picture === "number") {
			let picture = await this._opts.files.getFileAsBase64(params.picture_id);
			if (picture === null) throw "Invalid file id supplied";
			product.setField("picture_id", params.picture_id);
		}
	
		if ((typeof params.picture === "object") && Array.isArray(params.picture) && (params.picture.length > 0)) {
			let picture = await this._opts.files.createFileFromBase64(params.picture[0], transaction);
			product.setField('picture_id', picture.getIndex());
		}
		
		if (typeof params.brand_id === "number") {
			if (this._getBrand(params.brand_id) === null) throw "Invalid brand id supplied";
			product.setField("brand_id", params.brand_id);
		}
		
		if (params.brand_id === null) {
			product.setField("brand_id", null);
		}
		
		if (typeof params.package_id === "number") {
			if (this._getPackage(params.package_id) === null) throw "Invalid package id supplied";
			product.setField("package_id", params.package_id);
		}
		
		if (params.package_id === null) {
			product.setField("package_id", null);
		}
	}
	
	async _findById(params) {
		var id = null;
		if (typeof params === 'number') {
			id = params;
		} else if ((typeof params === 'object') && (typeof params.id === 'number')) {
			id = params.id;
		} else {
			throw "Invalid parameters";
		}

		var result = await this._table.selectRecords({id: id});
		if (result.length !== 1) throw "Product not found.";

		return result[0];
	}
	
	async _removeAll(product, table, transaction = null) {
		var records = await table.selectRecords({product_id: product.getIndex()});
		var operations = [];
		for (var i in records) operations.push(records[i].destroy(transaction));
		return Promise.all(operations);
	}

	async remove(session, params) {
		var product = await this._findById(params);
		var dbTransaction = await this._opts.database.transaction("Remove product #"+product.getIndex());
		try {
			await this._removeAll(product, this._table_group_mapping, dbTransaction);    //Delete all group associations
			await this._removeAll(product, this._table_location_mapping, dbTransaction); //Delete all location associations
			await this._removeAll(product, this._table_identifier, dbTransaction);       //Delete all identifiers
			await product.destroy(dbTransaction);                                        //Delete the product itself
			await dbTransaction.commit();                                                //Commit the transaction
			return true;
		} catch (e) {
			await dbTransaction.rollback();                                              //Cancel the transaction
			console.log("Could not remove product:",e);
			throw e;
		}
	}

	async find(session, params) {
		if (typeof params !== "string") throw "Parameter should be search string";
		return this.list(session, {"name": {"LIKE":"%"+params+"%"}});
	}

	async findByIdentifier(session, params) {
		var barcodes = await this._listIdentifiers(session, params);
		if (barcodes.length < 1) return [];
		var products = [];
		for (var i in barcodes) products.push(barcodes[i].product_id);
		return this.list(session, {id: products});
	}
	
	
	
	/* Product groups */

	_getGroups(product_id) {
		return this._table_group_mapping.selectRecordsRaw("SELECT mapping.id as 'mapping_id', group.id, group.name, group.description FROM `"+this._opts.table_group_mapping+"` AS `mapping` INNER JOIN `"+this._opts.table_group+"` AS `group` ON mapping.product_group_id = group.id WHERE `product_id` = ?", [product_id], false);
	}
	
	/* Product stock */

	_getStock(product_id) {
		return this._table_stock.selectRecordsRaw("SELECT `id`, `product_id`, `amount_initial`, `amount_current`, `timestamp_initial`, `timestamp_current`, `person_id`, `comment` FROM `"+this._opts.table_stock+"` WHERE `product_id` = ? AND `amount_current` > 0 ORDER BY `timestamp_initial` ASC", [product_id], false);
	}
	
	/* Product identifiers */

	_getIdentifiers(product_id) {
		return this._table_identifier.list({product_id: product_id});
	}
	
	/* Product brands */

	async _getBrand(brand_id, asRecord=false) {
		if (brand_id === null) return null;
		var brands = await this._table_brand.selectRecords({"id":brand_id});
		if (brands.length !== 1) return null;
		if (asRecord) return brands[0];
		return brands[0].getFields();
	}
	
	/* Product packages */

	async _getPackage(package_id, asRecord=false) {
		if (package_id === null) return null;
		var packages = await this._table_package.selectRecords({"id":package_id});
		if (packages.length !== 1) return null;
		if (asRecord) return packages[0];
		return packages[0].getFields();
	}
	
	/* Product prices */

	_getPrices(product_id) {
		return this._table_price.list({product_id: product_id});
	}
	
	/* Product locations */

	_getLocations(product_id) {
		return this._table_group_mapping.selectRecordsRaw("SELECT mapping.id as 'mapping_id', location.id, location.name, location.description FROM `"+this._opts.table_location_mapping+"` AS `mapping` INNER JOIN `"+this._opts.table_location+"` AS `location` ON mapping.product_location_id = location.id WHERE `product_id` = ?", [product_id], false);
	}
	
	async _getProductsAtLocation(product_location_id) {
		var mapping = await this._table_location_mapping.list({product_location_id : product_location_id});
		var products = [];
		for (var i in mapping) products.push(mapping[i].product_id);
		if (products.length < 1) return [];
		return this.list(null, {id: products});
	}

	//Identifier types

	listIdentifierTypes(session, params) {
		return this._table_identifier_type.list(params);
	}

	async addIdentifierType(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.name      !== 'string') ||
			(typeof params.long_name !== 'string') ||
			(typeof params.description !== 'string')
		) throw "Invalid parameters";
		var record = this._table_identifier_type.createRecord();
		record.setField("name", params.name);
		record.setField("long_name", params.long_name);
		record.setField("description", params.description);
		return record.flush();
	}

	async editIdentifierType(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.id        !== 'number')
		) throw "Invalid parameters";
		var records = await this._table_identifier_type.selectRecords({id: params.id});
		if (records.length !== 1) throw "Identifier type not found";
		var record = records[0];
		if (typeof params.name !== 'undefined') {
			if (typeof params.name !== 'string') throw "Expected 'name' to be a string";
			record.setField('name', params.name);
		}
		if (typeof params.long_name !== 'undefined') {
			if (typeof params.long_name !== 'string') throw "Expected 'long_name' to be a string";
			record.setField('long_name', params.long_name);
		}
		if (typeof params.description !== 'undefined') {
			if (typeof params.description !== 'string') throw "Expected 'description' to be a string";
			record.setField('description', params.description);
		}
		return record.flush();
	}

	async removeIdentifierType(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.id        !== 'number')
		) throw "Invalid parameters";
		var records = await this._table_identifier_type.selectRecords({id: params.id});
		if (records.length !== 1) throw "Identifier type not found";
		var record = records[0];
		
		var dbTransaction = await this._opts.database.transaction("Remove identifier type #"+record.getIndex());
		
		try {
			var identifiers = await this._table_identifier.selectRecords({type_id: params.id});
			var operations = [];
			for (var i in identifiers) operations.push(identifiers[i].destroy(dbTransaction));
			await Promise.all(operations);
			await record.destroy(dbTransaction);
			await dbTransaction.commit();
			return true;
		} catch (e) {
			await dbTransaction.rollback();
			throw e;
		}
	}

	//Identifiers

	async _listIdentifiers(session, params) {
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

		var typesByName = {};
		for (var i in types) typesByName[types[i].name] = types[i];

		var query  = {value: barcode};
		if (typeof type === "string") {
			if (!(type in typesByName)) throw "Unknown type";
			query.type_id = typesByName[type].id;
		} else if (typeof type === "number") {
			query.type_id = type;
		}
		return this._table_identifier.list(query);
	}

	//Locations

	async listLocations(session, params) {
		var query = params;
		if (typeof params === "string") {
			query = {"name": params};
		} else if (typeof params === "number") {
			query = {"id": params};
		} else if (params === null) {
			query = {};
		} else if (typeof params !== "object") {
			throw "Parameter should be either string with name, number with id or object with query.";
		}

		var locations = await this._table_location.list(query);

		var tasks = [
			Tasks.create('products', this._getProductsAtLocation.bind(this), locations, 'id')
		];

		return Tasks.merge(tasks, locations);
	}

	async createLocation(session, params) {
		if ((typeof params      !== 'object') ||
			(typeof params.name !== 'string')
		) throw "Invalid parameters";
		
		var sub = null;
		if (typeof params.sub !== 'undefined') {
			if (typeof params.sub !== 'number')  throw "Invalid parameter 'sub', expected number.";
			sub = params.sub;
		}
		
		var description = "";
		if (typeof params.description !== 'undefined') {
			if (typeof params.description !== 'string')  throw "Invalid parameter 'description', expected string.";
			description = params.description;
		}
		
		var record = this._table_location.createRecord();
		record.setField("name",        params.name);
		record.setField("sub",         sub);
		record.setField("description", description);
		return record.flush();
	}

	async editLocation(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.id        !== 'number')
		) throw "Invalid parameters";
		var records = await this._table_location.selectRecords({id: params.id});
		if (records.length !== 1) throw "Identifier not found";
		var record = records[0];
		if (typeof params.name !== 'undefined') {
			if (typeof params.name !== 'string') throw "Expected 'name' to be a string";
			record.setField('name', params.name);
		}
		if (typeof params.sub !== 'undefined') {
			if ((typeof params.sub !== 'number') && (params.sub !== 'null')) throw "Expected 'sub' to be a number or null";
			record.setField('sub', params.sub);
		}
		if (typeof params.description !== 'undefined') {
			if (typeof params.description !== 'string') throw "Expected 'description' to be a string";
			record.setField('description', params.description);
		}
		return record.flush();
	}

	async removeLocation(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.id        !== 'number')
		) throw "Invalid parameters";
		var records = await this._table_location.selectRecords({id: params.id});
		if (records.length !== 1) throw "Location not found";
		var record = records[0];
		
		var dbTransaction = await this._opts.database.transaction("Remove location #"+record.getIndex());
		
		try {
			var mappings = await this._table_location_mapping.selectRecords({product_location_id: params.id});
			var operations = [];
			for (var i in mappings) operations.push(mappings[i].destroy(dbTransaction));
			await Promise.all(operations);
			await record.destroy(dbTransaction);
			await dbTransaction.commit();
			return true;
		} catch (e) {
			await dbTransaction.rollback();
			throw e;
		}
	}

	listStockRecords(session, params) {
		return this._table_stock.selectRecords(params, "ORDER BY `timestamp_initial` ASC");
	}

	async addStock(session, params) {
		if (typeof params !== 'object')                                           throw "Params should be object containing 'product_id' and 'amount'.";
		if (!("product_id" in params) && (typeof params.product_id === "number")) throw "Missing product_id parameter (or invalid type, expect number).";
		if (!("amount" in params) && (typeof params.amount === "number"))         throw "Missing amount parameter (or invalid type, expect number).";
		var dbTransaction = await this._opts.database.transaction("Add stock");
		try {
			var record = this._table_stock.createRecord();
			record.setField("product_id", params.product_id);
			record.setField("amount_initial", params.amount);
			record.setField("amount_current", params.amount);
			let result = await record.flush(dbTransaction);
			await dbTransaction.commit();
			return result;
		} catch(e) {
			await dbTransaction.rollback();
			throw e;
		}
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
	
	async _getProductsInGroup(product_group_id) {
		var mapping = await this._table_group_mapping.list({product_group_id : product_group_id});
		var products = [];
		for (var i in mapping) products.push(mapping[i].product_id);
		if (products.length < 1) return [];
		return this.list(null, {id: products});
	}

	async listGroups(session, params) {
		var query = params;
		if (typeof params === "string") {
			query = {"name": params};
		} else if (typeof params === "number") {
			query = {"id": params};
		} else if (params === null) {
			query = {};
		} else if (typeof params !== "object") {
			throw "Parameter should be either string with name, number with id or object with query.";
		}
		
		var groups = await this._table_group.list(query);

		var tasks = [
			Tasks.create('products', this._getProductsInGroup.bind(this), groups, 'id'),
			Tasks.create('picture',  this._opts.files.getFileAsBase64.bind(this._opts.files), groups, 'picture_id')
		];

		return Tasks.merge(tasks, groups);
	}

	async createGroup(session, params) {
		if ((typeof params      !== 'object') ||
			(typeof params.name !== 'string') ||
			(typeof params.description !== 'string')
		) throw "Invalid parameters";		
		var dbTransaction = await this._opts.database.transaction("Create product group");
		try {
			var record = this._table_group.createRecord();
			record.setField("name",        params.name);
			record.setField("description", params.description);
			if ((typeof params.picture === "object") && Array.isArray(params.picture) && (params.picture.length > 0)) {
				var picture = await this._opts.files.createFileFromBase64(params.picture[0], dbTransaction);
				record.setField('picture_id', picture.getIndex());
			}
			await record.flush(dbTransaction);
			await dbTransaction.commit();
			return record.getIndex();
		} catch(e) {
			dbTransaction.rollback();
			throw e;
		}
	}

	async editGroup(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.id        !== 'number')
		) throw "Invalid parameters";
		var records = await this._table_group.selectRecords({id: params.id});
		if (records.length !== 1) throw "Group not found";
		var record = records[0];
	
		var dbTransaction = await this._opts.database.transaction("Edit product group #"+record.getIndex());
		try {
			if (typeof params.name !== 'undefined') {
				if (typeof params.name !== 'string') throw "Expected 'name' to be a string";
				record.setField('name', params.name);
			}
			if (typeof params.description !== 'undefined') {
				if (typeof params.description !== 'string') throw "Expected 'description' to be a string";
				record.setField('description', params.description);
			}
			if ((typeof params.picture === "object") && Array.isArray(params.picture) && (params.picture.length > 0)) {
				var picture = await this._opts.files.createFileFromBase64(params.picture[0], dbTransaction);
				record.setField('picture_id', picture.getIndex());
			}
			await record.flush(dbTransaction);
			await dbTransaction.commit();
			return record.getIndex();
		} catch(e) {
			dbTransaction.rollback();
			throw e;
		}
	}

	async removeGroup(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.id        !== 'number')
		) throw "Invalid parameters";
		var records = await this._table_group.selectRecords({id: params.id});
		if (records.length !== 1) throw "Group not found";
		var record = records[0];
		
		var dbTransaction = await this._opts.database.transaction("Remove group #"+record.getIndex());
		
		try {
			var mappings = await this._table_group_mapping.selectRecords({product_group_id: params.id});
			var operations = [];
			for (var i in mappings) operations.push(mappings[i].destroy(dbTransaction));
			await Promise.all(operations);
			await record.destroy(dbTransaction);
			await dbTransaction.commit();
			return true;
		} catch (e) {
			await dbTransaction.rollback();
			throw e;
		}
	}
	
	//Brands
	
	async _getProductsInBrand(brand_id) {
		return this.list(null, {brand_id: brand_id});
	}

	async listBrands(session, params) {
		var query = params;
		if (typeof params === "string") {
			query = {"name": params};
		} else if (typeof params === "number") {
			query = {"id": params};
		} else if (params === null) {
			query = {};
		} else if (typeof params !== "object") {
			throw "Parameter should be either string with name, number with id or object with query.";
		}

		var brands = await this._table_brand.list(query);

		var tasks = [
			Tasks.create('products', this._getProductsInBrand.bind(this), brands, 'id'),
			Tasks.create('picture',  this._opts.files.getFileAsBase64.bind(this._opts.files), brands, 'picture_id')
		];

		return Tasks.merge(tasks, brands);
	}

	async createBrand(session, params) {
		if ((typeof params      !== 'object') ||
			(typeof params.name !== 'string') ||
			(typeof params.description !== 'string')
		) throw "Invalid parameters";		
		var dbTransaction = await this._opts.database.transaction("Create product brand");
		try {
			var record = this._table_brand.createRecord();
			record.setField("name",        params.name);
			record.setField("description", params.description);
			if ((typeof params.picture === "object") && Array.isArray(params.picture) && (params.picture.length > 0)) {
				var picture = await this._opts.files.createFileFromBase64(params.picture[0], dbTransaction);
				record.setField('picture_id', picture.getIndex());
			}
			await record.flush(dbTransaction);
			await dbTransaction.commit();
			return record.getIndex();
		} catch(e) {
			dbTransaction.rollback();
			throw e;
		}
	}

	async editBrand(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.id        !== 'number')
		) throw "Invalid parameters";
		var records = await this._table_brand.selectRecords({id: params.id});
		if (records.length !== 1) throw "Brand not found";
		var record = records[0];
	
		var dbTransaction = await this._opts.database.transaction("Edit product brand #"+record.getIndex());
		try {
			if (typeof params.name !== 'undefined') {
				if (typeof params.name !== 'string') throw "Expected 'name' to be a string";
				record.setField('name', params.name);
			}
			if (typeof params.description !== 'undefined') {
				if (typeof params.description !== 'string') throw "Expected 'description' to be a string";
				record.setField('description', params.description);
			}
			if ((typeof params.picture === "object") && Array.isArray(params.picture) && (params.picture.length > 0)) {
				var picture = await this._opts.files.createFileFromBase64(params.picture[0], dbTransaction);
				record.setField('picture_id', picture.getIndex());
			}
			await record.flush(dbTransaction);
			await dbTransaction.commit();
			return record.getIndex();
		} catch(e) {
			dbTransaction.rollback();
			throw e;
		}
	}

	async removeBrand(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.id        !== 'number')
		) throw "Invalid parameters";
		var records = await this._table_brand.selectRecords({id: params.id});
		if (records.length !== 1) throw "Brand not found";
		var record = records[0];
		
		var dbTransaction = await this._opts.database.transaction("Remove brand #"+record.getIndex());
		
		try {
			let products = await this._table.selectRecords({brand_id: params.id});
			let operations = [];
			for (let i in products) {
				products[i].setField('brand_id', null);
				operations.push(products[i].flush(dbTransaction));
			}
			await Promise.all(operations);
			await record.destroy(dbTransaction);
			await dbTransaction.commit();
			return true;
		} catch (e) {
			await dbTransaction.rollback();
			throw e;
		}
	}
	
	//Packages

	async _getProductsInPackage(package_id) {
		return this.list(null, {package_id: package_id});
	}

	async listPackages(session, params) {
		var query = params;
		if (typeof params === "string") {
			query = {"name": params};
		} else if (typeof params === "number") {
			query = {"id": params};
		} else if (params === null) {
			query = {};
		} else if (typeof params !== "object") {
			throw "Parameter should be either string with name, number with id or object with query.";
		}

		var packages = await this._table_package.list(query);

		var tasks = [
			Tasks.create('products', this._getProductsInPackage.bind(this), packages, 'id')
		];

		return Tasks.merge(tasks, packages);
	}

	async createPackage(session, params) {
		if ((typeof params      !== 'object') ||
			(typeof params.name !== 'string') ||
			(typeof params.ask  !== 'boolean')
		) throw "Invalid parameters";
		var record = this._table_package.createRecord();
		record.setField("name", params.name);
		record.setField("ask",  params.ask);
		return record.flush();
	}

	async editPackage(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.id        !== 'number')
		) throw "Invalid parameters";
		var records = await this._table_package.selectRecords({id: params.id});
		if (records.length !== 1) throw "Package not found";
		var record = records[0];
	
		if (typeof params.name !== 'undefined') {
			if (typeof params.name !== 'string') throw "Expected 'name' to be a string";
			record.setField('name', params.name);
		}
		if (typeof params.ask !== 'undefined') {
			if (typeof params.ask !== 'boolean') throw "Expected 'ask' to be a boolean";
			record.setField('ask', params.ask);
		}
		return record.flush();
	}

	async removePackage(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.id        !== 'number')
		) throw "Invalid parameters";
		var records = await this._table_package.selectRecords({id: params.id});
		if (records.length !== 1) throw "Package not found";
		var record = records[0];
		
		var dbTransaction = await this._opts.database.transaction("Remove package #"+record.getIndex());
		
		try {
			let products = await this._table.selectRecords({package_id: params.id});
			let operations = [];
			for (let i in products) {
				products[i].setField('package_id', null);
				operations.push(products[i].flush(dbTransaction));
			}
			await Promise.all(operations);
			await record.destroy(dbTransaction);
			await dbTransaction.commit();
			return true;
		} catch (e) {
			await dbTransaction.rollback();
			throw e;
		}
	}

	registerRpcMethods(rpc, prefix="product") {
		if (prefix!=="") prefix = prefix + "/";

		/* Products */
		rpc.addMethod(prefix+"list",                   this.list.bind(this));                        //Products: list products
		rpc.addMethod(prefix+"list/noimg",             this.listNoImg.bind(this));                   //Products: list products (No images)
		rpc.addMethod(prefix+"create",                 this.create.bind(this));                      //Products: create a product
		rpc.addMethod(prefix+"edit",                   this.edit.bind(this));                        //Products: edit a product

		rpc.addMethod(prefix+"remove",                 this.remove.bind(this));                      //Products: remove a product
		rpc.addMethod(prefix+"find",                   this.find.bind(this));                        //Products: find a product by it's name

		rpc.addMethod(prefix+"findByIdentifier",       this.findByIdentifier.bind(this));            //Products: find a product by one of it's identifiers

		rpc.addMethod(prefix+"addStock",               this.addStock.bind(this));                    //Products: add stock
		rpc.addMethod(prefix+"editStock",              this.editStock.bind(this));                   //Products: edit stock
		rpc.addMethod(prefix+"removeStock",            this.removeStock.bind(this));                 //Products: remove stock

		/* Groups */
		rpc.addMethod(prefix+"group/list",             this.listGroups.bind(this));                  //Groups: list groups
		rpc.addMethod(prefix+"group/create",           this.createGroup.bind(this));                 //Groups: create a group
		rpc.addMethod(prefix+"group/edit",             this.editGroup.bind(this));                   //Groups: edit a group
		rpc.addMethod(prefix+"group/remove",           this.removeGroup.bind(this));                 //Groups: remove a group

		/* Identifiers */
		rpc.addMethod(prefix+"identifier/type/list",   this.listIdentifierTypes.bind(this));         //Identifiers: list identifier types
		rpc.addMethod(prefix+"identifier/type/create", this.addIdentifierType.bind(this));           //Identifiers: add an identifier type
		rpc.addMethod(prefix+"identifier/type/edit",   this.editIdentifierType.bind(this));          //Identifiers: edit an identifier type
		rpc.addMethod(prefix+"identifier/type/remove", this.removeIdentifierType.bind(this));        //Identifiers: remove an identifier type

		/* Locations */
		rpc.addMethod(prefix+"location/list",          this.listLocations.bind(this));               //Locations: list locations
		rpc.addMethod(prefix+"location/create",        this.createLocation.bind(this));              //Locations: create a location
		rpc.addMethod(prefix+"location/edit",          this.editLocation.bind(this));                //Locations: edit a location
		rpc.addMethod(prefix+"location/remove",        this.removeLocation.bind(this));              //Locations: remove a location

		/* Brands */
		rpc.addMethod(prefix+"brand/list",             this.listBrands.bind(this));                  //Brands: list brands
		rpc.addMethod(prefix+"brand/create",           this.createBrand.bind(this));                 //Brands: create a brand
		rpc.addMethod(prefix+"brand/edit",             this.editBrand.bind(this));                   //Brands: edit a brand
		rpc.addMethod(prefix+"brand/remove",           this.removeBrand.bind(this));                 //Brands: remove a brand

		/* Packages */
		rpc.addMethod(prefix+"package/list",           this.listPackages.bind(this));                //Packages: list 	
		rpc.addMethod(prefix+"package/create",         this.createPackage.bind(this));               //Packages: create a package
		rpc.addMethod(prefix+"package/edit",           this.editPackage.bind(this));                 //Packages: edit a package
		rpc.addMethod(prefix+"package/remove",         this.removePackage.bind(this));               //Packages: remove a package
	}
}

module.exports = Products;
