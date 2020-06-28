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
	
	async _getSubRecords(table, identifier, identifierColumn) {
		let [records, fields] = await this._database.query('SELECT * FROM `'+table+'` WHERE `'+identifierColumn+'` = ?', [identifier]);
		return records;
	}

	async _getArraySubRecords(table, identifier, identifierColumn, column) {
		let records = await this._getSubRecords(table, identifier, identifierColumn);
		let result = [];
		for (let i = 0; i < records.length; i++) {
			if (result.indexOf(records[i][column]) < 0) {
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
			if (oldRecords[i][column] === toRemove[i]) {
				queries.push(this._database.query('DELETE FROM `'+table+'` WHERE `id` = ?', [oldRecords[i].id], transaction));
			}
		}
		for (let i = 0; i < toCreate.length; i++) {
			queries.push(this._database.query('INSERT INTO `'+table+'` (`'+identifierColumn+'`,`'+column+'`) VALUES (?, ?);', [identifier, toCreate[i]], transaction));
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
