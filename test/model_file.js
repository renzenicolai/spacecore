'use strict';

const expect = require('chai').expect;
const FileRecord = require('../models/record/file.js');

describe('Model: file', () => {
	it('Deserialize', async () => {
		let file = new FileRecord({
			name: "testName",
			mime: "testMime",
			data: 'SGVsbG8gd29ybGQ='
		});
		expect(file.getName()).to.equal('testName');
		expect(file.getMime()).to.equal('testMime');
		expect(file.getDataAsBase64()).to.equal('SGVsbG8gd29ybGQ=');
	});

	it('Serialize', async () => {
		let file = new FileRecord({
			name: "testName",
			mime: "testMime",
			data: 'SGVsbG8gd29ybGQ='
		});
		let serializedFile = file.serialize();
		expect(serializedFile).to.have.property('name');
		expect(serializedFile).to.have.property('mime');
		expect(serializedFile).to.have.property('data');
		expect(serializedFile.name).to.equal('testName');
		expect(serializedFile.mime).to.equal('testMime');
		expect(serializedFile.data).to.equal('SGVsbG8gd29ybGQ=');
	});

	it('Name', async () => {
		let file = new FileRecord({
			name: "testName",
			mime: "testMime",
			data: 'SGVsbG8gd29ybGQ='
		});
		file.setDirty(false);
		file.setName('Hello');
		expect(file.getDirty()).to.equal(true);
	});

	it('Mime type', async () => {
		let file = new FileRecord({
			name: "testName",
			mime: "testMime",
			data: 'SGVsbG8gd29ybGQ='
		});
		file.setDirty(false);
		file.setMime('hello/world');
		expect(file.getDirty()).to.equal(true);
	});

	it('Data', async () => {
		let file = new FileRecord({
			name: "testName",
			mime: "testMime",
			data: 'SGVsbG8gd29ybGQ='
		});
		file.setDirty(false);
		file.setData('Y2hhbmdlZA==');
		expect(file.getDirty()).to.equal(true);
	});
});


