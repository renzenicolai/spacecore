'use strict'; 

const Schema = require('./schema.js');

class ProductBrandSchema extends Schema {
	constructor(database) {
		super(database, 'product_brands');
		this._schema = {
			id:          { index: true,  type: 'int(11)',      isNullable: false,               },
			name:        { index: false, type: 'varchar(200)', isNullable: false,               },
			description: { index: false, type: 'text',         isNullable: false,               },
			picture:     { index: false, type: 'int(11)',      isNullable: true,  default: null }
		};
		
		this._constraints = [
			{name: 'picture_of_product_brand', key: 'picture', table: 'files', column: 'id'}
		];
	}
}

class ProductPackageSchema extends Schema {
	constructor(database) {
		super(database, 'product_packages');
		this._schema = {
			id:          { index: true,  type: 'int(11)',      isNullable: false,               },
			name:        { index: false, type: 'varchar(200)', isNullable: false,               },
			ask:         { index: false, type: 'tinyint(1)',   isNullable: false, default: 0    }
		};
	}
}

class ProductIdentifierSchema extends Schema {
	constructor(database) {
		super(database, 'product_identifiers');
		this._schema = {
			id:         { index: true,  type: 'int(11)',      isNullable: false },
			product:    { index: false, type: 'int(11)',      isNullable: false },
			type:       { index: false, type: 'int(11)',      isNullable: false },
			value:      { index: false, type: 'varchar(200)', isNullable: false }
		};
		
		this._constraints = [
			{name: 'product_of_product_identifier', key: 'product', table: 'products',                 column: 'id'},
			{name: 'type_of_product_identifier',    key: 'type',    table: 'product_identifier_types', column: 'id'}
		];
		
		this._children = [
			new ProductIdentifierTypeSchema(database)
		];
	}
}

class ProductIdentifierTypeSchema extends Schema {
	constructor(database) {
		super(database, 'product_identifier_types');
		this._schema = {
			id:          { index: true,  type: 'int(11)',      isNullable: false },
			shortname:   { index: false, type: 'varchar(200)', isNullable: false },
			name:        { index: false, type: 'varchar(200)', isNullable: false },
			description: { index: false, type: 'text',         isNullable: false }
		};
	}
}

class ProductGroupSchema extends Schema {
	constructor(database) {
		super(database, 'product_groups');
		this._schema = {
			id:          { index: true,  type: 'int(11)',      isNullable: false,               },
			name:        { index: false, type: 'varchar(200)', isNullable: false,               },
			description: { index: false, type: 'text',         isNullable: false,               },
			addtonew:    { index: false, type: 'tinyint(1)',   isNullable: false, default: 0    },
			picture:     { index: false, type: 'int(11)',      isNullable: true,  default: null }
		};

		this._constraints = [
			{name: 'picture_of_product_group', key: 'picture', table: 'files', column: 'id'}
		];

		this._children = [
			new ProductGroupMappingSchema(database)
		];
	}
}

class ProductGroupMappingSchema extends Schema {
	constructor(database) {
		super(database, 'product_group_mappings');
		this._schema = {
			id:          { index: true,  type: 'int(11)', isNullable: false },
			product:     { index: false, type: 'int(11)', isNullable: false },
			group:       { index: false, type: 'int(11)', isNullable: false }
		};
		
		this._constraints = [
			{name: 'product_of_product_group_mapping', key: 'product',  table: 'products',        column: 'id'},
			{name: 'group_of_product_group_mapping',   key: 'group',    table: 'product_groups', column: 'id'},
		];
	}
}

class ProductLocationSchema extends Schema {
	constructor(database) {
		super(database, 'product_locations');
		this._schema = {
			id:          { index: true,  type: 'int(11)',      isNullable: false },
			name:        { index: false, type: 'varchar(200)', isNullable: false },
			description: { index: false, type: 'text',         isNullable: false }
		};

		this._children = [
			new ProductLocationMappingSchema(database)
		];
	}
}

