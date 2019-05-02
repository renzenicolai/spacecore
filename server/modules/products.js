"use strict";

const Tasks = require('../lib/tasks.js');

class Products {
	constructor(opts) {
		this._opts = Object.assign({
			database: null,
			files: null,
			table: 'products',
			table_group: 'product_group',
			table_group_mapping: 'product_group_mapping',
			table_location: 'product_location',
			table_location_mapping: 'product_location_mapping',
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
		this._table_group            = this._opts.database.table(this._opts.table_group);
		this._table_group_mapping    = this._opts.database.table(this._opts.table_group_mapping);
		this._table_location         = this._opts.database.table(this._opts.table_location);
		this._table_location_mapping = this._opts.database.table(this._opts.table_location_mapping);
		this._table_brand            = this._opts.database.table(this._opts.table_brand);
		this._table_package          = this._opts.database.table(this._opts.table_package);
		this._table_price            = this._opts.database.table(this._opts.table_price);
		this._table_stock            = this._opts.database.table(this._opts.table_stock);
		this._table_identifier       = this._opts.database.table(this._opts.table_identifier);
		this._table_identifier_type  = this._opts.database.table(this._opts.table_identifier_type);
	}
	
	_getGroups(product_id) {
		return this._table_group_mapping.selectRecordsRaw("SELECT mapping.id as 'mapping_id', group.id, group.name, group.description FROM `"+this._opts.table_group_mapping+"` AS `mapping` INNER JOIN `"+this._opts.table_group+"` AS `group` ON mapping.product_group_id = group.id WHERE `product_id` = ?", [product_id], false);
	}
	
	_getStock(product_id) {
		return this._table_stock.selectRecordsRaw("SELECT `id`, `product_id`, `amount_initial`, `amount_current`, `timestamp_initial`, `timestamp_current`, `person_id`, `comment` FROM `"+this._opts.table_stock+"` WHERE `product_id` = ? AND `amount_current` > 0 ORDER BY `timestamp_initial` ASC", [product_id], false);
	}
		
	_getIdentifiers(product_id) {
		return this._table_identifier.list({product_id: product_id});
	}
	
	async _getBrand(brand_id, asRecord=false) {
		if (brand_id === null) return null;
		var brands = await this._table_brand.selectRecords({"id":brand_id});
		if (brands.length !== 1) return null;
		if (asRecord) return brands[0];
		return brands[0].getFields();
	}
	
	async _getPackage(package_id, asRecord=false) {
		if (package_id === null) return null;
		var packages = await this._table_package.selectRecords({"id":package_id});
		if (packages.length !== 1) return null;
		if (asRecord) return packages[0];
		return packages[0].getFields();
	}
	
	_getPrices(product_id) {
		return this._table_price.list({product_id: product_id});
	}

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
	
	async create(session, params) {
		if (typeof params !== 'object')                                                              throw "Expected parameter to be an object";
		if (typeof params.name !== 'string')                                                         throw "Missing required property 'name'";
		if ((typeof params.description !== 'undefined') && (typeof params.description !== 'string')) throw "Expected description to to be a string";
		if ((typeof params.hidden !== 'undefined') && (typeof params.hidden !== 'boolean'))          throw "Expected hidden to be a boolean";
		if ((typeof params.brand_id !== 'undefined') && (typeof params.brand_id !== 'number'))       throw "Expected brand_id to be a number";
		if ((typeof params.picture_id !== 'undefined') && (typeof params.picture_id !== 'number'))   throw "Expected picture_id to be a number";
		if ((typeof params.picture_id !== 'undefined') && (typeof params.picture !== 'undefined'))   throw "Supply either a picture as file or the id of an existing picture, but not both";
		if ((typeof params.package_id !== 'undefined') && (typeof params.package_id !== 'number'))   throw "Expected package_id to be a number";
		
		var dbTransaction = await this._opts.database.transaction("Add product ("+params.name+")");
		var record = this._table.createRecord();
		
		record.setField("name", params.name);
		if (typeof params.description === "string") {
			record.setField("description", params.description);
		} else {
			record.setField("description", "");
		}
		if (typeof params.hidden === "boolean") {
			record.setField("hidden", params.hidden);
		}
		if (typeof params.brand_id === "number") {
			if (this._getBrand(params.brand_id) === null) {
				await dbTransaction.rollback();
				throw "Invalid brand id supplied";
			}
			record.setField("brand_id", params.brand_id);
		}
		if (typeof params.picture_id === "number") {
			if (this._opts.files.getFileAsBase64(params.picture_id) === null) {
				await dbTransaction.rollback();
				throw "Invalid picture id supplied";
			}
			record.setField("picture_id", params.picture_id);
		}
		if (typeof params.package_id === "number") {
			if (this._getPackage(params.package_id) === null) {
				await dbTransaction.rollback();
				throw "Invalid package id supplied";
			}
			record.setField("package_id", params.package_id);
		}
		
		try {
			if ((typeof params.picture === "object") && Array.isArray(params.picture) && (params.picture.length > 0)) {
				var pictureRecord = await this._opts.files.createFileFromBase64(params.picture[0], dbTransaction);
				record.setField('picture_id', pictureRecord.getIndex());
			}
			await record.flush(dbTransaction);
		} catch (e) {
			await dbTransaction.rollback();
			throw e;
		}		
		
		await dbTransaction.commit();
		return record.getIndex();
	}
	
	async edit(session, params) {
		return "Not implemented";
	}
	
	async remove(session, params) {
		return "Not implemented";
	}
	
	async find(session, params) {
		if (typeof params !== "string") throw "Parameter should be search string";
		return this.list(session, {"name": {"LIKE":"%"+params+"%"}});
	}
	
	async findByIdentifier(session, params) {
		var barcodes = await this._listIdentifiers(session, params);
		if (barcodes.length < 1) return [];
		var products = [];
		for (var i in barcodes) producs.push(barcodes[i].product_id);
		return this.list(session, {id: products});
	}
	
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
			query = {};
		} else {
			return Promise.reject("Parameter should be either string with name or number with id.");
		}
		return this._table_location.list(query);
	}
	
	async createLocation(session, params) {
		return "Not implemented";
	}
	
	async editLocation(session, params) {
		return "Not implemented";
	}
	
	async removeLocation(session, params) {
		return "Not implemented";
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
			return "Missing amount parameter.";
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
	
	async listGroups(session, params) {
		throw "Not implemented";
	}
	
	async createGroup(session, params) {
		throw "Not implemented";
	}
	
	async editGroup(session, params) {
		throw "Not implemented";
	}
	
	async removeGroup(session, params) {
		throw "Not implemented";
	}
	
	registerRpcMethods(rpc, prefix="product") {
		if (prefix!=="") prefix = prefix + "/";
		
		/* Products */
		rpc.addMethod(prefix+"list",                   this.list.bind(this));                        //Products: list products
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
		
		/* Groups */
		rpc.addMethod(prefix+"group/list",             this.listGroups.bind(this));                  //Groups: list groups
		rpc.addMethod(prefix+"group/create",           this.createGroup.bind(this));                 //Groups: create a group
		rpc.addMethod(prefix+"group/edit",             this.editGroup.bind(this));                   //Groups: edit a group
		rpc.addMethod(prefix+"group/remove",           this.removeGroup.bind(this));                 //Groups: remove a group
	}
}

module.exports = Products;
