'use strict';

const FileController = require('../controllers/files.js');

class Files {
	constructor(database) {
		this._controller = new FileController(database);
	}
	
	/* RPC functions */
	
	list(session, params) {
		let name = '%';
		let mime = null;
		if (typeof params === 'object') {
			if (typeof params.name === 'string') {
				name = params.name;
			}
			if (typeof params.mime === 'string') {
				name = params.mime;
			}
		} else if (typeof params === 'string') {
			name = params;
		}
		return this._controller.findFilesByName(name, mime);
	}
	
	async get(session, identifier) {
		let file = await this._controller.getFile(identifier);
		return file.serialize();
	}
	
	async add(session, params) {
		var operations = [];
		for (let i in params.file) {
			let currentFile = params.file[i];
			if (typeof currentFile !== 'object') {
				throw 'File parameter should be an object';
			}
			if (typeof currentFile.mime !== 'string') {
				throw 'MIME type missing';
			}
			if (typeof currentFile.name !== 'string') {
				throw 'Name missing';
			}
			if (typeof currentFile.data !== 'string') {
				throw 'Data should be base64 encoded string';
			}
			operations.push(this._controller.createFile(currentFile.name, currentFile.mime, currentFile.data));
		}
		var fileObjects = await Promise.all(operations);
		var result = [];
		for (let i = 0; i < fileObjects.length; i++) {
			result.push(this._controller.putFile(fileObjects[i]));
		}
		return result;
	}
	
	async remove(session, params) {
		if (Array.isArray(params)) {
			var operations = [];
			for (var i in params) {
				operations.push(this._controller.deleteFile(params[i]));
			}
			return Promise.all(operations);
		} else {
			try {
				return await this._controller.deleteFile(params);
			} catch (e) {
				throw 'The file can not be removed because it is in use.';
			}
		}
	}
	
	/* RPC function definitions */

	registerRpcMethods(rpc, prefix='file') {
		if (prefix!=='') prefix = prefix + '/';
		rpc.addMethod(
			prefix+'list',
			this.list.bind(this),
			[
				{
					type: 'object',
					optional: {
						name: {
							type: 'string'
						},
						mime: {
							type: 'string'
						}
					}
				},
				{
					type: 'string'
				}
			]
		);
		rpc.addMethod(
			prefix+'get',
			this.get.bind(this),
			[
				{
					type: 'number'
				}
			]
		);
		rpc.addMethod(
			prefix+'add',
			this.add.bind(this),
			[
				{
					type: 'object',
					required: {
						file: {
							type: 'array',
							contains: 'object'
						}
					}
				}
			]
		);
		rpc.addMethod(
			prefix+'remove',
			this.remove.bind(this),
			[
				{
					type: 'array',
					contains: 'number'
				},
				{
					type: 'number'
				}
			]
		);
	}
}

module.exports = Files;
