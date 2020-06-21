const User = require('../models/record/user.js');
const FileController = require('./files.js');

class UserController {
	constructor(database, table='users', tablePermissions='user_permissions') {
		this._database = database;
		this._table = table;
		this._tablePermissions = tablePermissions;
		this._fileController = new FileController(database);
	}
	
	async _convertRecordToUser(record) {
		if (record.picture !== null) {
			record.picture(this._fileController.get(record.picture));
		}
		record.permissions = [];
		let [permissionRecords, permissionFields] = await this._database.query('SELECT * FROM `'+this._tablePermissions+'` WHERE `user` = ?', [record.id]);
		for (let i = 0; i < permissionRecords.length; i++) {
			if (record.permissions.indexOf(permissionRecords[i].endpoint) < 0) {
				record.permissions.push(permissionRecords[i].endpoint);
			}
		}
		if (record.picture !== null) {
			record.picture = this._fileController.get(record.picture);
		}
		let object = new User(record);
		object.setDirty(false);
		return object;
	}

	async get(identifier) {
		let [records, fields] = await this._database.query('SELECT * FROM `'+this._table+'` WHERE `id` = ?', [identifier]);
		let object = null;
		if (records.length === 1) {
			object = await _convertRecordToUser([0]);
		}
		return object;
	}
	
	async put(object, transaction=null) {
		if (object instanceof User) {
			throw "NOT IMPLEMENTED";
		} else {
			throw "Expected a user object";
		}
	}
	
	async remove(input, transaction=null) {
		return false;
	}
	
	async findByUsername(name='%') {
		let [records, fields] = await this._database.query('SELECT * FROM `'+this._table+'` WHERE `username` = ?', [identifier]);
		let objects = [];
		for (let i = 0; i<records.length; i++) {
			objects.push(_convertRecordToUser(records[i]));
		}
		return Promise.all(objects);
	}
}

module.exports = UserController;
