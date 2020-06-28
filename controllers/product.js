'use strict';
const Controller = require('./controller.js');
const User = require('../models/record/user.js');
const FileController = require('./file.js');

class ProductController extends Controller {
	constructor(database) {
		super(database);
		this._database = database;
		this._table = 'products';
		this._fileController = new FileController(database);
	}
}

module.exports = ProductController;
