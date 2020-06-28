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

		//FIXME
		record.addresses = [];
		record.emailaddresses = [];
		record.phonenumbers = [];
		record.bankaccounts = [];
		record.groups = [];
		record.tokens = [];

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
	
	async put(object, parentTransaction=null) {
		let result = null;
		if (object instanceof Relation) {
			let transaction = parentTransaction;
			if (parentTransaction === null) {
				transaction = await this._database.transaction('Put relation '+object.getNickname());
			}
			try {
				let picture = object.getPicture();
				let pictureIdentifier = picture ? await this._fileController.put(picture, transaction) : null;
				if (object.getDirty()) {
					if (object.getIdentifier() === null) {
						let queryResult = await this._database.query(
							'INSERT INTO `'+this._table+'` (`nickname`,`realname`, `picture`) VALUES (?, ?, ?);', [
							object.getNickname(),
							object.getRealname(),
							pictureIdentifier
						], transaction);
						result = queryResult[0].insertId;
						object.setIdentifier(result);
					} else {
						await this._database.query(
							'UPDATE `'+this._table+'` SET `nickname` = ?, `realname` = ?, `picture` = ? WHERE `id` = ?;', [
							object.getUsername(),
							object.getRealname(),
							pictureIdentifier,
							object.getIdentifier()
						], transaction);
						result = object.getIdentifier();
					}
				} else {
					result = object.getIdentifier();
				}
			} catch (error) {
				if (parentTransaction === null) {
					await transaction.rollback();
				}
				throw error;
			}
			object.setDirty(false);
			if (parentTransaction === null) {
				await transaction.commit();
			}
		} else {
			throw 'put called with an argument that is not a relation object';
		}
		return result;
	}
	
	async remove(object) {
		return null;
	}
	
	async find(identifier) {
		return null;
	}
}

module.exports = RelationController;