class ProductLocationMappingSchema extends Schema {
	constructor(database) {
		super(database, 'product_location_mapping');
		this._schema = {
			id:       { index: true,  type: 'int(11)', isNullable: false },
			product:  { index: false, type: 'int(11)', isNullable: false },
			location: { index: false, type: 'int(11)', isNullable: false }
		};
		
		this._constraints = [
			{name: 'product_of_product_location_mapping',  key: 'product',  table: 'products',          column: 'id'},
			{name: 'location_of_product_location_mapping', key: 'location', table: 'product_locations', column: 'id'}
		];
	}
}

class ProductPriceSchema extends Schema {
	constructor(database) {
		super(database, 'product_prices');
		this._schema = {
			id:       { index: true,  type: 'int(11)', isNullable: false },
			amount:   { index: false, type: 'int(11)', isNullable: false },
			product:  { index: false, type: 'int(11)', isNullable: false },
			group:    { index: false, type: 'int(11)', isNullable: false }
		};
		
		this._constraints = [
			{name: 'product_of_product_price', key: 'product', table: 'products',       column: 'id'},
			{name: 'group_of_product_price',   key: 'group',   table: 'product_groups', column: 'id'}
		];
	}
}

class ProductStockSchema extends Schema {
	constructor(database) {
		super(database, 'product_stock');
		this._schema = {
			id:                { index: true,  type: 'int(11)',      isNullable: false,               },
			product:           { index: false, type: 'int(11)',      isNullable: false,               },
			amount_initial:    { index: false, type: 'int(11)',      isNullable: false,               }, // Amount of products
			amount_current:    { index: false, type: 'int(11)',      isNullable: false,               }, // Current amount of products (decreases when a product is sold that maps to this stock entry)
			timestamp_initial: { index: false, type: 'int(11)',      isNullable: false, default: 0    }, // Timestamp at which the stock record was created
			timestamp_current: { index: false, type: 'int(11)',      isNullable: false, default: 0    }, // Timestamp at which the last product mapped to this stock record was sold
			comment:           { index: false, type: 'varchar(256)', isNullable: false, default: ''   },
			price:             { index: false, type: 'int(11)',      isNullable: true,  default: null }, // Amount the product cost the company or, when owned by a relation the amount the relation gets paid per product sold
			relation:          { index: false, type: 'int(11)',      isNullable: true,  default: null }, // (Optional) the identifier of the relaiton that owns this stock
		};
		
		this._constraints = [
			{name: 'product_of_product_stock',  key: 'product',  table: 'products',  column: 'id'},
			{name: 'relation_of_product_stock', key: 'relation', table: 'relations', column: 'id'}
		];
	}
}

class ProductSchema extends Schema {
	constructor(database) {
		super(database, 'products');
		this._schema = {
			id:          { index: true,  type: 'int(11)',      isNullable: false,               },
			name:        { index: false, type: 'varchar(200)', isNullable: false,               },
			description: { index: false, type: 'text',         isNullable: false,               },
			enabled:     { index: false, type: 'tinyint(1)',   isNullable: false, default: 0    },
			brand:       { index: false, type: 'int(11)',      isNullable: true,  default: null },
			package:     { index: false, type: 'int(11)',      isNullable: true,  default: null },
			picture:     { index: false, type: 'int(11)',      isNullable: true,  default: null }
		}
		
		this._constraints = [
			{name: 'brand_of_product',   key: 'brand',   table: 'product_brands',   column: 'id'},
			{name: 'package_of_product', key: 'package', table: 'product_packages', column: 'id'},
			{name: 'picture_of_product', key: 'picture', table: 'files',            column: 'id'}
		];
		
		this._children = [
			new ProductBrandSchema(database),
			new ProductPackageSchema(database),
			new ProductIdentifierSchema(database),
			new ProductGroupSchema(database),
			new ProductLocationSchema(database),
			new ProductPriceSchema(database),
			new ProductStockSchema(database)
		];
	}
}

module.exports = ProductSchema;
