'use strict';
const Controller = require('../models/controller.js');
const User = require('../models/record/user.js');
const FileController = require('./file.js');

class ProductController extends Controller {
	constructor(database) {
		super(database);
		this._database = database;
		this._table = 'relations';
		this._fileController = new FileController(database);
	}
}

module.exports = ProductController;
