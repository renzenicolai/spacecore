'use strict';

const Record = require('../../record.js');
const BasicHelper = require("../../helpers/basicHelper.js");

class BankaccountRecord extends Record {
	/*
	 * A bankaccount of a relation
	 */
	
	constructor(input=null) {
		super(input);
		
		// Data storage
		this._data.holder = '';
		this._data.iban = '';
		this._data.bic = '';
		
		// Helper functions
		this.getHolder = BasicHelper.get.bind(this, 'holder', 'string');
		this.setHolder = BasicHelper.set.bind(this, 'holder', 'string');
		this.getIBAN = BasicHelper.get.bind(this, 'iban', 'string');
		this.setIBAN = BasicHelper.set.bind(this, 'iban', 'string');
		this.getBIC = BasicHelper.get.bind(this, 'bic', 'string');
		this.setBIC = BasicHelper.set.bind(this, 'bic', 'string');

		if (input !== null) {
			this.setHolder(input.holder);
			this.setIBAN(input.iban);
			this.setBIC(input.bic);
		}
	}
	
	serialize(includeSecrets=false) {
		let result = Object.assign(
			super.serialize(includeSecrets),
			{
				holder: this.getHolder(),
				iban: this.getIBAN(),
				bic: this.getBIC()
			}
		);
		return result;
	}
}

module.exports = BankaccountRecord;
