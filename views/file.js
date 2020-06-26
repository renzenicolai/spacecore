'use strict';

const FileController = require('../controllers/file.js');

class FileView {
	constructor(database) {
		this._controller = new FileController(database);
	}
	
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
		return this._controller.findByName(name, mime);
	}
	
	async get(session, identifier) {
		let file = await this._controller.get(identifier);
		return file.serialize();
	}
	
	async put(session, params) {
		if (Array.isArray(params)) {
			// Array of file objects
			var operations = [];
			for (let i in params) {
				let currentFile = params.file[i];
				operations.push(this._controller.create(currentFile.name, currentFile.mime, currentFile.data));
			}
			var fileObjects = await Promise.all(operations);
			var result = [];
			for (let i = 0; i < fileObjects.length; i++) {
				result.push(this._controller.put(fileObjects[i]));
			}
			return result;
		} else {
			// Single file object
			let file = await this._controller.createFile(params.name, params.mime, params.data);
			let result = await this._controller.put(file);
			return result;
		}
	}
	
	async remove(session, params) {
		if (Array.isArray(params)) {
			var operations = [];
			for (var i in params) {
				operations.push(this._controller.remove(params[i]));
			}
			return Promise.all(operations);
		} else {
			try {
				return await this._controller.remove(params);
			} catch (e) {
				throw 'The file can not be removed because it is in use.';
			}
		}
	}
	
	/* RPC function definitions */

	registerRpcMethods(rpc, prefix='file') {
		if (prefix!=='') prefix = prefix + '/';
		
		/*
		 * List
		 * 
		 * Returns a list of files
		 *
		 */
		rpc.addMethod(
			prefix+'list',
			this.list.bind(this),
			[
				{
					name: 'filter',
					type: 'object',
					optional: {
						name: {
							type: 'string'
						},
						mime: {
							type: 'string'
						}
					},
					description: "Object optionally containing the string parameters 'name' (Filter on name of the file) and 'mime' (Filter on MIME type of the file)"
				},
				{
					name: 'name',
					type: 'string',
					description: "String containing the name used to filter on name of the file"
				}
			]
		);
		
		/*
		 * Get
		 * 
		 * Returns the file corresponding to the supplied file identifier
		 *
		 */
		rpc.addMethod(
			prefix+'get',
			this.get.bind(this),
			[
				{
					name: 'id',
					type: 'number',
					description: 'Identifier of the file'
				}
			]
		);
		
		/*
		 * Put
		 * 
		 * Creates a file entry in the database from the supplied file
		 * Returns the file identifier of the created entry
		 *
		 */
		rpc.addMethod(
			prefix+'put',
			this.put.bind(this),
			[
				{
					type: 'object',
					required: {
						mime: {
							type: 'string'
						},
						name: {
							type: 'string'
						},
						data: {
							type: 'string'
						}
					},
					description: 'File object'
				},
				{
					type: 'array',
					contains: {
						type: 'object',
						required: {
							mime: {
								type: 'string'
							},
							name: {
								type: 'string'
							},
							data: {
								type: 'string'
							}
						}
					},
					description: 'Array of file objects'
				}
			]
		);
		
		/*
		 * Remove
		 * 
		 * Destroys the record corresponding to the supplied file identifier
		 *
		 */
		rpc.addMethod(
			prefix+'remove',
			this.remove.bind(this),
			[
				{
					name: 'ids',
					type: 'array',
					contains: 'number',
					description: 'Array containing file identifiers'
				},
				{
					name: 'id',
					type: 'number',
					description: 'Identifier of the file'
				}
			]
		);
	}
}

module.exports = FileView;
