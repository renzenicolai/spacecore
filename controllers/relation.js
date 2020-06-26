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
		record.permissions = [];
		let permissionRecords = await this._getPermissionRecords(record.id);
		for (let i = 0; i < permissionRecords.length; i++) {
			if (record.permissions.indexOf(permissionRecords[i].endpoint) < 0) {
				record.permissions.push(permissionRecords[i].endpoint);
			}
		}
		record.active = Boolean(record.active);
		let object = new User(record);
		object.setDirty(false);
		return object;
	}
}

module.exports = RelationController;
