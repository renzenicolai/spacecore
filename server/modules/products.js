"use strict";

const Tasks = require('../lib/tasks.js');

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
			Tasks.create('stock',        this._getStock.bind(this),                               products, 'id'),
			Tasks.create('brand',        this._getBrand.bind(this),                               products, 'brand_id'),
			Tasks.create('identifiers',  this._getIdentifiers.bind(this),                         products, 'id'),
			Tasks.create('package',      this._getPackage.bind(this),                             products, 'package_id'),
			Tasks.create('prices',       this._getPrices.bind(this),                              products, 'id')
		];
		return Tasks.merge(tasks, products);
	}
	
	async create(session, params) {
		if (typeof params !== 'object')                                                              throw "Expected parameter to be an object";
		if (typeof params.name !== 'string')                                                         throw "Missing required property 'name'";
		if ((typeof params.description !== 'undefined') && (typeof params.description !== 'string')) throw "Expected description to to be a string";
		if ((typeof params.active !== 'undefined') && (typeof params.active !== 'boolean'))          throw "Expected active to be a boolean";
		if ((typeof params.brand_id !== 'undefined') && (typeof params.brand_id !== 'number'))       throw "Expected brand_id to be a number";
		if ((typeof params.picture_id !== 'undefined') && (typeof params.picture_id !== 'number'))   throw "Expected picture_id to be a number";
		if ((typeof params.package_id !== 'undefined') && (typeof params.package_id !== 'number'))   throw "Expected package_id to be a number";
		var dbTransaction = await this._opts.database.transaction("Add product ("+params.name+")");
		var product = this._table.createRecord();
		try {
			await this.fillProductRecord(product, params, dbTransaction);
		} catch(e) {
			dbTransaction.rollback();
			throw e;
		}
		await product.flush(dbTransaction);
		await dbTransaction.commit();
		return product.getIndex();
	}
	
	async edit(session, params) {
		var product = await this._findById(params);
		var dbTransaction = await this._opts.database.transaction("Edit product #"+product.getIndex);
		try {
			await this.fillProductRecord(product, params, dbTransaction);
		} catch(e) {
			dbTransaction.rollback();
			throw e;
		}
		await product.flush(dbTransaction);
		await dbTransaction.commit();
		return product.getIndex();
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
		
		if (typeof params.brand_id === "number") {
			if (this._getBrand(params.brand_id) === null) throw "Invalid brand id supplied";
			product.setField("brand_id", params.brand_id);
		}
		
		if (typeof params.picture === "number") {
			var picture = await this._opts.files.getFileAsBase64(params.picture_id);
			if (picture === null) throw "Invalid file id supplied";
			product.setField("picture_id", params.picture_id);
		}
	
		if ((typeof params.picture === "object") && Array.isArray(params.picture) && (params.picture.length > 0)) {
			var picture = await this._opts.files.createFileFromBase64(params.picture[0], transaction);
			product.setField('picture_id', picture.getIndex());
		}
			
		if (typeof params.package_id === "number") {
			if (this._getPackage(params.package_id) === null) throw "Invalid package id supplied";
			product.setField("package_id", params.package_id);
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
		} catch (e) {
			await dbTransaction.rollback();                                              //Cancel the transaction
			console.log("Could not remove product:",e);
			throw e;
		}
		await dbTransaction.commit();                                                    //Commit the transaction
		return true;
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
			(typeof params.long_name !== 'string')
		) throw "Invalid parameters";
		var record = this._table_identifier_type.createRecord();
		record.setField("name", params.name);
		record.setField("long_name", params.long_name);
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
			record.setField('name', name);
		}
		if (typeof params.long_name !== 'undefined') {
			if (typeof params.long_name !== 'string') throw "Expected 'long_name' to be a string";
			record.setField('long_name', long_name);
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
			for (var i in identifiers) operations.push(identifiers[i].destroy(transaction));
			await Promise.all(operations);
			await record.destroy(dbTransaction);
			await dbTransaction.commit();
		} catch (e) {
			await dbTransaction.rollback();
		}
		return true;
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

	async addIdentifier(session, params) {
		if ((typeof params            !== 'object') ||
			(typeof params.product_id !== 'number') ||
			(typeof params.type_id    !== 'number') ||
			(typeof params.value      !== 'string')
		) throw "Invalid parameters";
		var record = this._table_identifier.createRecord();
		record.setField("product_id", params.product_id);
		record.setField("type_id", params.type_id);
		record.setField("value", params.value);
		return record.flush();
	}

	async editIdentifier(session, params) {
		if ((typeof params           !== 'object') ||
			(typeof params.id        !== 'number')
		) throw "Invalid parameters";
		var records = await this._table_identifier.selectRecords({id: params.id});
		if (records.length !== 1) throw "Identifier not found";
		var record = records[0];
		if (typeof params.product_id !== 'undefined') {
			if (typeof params.product_id !== 'number') throw "Expected 'product_id' to be a number";
			record.setField('product_id', product_id);
		}
		if (typeof params.type_id !== 'undefined') {
			if (typeof params.type_id !== 'number') throw "Expected 'type_id' to be a number";
			record.setField('type_id', type_id);
		}
		if (typeof params.value !== 'undefined') {
			if (typeof params.value !== 'string') throw "Expected 'value' to be a string";
			record.setField('value', value);
		}
		return record.flush();
	}

	async removeIdentifier(session, params) {
		return "Not implemented";
	}

	//Locations

	async listLocations(session, params) {
		var query = null;
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
		
		var visible = true;
		if (typeof params.visible !== 'undefined') {
			if (typeof params.visible !== 'boolean')  throw "Invalid parameter 'visible', expected boolean.";
			visible = params.visible;
		}
		
		var description = "";
		if (typeof params.description !== 'undefined') {
			if (typeof params.description !== 'string')  throw "Invalid parameter 'description', expected string.";
			description = params.description;
		}
		
		var record = this._table_location.createRecord();
		record.setField("name",        params.name);
		record.setField("sub",         sub);
		record.setField("visible",     visible);
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
			record.setField('name', name);
		}
		if (typeof params.sub !== 'undefined') {
			if ((typeof params.sub !== 'number') && (params.sub !== 'null')) throw "Expected 'sub' to be a number or null";
			record.setField('sub', sub);
		}
		if (typeof params.visible !== 'undefined') {
			if (typeof params.visible !== 'boolean') throw "Expected 'visible' to be a boolean";
			record.setField('visible', visible);
		}
		if (typeof params.description !== 'undefined') {
			if (typeof params.description !== 'string') throw "Expected 'description' to be a string";
			record.setField('description', description);
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
			for (var i in mappings) operations.push(mappings[i].destroy(transaction));
			await Promise.all(operations);
			await record.destroy(dbTransaction);
			await dbTransaction.commit();
		} catch (e) {
			await dbTransaction.rollback();
		}
		return true;
	}

	listStockRecords(session, params) {
		return this._table_stock.selectRecords(params, "ORDER BY `timestamp_initial` ASC");
	}

	async addStock(session, params) {
		if (typeof params !== 'object') {
			return "Params should be object containing 'product_id' and 'amount'.";
		}

		if (!("product_id" in params) && (typeof params.product_id === "number")) {
			return "Missing product_id parameter (or invalid type, expect number).";
		}

		if (!("amount" in params) && (typeof params.amount === "number")) {
			return "Missing amount parameter (or invalid type, expect number).";
		}

		var product = params.product_id;
		var amount = params.amount;

		var dbTransaction = await this._opts.database.transaction("addStock (Product: "+product+", Amount: "+amount+")");

		var record = this._table_stock.createRecord();
		record.setField("product_id", product);
		record.setField("amount_initial", amount);
		record.setField("amount_current", amount);

		return record.flush(dbTransaction).then(async (result) => {
			await dbTransaction.commit();
			return result;
		}).catch(async (error) => {
			await dbTransaction.rollback();
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
		if (!("product_id" in params) || (typeof params.product_id !== "number")) throw "Missing product_id param.";
		if (!("group_id"   in params) || (typeof params.group_id   !== "number")) throw "Missing group_id param.";

		//Delete all existing matching price records
		var records = await this._table_price.selectRecords({product_id: params.product_id, person_group_id: params.group_id});
		for (var i in records) await records[i].destroy();

		//If requested: create a new price record
		if (("amount" in params) && (typeof params.amount === "number")) {
			var record = this._table_price.createRecord();
			record.setField("product_id", params.product_id);
			record.setField("person_group_id", params.group_id);
			record.setField("amount", params.amount);
			await record.flush();
		}

		return true;
	}

	async addGroupToProduct(session, params) {
		throw "Not implemented";
	}

	async removeGroupFromProduct(session, params) {
		throw "Not implemented";
	}
	
	async _getProductsInGroup(product_group_id) {
		var mapping = await this._table_group_mapping.list({product_group_id : product_group_id});
		var products = [];
		for (var i in mapping) products.push(mapping[i].product_id);
		if (products.length < 1) return [];
		return this.list(null, {id: products});
	}

	async listGroups(session, params) {
		var query = null;
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
			Tasks.create('products', this._getProductsInGroup.bind(this), groups, 'id')
		];

		return Tasks.merge(tasks, groups);
	}

	async createGroup(session, params) {
		if ((typeof params      !== 'object') ||
			(typeof params.name !== 'string')
		) throw "Invalid parameters";
		
		var description = "";
		if (typeof params.description !== 'undefined') {
			if (typeof params.description !== 'string')  throw "Invalid parameter 'description', expected string.";
			description = params.description;
		}
		
		var record = this._table_group.createRecord();
		record.setField("name",        params.name);
		record.setField("description", description);
		return record.flush();
	}

	async editGroup(session, params) {
		throw "Not implemented";
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
			for (var i in mappings) operations.push(mappings[i].destroy(transaction));
			await Promise.all(operations);
			await record.destroy(dbTransaction);
			await dbTransaction.commit();
		} catch (e) {
			await dbTransaction.rollback();
		}
		return true;
	}
	
	//Brands

	async listBrands(session, params) {
		return "Not implemented";
	}

	async createBrand(session, params) {
		return "Not implemented";
	}

	async editBrand(session, params) {
		return "Not implemented";
	}

	async removeBrand(session, params) {
		return "Not implemented";
	}
	
	//Packages

	async listPackages(session, params) {
		return "Not implemented";
	}

	async createPackage(session, params) {
		return "Not implemented";
	}

	async editPackage(session, params) {
		return "Not implemented";
	}

	async removePackage(session, params) {
		return "Not implemented";
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

		rpc.addMethod(prefix+"addIdentifier",          this.addIdentifier.bind(this));               //Products: add an identifier
		rpc.addMethod(prefix+"editIdentifier",         this.editIdentifier.bind(this));              //Products: edit an identifier
		rpc.addMethod(prefix+"removeIdentifier",       this.removeIdentifier.bind(this));            //Products: remove an identifier
		rpc.addMethod(prefix+"findByIdentifier",       this.findByIdentifier.bind(this));            //Products: find a product by one of it's identifiers

		rpc.addMethod(prefix+"addStock",               this.addStock.bind(this));                    //Products: add stock
		rpc.addMethod(prefix+"editStock",              this.editStock.bind(this));                   //Products: edit stock
		rpc.addMethod(prefix+"removeStock",            this.removeStock.bind(this));                 //Products: remove stock

		rpc.addMethod(prefix+"setPrice",               this.setPrice.bind(this));                    //Products: set the price of a product for a group

		rpc.addMethod(prefix+"addToGroup",             this.addGroupToProduct.bind(this));           //Products: add a group to a person
		rpc.addMethod(prefix+"removeFromGroup",        this.removeGroupFromProduct.bind(this));      //Products: remove a group from a person

		/* Groups */
		rpc.addMethod(prefix+"group/list",             this.listGroups.bind(this));                  //Groups: list groups
		rpc.addMethod(prefix+"group/create",           this.createGroup.bind(this));                 //Groups: create a group
		rpc.addMethod(prefix+"group/edit",             this.editGroup.bind(this));                   //Groups: edit a group
		rpc.addMethod(prefix+"group/remove",           this.removeGroup.bind(this));                 //Groups: remove a group

		/* Identifiers */
		rpc.addMethod(prefix+"identifier/type/list",   this.listIdentifierTypes.bind(this));         //Identifiers: list identifier types
		rpc.addMethod(prefix+"identifier/type/add",    this.addIdentifierType.bind(this));           //Identifiers: add an identifier type
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
