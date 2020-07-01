'use strict';
const Controller = require('./controller.js');
const Relation = require('../models/record/relation.js');
const Bankaccount = require('../models/record/relation/bankaccount.js');
const Group = require('../models/record/relation/group.js');
const Token = require('../models/record/relation/token.js');
const FileController = require('./file.js');

class RelationController extends Controller {
	constructor(database) {
		super(database);
		this._database            = database;
		this._table               = 'relations';
		this._tableAddresses      = 'relation_addresses';
		this._tableEmailAddresses = 'relation_emailaddresses';
		this._tablePhonenumbers   = 'relation_phonenumbers';
		this._tableBankaccounts   = 'relation_bankaccounts';
		this._tableGroups         = 'relation_groups';
		this._tableGroupMappings  = 'relation_group_mappings';
		this._tableTokens         = 'relation_tokens';
		this._fileController      = new FileController(database);
	}

	async _convertRecordToRelation(record) {
		if (record.picture !== null) {
			record.picture = await this._fileController.get(record.picture);
		}
		record.addresses      = await this._getSubRecords(this._tableAddresses, record.id, 'relation', 'address');
		record.emailaddresses = await this._getSubRecords(this._tableEmailAddresses, record.id, 'relation', 'address');
		record.phonenumbers   = await this._getSubRecords(this._tablePhonenumbers, record.id, 'relation', 'phonenumber');
		record.bankaccounts   = await this._getSubRecords(this._tableBankaccounts, record.id, 'relation');
		record.tokens         = await this._getSubRecords(this._tableTokens, record.id, 'relation');
		let groupMappings     = await this._getSubRecords(this._tableGroupMappings, record.id, 'relation');
		record.groups         = [];
		for (let i = 0; i < groupMappings.length; i++) {
			let group = await this.getGroup(groupMappings[i].group);
			record.groups.push(group);
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

	async _putBankaccount(object, relationIdentifier, parentTransaction=null) {
		let result = null;
		if (object instanceof Bankaccount) {
			let transaction = parentTransaction;
			if (parentTransaction === null) {
				transaction = await this._database.transaction('Put bankaccount '+object.getIBAN());
			}
			try {
				if (object.getDirty()) {
					if (object.getIdentifier() === null) {
						let queryResult = await this._database.query(
							'INSERT INTO `'+this._tableBankaccounts+'` (`holder`,`iban`, `bic`, `relation`) VALUES (?, ?, ?, ?);', [
							object.getHolder(),
							object.getIBAN(),
							object.getBIC(),
							relationIdentifier
						], transaction);
						result = queryResult[0].insertId;
						object.setIdentifier(result);
					} else {
						await this._database.query(
							'UPDATE `'+this._table+'` SET `holder` = ?, `iban` = ?, `bic` = ? WHERE `id` = ?;', [
							object.getHolder(),
							object.getIBAN(),
							object.getBIC(),
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
			throw 'put called with an argument that is not a bankaccount object';
		}
		return result;
	}

	async _putToken(object, relationIdentifier, parentTransaction=null) {
		let result = null;
		if (object instanceof Token) {
			let transaction = parentTransaction;
			if (parentTransaction === null) {
				transaction = await this._database.transaction('Put token '+object.getIBAN());
			}
			try {
				if (object.getDirty()) {
					if (object.getIdentifier() === null) {
						let queryResult = await this._database.query(
							'INSERT INTO `'+this._tableTokens+'` (`type`,`public`, `private`, `enabled`, `relation`) VALUES (?, ?, ?, ?, ?);', [
							object.getType(),
							object.getPublic(),
							object.getPrivate(),
							object.getEnabled()?1:0,
							relationIdentifier
						], transaction);
						result = queryResult[0].insertId;
						object.setIdentifier(result);
					} else {
						await this._database.query(
							'UPDATE `'+this._table+'` SET `type` = ?, `public` = ?, `private` = ?, `enabled` = ? WHERE `id` = ?;', [
							object.getType(),
							object.getPublic(),
							object.getPrivate(),
							object.getEnabled()?1:0,
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
			throw 'put called with an argument that is not a token object';
		}
		return result;
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
				let subPromises = [];
				subPromises.push(this._putArraySubRecords(this._tableAddresses, object.getIdentifier(), 'relation', 'address', object.getAddresses(), transaction));
				subPromises.push(this._putArraySubRecords(this._tableEmailAddresses, object.getIdentifier(), 'relation', 'address', object.getEmailaddresses(), transaction));
				subPromises.push(this._putArraySubRecords(this._tablePhonenumbers, object.getIdentifier(), 'relation', 'phonenumber', object.getPhonenumbers(), transaction));
				subPromises.push(this._putObjectSubRecords(this._tableBankaccounts, object.getIdentifier(), 'relation', this._putBankaccount.bind(this), object.getBankaccounts(), transaction));
				subPromises.push(this._putObjectSubRecords(this._tableTokens, object.getIdentifier(), 'relation', this._putToken.bind(this), object.getTokens(), transaction));
				
				let groups = object.getGroups();
				let groupPromises = [];
				for (let i = 0; i < groups.length; i++) {
					groupPromises.push(this.putGroup(groups[i], transaction));
				}
				let groupIdentifiers = await Promise.all(groupPromises);
				subPromises.push(this._putArraySubRecords(this._tableGroupMappings, object.getIdentifier(), 'relation', 'group', groupIdentifiers, transaction));
				await Promise.all(subPromises);
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
	
	async remove(input, parentTransaction=null) {
		if (typeof input === 'number') {
			var identifier = input;
			var object = await this.get(identifier);
		} else if (input instanceof Relation) {
			var identifier = input.getIdentifier();
			var object = input;
		} else {
			throw 'Invalid argument supplied, expected the identifier of a relation (number) or a relation object';
		}
		if ((identifier === null) || (object === null)) {
			return false;
		}
		let transaction = parentTransaction;
		if (parentTransaction === null) {
			transaction = await this._database.transaction('Remove relation '+object.getNickname());
		}
		try {
			let operations = [];
			operations.push(this._database.query(
				'DELETE FROM `'+this._tableAddresses+'` WHERE `relation` = ?', [
				identifier
			], transaction));
			operations.push(this._database.query(
				'DELETE FROM `'+this._tableBankaccounts+'` WHERE `relation` = ?', [
				identifier
			], transaction));
			operations.push(this._database.query(
				'DELETE FROM `'+this._tableEmailAddresses+'` WHERE `relation` = ?', [
				identifier
			], transaction));
			operations.push(this._database.query(
				'DELETE FROM `'+this._tableGroupMappings+'` WHERE `relation` = ?', [
				identifier
			], transaction));
			operations.push(this._database.query(
				'DELETE FROM `'+this._tablePhonenumbers+'` WHERE `relation` = ?', [
				identifier
			], transaction));
			operations.push(this._database.query(
				'DELETE FROM `'+this._tableTokens+'` WHERE `relation` = ?', [
				identifier
			], transaction));
			await Promise.all(operations);
			await this._database.query(
				'DELETE FROM `'+this._table+'` WHERE `id` = ?', [
				identifier
			], transaction);
			let picture = object.getPicture();
			if (picture !== null) {
				await this._fileController.remove(picture, transaction);
			}
			object.setIdentifier(null);
		} catch (error) {
			transaction.rollback();
			throw error;
		}
		if (parentTransaction === null) {
			await transaction.commit();
		}
		return true;
	}
	
	async find(identifier = null, nickname = null, realname = null, token = null, tokenType = null, exactMatch=false) {
		let query = '';
		let values = [];
		
		if (typeof identifier === 'number') {
			query += ((query!=='')?' AND ':'')+'`id` = ?';
			values.push(identifier);
		} else if (identifier !== null) {
			throw 'Expected identifier to be a number or null';
		}
		
		if (typeof nickname === 'string') {
			query += ((query!=='')?' AND ':'')+'`nickname` LIKE ?';
			values.push(nickname);
		} else if (nickname !== null) {
			throw 'Expected nickname to be a string or null';
		}
		
		if (typeof realname === 'string') {
			query += ((query!=='')?' AND ':'')+'`realname` LIKE ?';
			values.push(realname);
		} else if (realname !== null) {
			throw 'Expected realname to be a string or null';
		}
		
		if (typeof token === 'string') {
			let tokens = this.listTokens(token, tokenType, true);
			if (tokens.length < 1) {
				return []; // If we can't find a matching token then there are no results
			}
			let placeholders = '';
			for (let i = 0; i < tokens.length; i++) {
				placeholders += '?';
				if (i < tokens.length-1) placeholders += ', ';
				values.push(tokens[i].getIdentifier());
			}
			query += ((query!=='')?' AND ':'')+'`id` IN ('+placeholders+')';
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
			objects.push(this._convertRecordToRelation(records[i]));
		}
		return Promise.all(objects);
	}
	
	async findTokens(publicKey=null, type=null, exactMatch = false) {
		let query = '';
		let values = [];
		
		if (typeof publicKey === 'string') {
			query += ((query!=='')?' AND ':'')+'`public` LIKE ?';
			values.push(publicKey);
		} else if (publicKey !== null) {
			throw 'Expected publicKey to be a string or null';
		}
		
		if (typeof type === 'string') {
			query += ((query!=='')?' AND ':'')+'`type` LIKE ?';
			values.push(type);
		} else if (type !== null) {
			throw 'Expected type to be a string or null';
		}
		
		if (query !== '') {
			query = ' WHERE '+query;
		}
		
		if (exactMatch) {
			query = query.replace('LIKE', '=');
		}
		
		let [records, fields] = await this._database.query('SELECT * FROM `'+this._tableTokens+'`'+query, values);
		
		let objects = [];
		for (let i = 0; i<records.length; i++) {
			objects.push(new Token(records[i]));
		}
		
		return Promise.all(objects);
	}

	/* Groups */

	async _convertRecordToGroup(record) {
		if (record.picture !== null) {
			record.picture = await this._fileController.get(record.picture);
		}
		let object = new Group(record);
		object.setDirty(false);
		return object;
	}

	async getGroup(identifier) {
		let [records, fields] = await this._database.query('SELECT * FROM `'+this._tableGroups+'` WHERE `id` = ?', [identifier]);
		let object = null;
		if (records.length === 1) {
			object = await this._convertRecordToGroup(records[0]);
		}
		return object;
	}

	async putGroup(object, parentTransaction=null) {
		let result = null;
		if (object instanceof Group) {
			let transaction = parentTransaction;
			if (parentTransaction === null) {
				transaction = await this._database.transaction('Put relation group '+object.getName());
			}
			try {
				let picture = object.getPicture();
				let pictureIdentifier = picture ? await this._fileController.put(picture, transaction) : null;
				if (object.getDirty()) {
					if (object.getIdentifier() === null) {
						let queryResult = await this._database.query(
							'INSERT INTO `'+this._tableGroups+'` (`name`,`description`, `addtonew`, `picture`) VALUES (?, ?, ?, ?);', [
							object.getName(),
							object.getDescription(),
							object.getAddtonew() ? 1 : 0,
							pictureIdentifier
						], transaction);
						result = queryResult[0].insertId;
						object.setIdentifier(result);
					} else {
						await this._database.query(
							'UPDATE `'+this._tableGroups+'` SET `name` = ?, `description` = ?, `addtonew` = ?, `picture` = ? WHERE `id` = ?;', [
							object.getName(),
							object.getDescription(),
							object.getAddtonew() ? 1 : 0,
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
			throw 'putGroup called with an argument that is not a relation group object';
		}
		return result;
	}

	async removeGroup(input, parentTransaction=null) {
		if (typeof input === 'number') {
			var identifier = input;
			var object = await this.getGroup(identifier);
		} else if (input instanceof Group) {
			var identifier = input.getIdentifier();
			var object = input;
		} else {
			throw 'Invalid argument supplied, expected the identifier of a relation group (number) or a relation group object';
		}
		if ((identifier === null) || (object === null)) {
			return false;
		}
		let transaction = parentTransaction;
		if (parentTransaction === null) {
			transaction = await this._database.transaction('Remove relation group '+object.getName());
		}
		try {
			await this._database.query(
				'DELETE FROM `'+this._tableGroupMappings+'` WHERE `group` = ?', [
				identifier
			], transaction);
			await this._database.query(
				'DELETE FROM `'+this._tableGroups+'` WHERE `id` = ?', [
				identifier
			], transaction);
			let picture = object.getPicture();
			if (picture !== null) {
				await this._fileController.remove(picture, transaction);
			}
			object.setIdentifier(null);
		} catch (error) {
			transaction.rollback();
			throw error;
		}
		if (parentTransaction === null) {
			await transaction.commit();
		}
		return true;
	}

	async findGroup(identifier = null, name = null, description = null, addtonew = null, exactMatch = false) {
		let query = '';
		let values = [];
		
		if (typeof identifier === 'number') {
			query += ((query!=='')?' AND ':'')+'`id` = ?';
			values.push(identifier);
		} else if (identifier !== null) {
			throw 'Expected identifier to be a number or null';
		}
		
		if (typeof name === 'string') {
			query += ((query!=='')?' AND ':'')+'`name` LIKE ?';
			values.push(name);
		} else if (name !== null) {
			throw 'Expected name to be a string or null';
		}

		if (typeof description === 'string') {
			query += ((query!=='')?' AND ':'')+'`description` LIKE ?';
			values.push(description);
		} else if (description !== null) {
			throw 'Expected description to be a string or null';
		}
		
		if (typeof addtonew === 'boolean') {
			query += ((query!=='')?' AND ':'')+'`addtonew` LIKE ?';
			values.push(addtonew);
		} else if (addtonew !== null) {
			throw 'Expected addtonew to be a boolean or null';
		}
		
		if (query !== '') query = ' WHERE '+query;
		
		if (exactMatch) {
			query = query.replace('LIKE', '=');
		}
		
		let [records, fields] = await this._database.query('SELECT * FROM `'+this._tableGroups+'`'+query, values);
		
		let objects = [];
		for (let i = 0; i<records.length; i++) {
			objects.push(this._convertRecordToGroup(records[i]));
		}
		return Promise.all(objects);
	}
}

module.exports = RelationController;
