'use strict';
const Controller = require('../models/controller.js');
const Relation = require('../models/record/relation.js');
const FileController = require('./file.js');

class RelationController extends Controller {
	constructor(database) {
		super(database);
		this._database = database;
		this._table = 'relations';
		this._fileController = new FileController(database);
	}

	async _convertRecordToRelation(record) {
		if (record.picture !== null) {
			record.picture = await this._fileController.get(record.picture);
		}
		let object = new Relation(record);
		object.setDirty(false);
		return object;
	}

	async get(identifier) {
		let [records, fields] = await this._database.query('SELECT * FROM `'+this._table+'` WHERE `id` = ?', [identifier]);
		let object = null;
		if (records.length === 1) {
			object = await this._convertRecordToRelation(records[0]);
		}
		return object;
	}
	
	async put(object) {
		
	}
	
	async remove(object) {
		
	}
	
	async find(identifier) {
		
	}
}

module.exports = RelationController;
