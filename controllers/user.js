'use strict';
const Controller = require('./controller.js');
const User = require('../models/record/user.js');
const FileController = require('./file.js');

class UserController extends Controller {
	constructor(database) {
		super(database);
		this._database = database;
		this._table = 'users';
		this._tablePermissions = 'user_permissions';
		this._fileController = new FileController(database);
	}
	
	async _convertRecordToUser(record) {
		if (record.picture !== null) {
			record.picture = await this._fileController.get(record.picture);
		}
		record.permissions = await this._getSubRecords(this._tablePermissions, record.id, 'user', 'endpoint');
		record.enabled = Boolean(record.enabled);
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
	
	async put(object, parentTransaction=null) {
		let result = null;
		if (object instanceof User) {
			let transaction = parentTransaction;
			if (parentTransaction === null) {
				transaction = await this._database.transaction('Put user '+object.getUsername());
			}
			try {
				let picture = object.getPicture();
				let pictureIdentifier = picture ? await this._fileController.put(picture, transaction) : null;
				if (object.getDirty()) {
					if (object.getIdentifier() === null) {
						let queryResult = await this._database.query(
							'INSERT INTO `'+this._table+'` (`username`,`realname`, `title`, `password`, `enabled`, `picture`) VALUES (?, ?, ?, ?, ? , ?);', [
							object.getUsername(),
							object.getRealname(),
							object.getTitle(),
							object.getPasswordHash(),
							object.getEnabled(),
							pictureIdentifier
						], transaction);
						result = queryResult[0].insertId;
						object.setIdentifier(result);
					} else {
						await this._database.query(
							'UPDATE `'+this._table+'` SET `username` = ?, `realname` = ?, `title` = ?, `password` = ?, `enabled` = ?, `picture` = ? WHERE `id` = ?;', [
							object.getUsername(),
							object.getRealname(),
							object.getTitle(),
							object.getPasswordHash(),
							object.getEnabled() ? 1 : 0,
							pictureIdentifier,
							object.getIdentifier()
						], transaction);
						result = object.getIdentifier();
					}
					await this._putArraySubRecords(this._tablePermissions, object.getIdentifier(), 'user', 'endpoint', object.getPermissions(), transaction);
					// ---- PERMISSIONS ----
					/*let currentPermissions = await this._getSubRecords(this._tablePermissions, object.getIdentifier(), this._tablePermissions, 'user');
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
					*/
					// ----             ----
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
			throw 'put called with an argument that is not a user object';
		}
		return result;
	}
	
	async remove(input, parentTransaction=null) {
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
		let transaction = parentTransaction;
		if (parentTransaction === null) {
			transaction = await this._database.transaction('Remove user '+user.getUsername());
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
		if (parentTransaction === null) {
			await transaction.commit();
		}
		return true;
	}
	
	async findForAuthentication(username) {
		let [records, fields] = await this._database.query('SELECT * FROM `'+this._table+'` WHERE `username` = ? AND `enabled` = ?', [username, 1]);
		let objects = [];
		for (let i = 0; i<records.length; i++) {
			objects.push(this._convertRecordToUser(records[i]));
		}
		return Promise.all(objects);
	}
	
	async find(identifier=null, username=null, realname=null, title=null, enabled=null, exactMatch=false) {
		let query = '';
		let values = [];
		
		if (typeof identifier === 'number') {
			query += ((query!=='')?' AND ':'')+'`id` = ?';
			values.push(identifier);
		} else if (identifier !== null) {
			throw 'Expected identifier to be a number or null';
		}
		
		if (typeof username === 'string') {
			query += ((query!=='')?' AND ':'')+'`username` LIKE ?';
			values.push(username);
		} else if (username !== null) {
			throw 'Expected username to be a string or null';
		}
		
		if (typeof realname === 'string') {
			query += ((query!=='')?' AND ':'')+'`realname` LIKE ?';
			values.push(realname);
		} else if (realname !== null) {
			throw 'Expected realname to be a string or null';
		}
		
		if (typeof title === 'string') {
			query += ((query!=='')?' AND ':'')+'`title` LIKE ?';
			values.push(title);
		} else if (title !== null) {
			throw 'Expected title to be a string or null';
		}
		
		if (typeof enabled === 'boolean') {
			query += ((query!=='')?' AND ':'')+'`enabled` = ?';
			values.push(enabled?1:0);
		} else if (enabled !== null) {
			throw 'Expected enabled to be a boolean or null';
		}
		
		if (query !== '') {
			query = ' WHERE '+query;
		}
		
		if (exactMatch) {
			query = query.replace('LIKE', '=');
		}
		
		let [records, fields] = await this._database.query('SELECT * FROM `'+this._table+'`'+query, values);
		
		let objects = [];
		for (let i = 0; i<records.length; i++) {
			objects.push(this._convertRecordToUser(records[i]));
		}
		return Promise.all(objects);
	}
}

module.exports = UserController;
