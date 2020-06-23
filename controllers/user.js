const User = require('../models/record/user.js');
const FileController = require('./file.js');

class UserController {
	constructor(database, table='users', tablePermissions='user_permissions') {
		this._database = database;
		this._table = table;
		this._tablePermissions = tablePermissions;
		this._fileController = new FileController(database);
	}
	
	_compareArrays(old, current)
	{
		let toRemove = [];
		let toCreate = [];
		for (let i = 0; i < old.length; i++) {
			if (current.indexOf(old[i]) < 0) {
				toRemove.push(old[i]);
			}
		}
		for (let i = 0; i < current.length; i++) {
			if (old.indexOf(current[i]) < 0) {
				toCreate.push(current[i]);
			}
		}
		return [toRemove, toCreate];
	}
	
	async _getPermissionRecords(identifier)
	{
		let [permissionRecords, permissionFields] = await this._database.query('SELECT * FROM `'+this._tablePermissions+'` WHERE `user` = ?', [identifier]);
		return permissionRecords;
	}
	
	async _convertRecordToUser(record) {
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

	async get(identifier) {
		let [records, fields] = await this._database.query('SELECT * FROM `'+this._table+'` WHERE `id` = ?', [identifier]);
		let object = null;
		if (records.length === 1) {
			object = await this._convertRecordToUser(records[0]);
		}
		return object;
	}
	
	async put(object, transaction=null) {
		let result = null;
		if (object instanceof User) {
			let picture = object.getPicture();
			let pictureIdentifier = picture ? await this._fileController.put(picture, transaction) : null;
			if (object.getDirty()) {
				if (object.getIdentifier() === null) {
					let queryResult = await this._database.query(
						'INSERT INTO `'+this._table+'` (`username`,`realname`, `title`, `password`, `active`, `picture`) VALUES (?, ?, ?, ?, ? , ?);', [
						object.getUsername(),
						object.getRealname(),
						object.getTitle(),
						object.getPasswordHash(),
						object.getActive(),
						pictureIdentifier
					], transaction);
					result = queryResult[0].insertId;
					object.setIdentifier(result);
				} else {
					await this._database.query(
						'UPDATE `'+this._table+'` SET `username` = ?, `realname` = ?, `title` = ?, `password` = ?, `active` = ?, `picture` = ? WHERE `id` = ?;', [
						object.getUsername(),
						object.getRealname(),
						object.getTitle(),
						object.getPasswordHash(),
						object.getActive() ? 1 : 0,
						pictureIdentifier,
						object.getIdentifier()
					], transaction);
					result = object.getIdentifier();
				}
				// ---- PERMISSIONS ----
				let currentPermissions = await this._getPermissionRecords(object.getIdentifier());
				let currentPermissionEndpoints = [];
				for (let i = 0; i < currentPermissions.length; i++) {
					currentPermissionEndpoints.push(currentPermissions[i].endpoint);
				}
				let [permissionsToRemove, permissionsToCreate] = this._compareArrays(
					currentPermissionEndpoints,
					object.getPermissions()
				);
				let permissionQueries = [];
				for (let i = 0; i < currentPermissions.length; i++) {
					if (currentPermissions[i].endpoint === permissionsToRemove[i]) {
						permissionQueries.push(this._database.query(
							'DELETE FROM `'+this._tablePermissions+'` WHERE `id` = ?', [
							currentPermissions[i].id
						], transaction));
					}
				}
				for (let i = 0; i < permissionsToCreate.length; i++) {
					permissionQueries.push(this._database.query(
						'INSERT INTO `'+this._tablePermissions+'` (`user`,`endpoint`) VALUES (?, ?);', [
						result,
						permissionsToCreate[i]
					], transaction));
				}
				await Promise.all(permissionQueries);
				// ----             ----
			} else {
				result = object.getIdentifier();
			}
			object.setDirty(false);
		} else {
			throw 'put called with an argument that is not a user object';
		}
		return result;
	}
	
	async remove(input, transaction=null) {
		if (typeof input === 'number') {
			var identifier = input;
			var user = await this.get(identifier);
		} else if (input instanceof User) {
			var identifier = input.getIdentifier();
			var user = input;
		} else {
			throw 'Invalid argument supplied, expected the identifier of a user (number) or a user object';
		}
		if ((identifier === null) || (user === null)) {
			return false;
		}
		await this._database.query(
			'DELETE FROM `'+this._tablePermissions+'` WHERE `user` = ?', [
			identifier
		], transaction);
		await this._database.query(
			'DELETE FROM `'+this._table+'` WHERE `id` = ?', [
			identifier
		], transaction);
		let picture = user.getPicture();
		if (picture !== null) {
			await this._fileController.remove(picture, transaction);
		}
		user.setIdentifier(null);
		return true;
	}
	
	async findByUsername(name='%') {
		let [records, fields] = await this._database.query('SELECT * FROM `'+this._table+'` WHERE `username` = ?', [name]);
		let objects = [];
		for (let i = 0; i<records.length; i++) {
			objects.push(this._convertRecordToUser(records[i]));
		}
		return Promise.all(objects);
	}
}

module.exports = UserController;
