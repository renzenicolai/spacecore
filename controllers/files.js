const GenericFile = require('../models/genericFile.js');
const ImageFile = require('../models/imageFile.js');

class FileController {
	constructor(database, table='files') {
		this._fileTypes = [
			ImageFile,
			GenericFile
		];
		this._database = database;
		this._table = table;
	}
	
	_convertRecordToFileObject(record, dirty=false) {
		let file = null;
		for (let i = 0; i < this._fileTypes.length; i++) {
			if (this._fileTypes[i].prototype.allowedMimeTypes.lastIndexOf(record.mime)>=0) {
				record.data = record.file; // HACK database contains a 'file' column which should be renamed to 'data'
				file = new this._fileTypes[i](record);
				file.setDirty(dirty);
				break;
			}
		}
		if (file === null) {
			file = new GenericFile(record);
			file.setDirty(dirty);
		}
		return file;
	}
	
	/* Management of individual files */
	
	async createFile(name, mime, data) {
		let record = {
			name: name,
			mime: mime,
			data: data
		};
		return this._convertRecordToFileObject(record, true);
	}
	
	async createFileFromBase64(name, mime, data) {
		let record = {
			name: name,
			mime: mime,
			data: Buffer.from(data, 'base64')
		};
		return this._convertRecordToFileObject(record, true);
	}
	
	async getFile(identifier) {
		let [records, fields] = await this._database.query('SELECT * FROM `'+this._table+'` WHERE `id` = ?', [identifier]);
		let file = null;
		
		if (records.length === 1) {
			let record = records[0];
			file = this._convertRecordToFileObject(record);
		}
		return file;
	}
	
	async getFileAsBase64(identifier) {
		let record = await this.getFile(identifier);
		let result = null;
		if (record !== null) {
			result = record.getDataAsBase64();
		}
		return result;
	}
	
	async putFile(fileObject, transaction=null) {
		let result = null;
		if (fileObject instanceof GenericFile) {
			if (fileObject.getDirty()) {
				// The file object is dirty, flush it to the database
				if (fileObject.getIdentifier() === null) {
					// The file is not yet in the database
					let queryResult = await this._database.query('INSERT INTO `'+this._table+'` (`name`,`mime`,`file`) VALUES (?, ?, ?);', [fileObject.getName(), fileObject.getMime(), fileObject.getDataAsBuffer()], transaction);
					result = queryResult[0].insertId;
					fileObject.setIdentifier(result);
				} else {
					// The file is already in the database and needs to be updated
					await this._database.query('UPDATE `'+this._table+'` SET `name` = ?, `mime` = ?, `file` = ? WHERE `id` = ?;', [fileObject.getName(), fileObject.getMime(), fileObject.getDataAsBuffer(), fileObject.getIdentifier()], transaction);
					result = fileObject.getIdentifier();
				}
			} else {
				// The file object is not dirty, no need to save it to the database
				result = fileObject.getIdentifier();
			}
			fileObject.setDirty(false);
		} else {
			throw 'putFile called with an argument that is not a file object';
		}
		return result;
	}
	
	async deleteFile(input, transaction=null) {
		if (typeof input === 'number') {
			var identifier = identifier;
		} else if (input instanceof GenericFile) {
			// The file to be deleted is a file record
			var identifier = input.getIdentifier();
		} else {
			throw 'Invalid argument supplied to deleteFile, expected the identifier of a file (number) or a file object';
		}
		
		if (identifier !== null) {
			await this._database.query('DELETE FROM `'+this._table+'` WHERE `id` = ?', [identifier], transaction);
			if (input instanceof GenericFile) {
				input.setIdentifier(null);
				input.setDirty(true);
			}
			return true;
		} else {
			return false;
		}
	}
	
	/* Management of file storage in database */
	
	async findFilesByName(name='%', mime=null) {
		if (typeof name !== 'string') {
			throw 'Expected name to be a string';
		}
		if (typeof mime === 'string') {
			var [records, fields] = await this._database.query('SELECT `id`, `name`, `mime` FROM `'+this._table+'` WHERE `name` LIKE ? AND `mime` = ?;', [name, mime]);
		} else {
			var [records, fields] = await this._database.query('SELECT `id`, `name`, `mime` FROM `'+this._table+'` WHERE `name` LIKE ?;', [name]);
		}
		let result = [];
		for (let i = 0; i < records.length; i++) {
			result.push({
				id: records[i].id,
				name: records[i].name,
				mime: records[i].mime
			});
		}
		return result;
	}
}

module.exports = FileController;
