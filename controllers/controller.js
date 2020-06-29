'use strict';

class Controller {
	constructor() {
		
	}
	
	_compareArrays(old, current) {
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
	
	async _getSubRecords(table, identifier, identifierColumn, column=null) {
		let [records, fields] = await this._database.query('SELECT * FROM `'+table+'` WHERE `'+identifierColumn+'` = ?', [identifier]);
		let result = records;
		if (typeof column === 'string') {
			result = [];
			for (let i = 0; i < records.length; i++) {
				result.push(records[i][column]);
			}
		}
		return result;
	}

	async _putArraySubRecords(table, identifier, identifierColumn, column, current, transaction) {
		let oldRecords = await this._getSubRecords(table, identifier, identifierColumn);
		let old = [];
		for (let i = 0; i < oldRecords.length; i++) old.push(oldRecords[i][column]);
		let [toRemove, toCreate] = this._compareArrays(old, current);
		let queries = [];
		for (let i = 0; i < oldRecords.length; i++) {
			if (toRemove.indexOf(oldRecords[i][column]) >= 0) {
				queries.push(this._database.query('DELETE FROM `'+table+'` WHERE `id` = ?', [oldRecords[i].id], transaction));
			}
		}
		for (let i = 0; i < toCreate.length; i++) {
			queries.push(this._database.query('INSERT INTO `'+table+'` (`'+identifierColumn+'`,`'+column+'`) VALUES (?, ?);', [identifier, toCreate[i]], transaction));
		}
		await Promise.all(queries);
	}

	async _putObjectSubRecords(table, identifier, identifierColumn, put, current, transaction) {
		let oldRecords = await this._getSubRecords(table, identifier, identifierColumn);
		let oldIdentifiers = [];
		for (let i = 0; i < oldRecords.length; i++) oldIdentifiers.push(oldIdentifiers[i].id);
		let newIdentifiers = [];
		for (let i = 0; i < current.length; i++) {
			let identifier = current[i].getIdentifier();
			if (identifier !== null) {
				newIdentifiers.push(identifier);
			}
		};
		let [toRemove, toCreate] = this._compareArrays(oldIdentifiers, newIdentifiers);
		let queries = [];
		for (let i = 0; i < oldRecords.length; i++) {
			if (toRemove.indexOf(oldRecords[i].id) >= 0) {
				queries.push(this._database.query('DELETE FROM `'+table+'` WHERE `id` = ?', [oldRecords[i].id], transaction));
			}
		}
		for (let i = 0; i < current.length; i++) {
			queries.push(put(current[i], identifier, transaction));
		}
		await Promise.all(queries);
	}
	
	async get(identifier) {
		throw 'Not implemented';
	}
	
	async put(object) {
		throw 'Not implemented';
	}
	
	async remove(object) {
		throw 'Not implemented';
	}
	
	async find(identifier) {
		throw 'Not implemented';
	}
}

module.exports = Controller;
