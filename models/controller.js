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
	
	async _getSubRecords(identifier, table, field) {
		let [records, fields] = await this._database.query('SELECT * FROM `'+table+'` WHERE `'+field+'` = ?', [identifier]);
		return records;
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
