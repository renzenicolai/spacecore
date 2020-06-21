'use strict';

class Mt940 {
	constructor(opts={}) {
		//Nothing to do.
	}
	
	_convertDate(date) {
		if (typeof date !== 'string') throw "expected date to be a string";
		if (date.length !== 6) throw "expected date to be 6 characters long";
		var year = Number(date.slice(0,2))+2000;
		var month = Number(date.slice(2,4));
		var day = Number(date.slice(4,6));
		return day+"-"+month+"-"+year;
	}
	
	_SwiftMessageParser(input) {
		var parts = input.split('\n:');
		
		var check940 = parts[0].split('\n');
		if (check940[1] !== '940') {
			throw "Invalid swift message (1).";
		}
		
		if (check940[0] !== check940[2]) {
			throw "Invalid swift message (2).";
		}
		
		var bank = check940[0];
		
		//ABNANL2A for ABN-AMRO
		//BUNQNL2A for BUNQ
		
		var message = {};
		message.bank = bank;
		message.transactions = [];
		var numTransactions = 0;
		
		var trxBefore = 0;
		var trxAfter = 0;
		var trxTotalAmount = 0;
		
		for (var i = 1; i < parts.length; i++) {
			var part = parts[i].split(":");
			var code = part.shift();
			var data = part.join(":");
			
			if (code === '20') {
				//Transaction Reference Number (TRN)
				message.trn = data;
			} else if (code === '21') {
				//Ref to related mess/trans
				message.ref = data;
			} else if (code === '25') {
				//Account number
				data = data.split(' ');
				message.account = data[0];
				if (data.length > 1) message.currency = data[1];
			} else if ((code === '28') || (code === '28C')) {
				//Statement number
				message.statement = data;
			} else if ((code === '60F') || (code === '60M')) {
				//Opening balance
				message.opening = {};
				if (data[0] === 'C') {
					message.opening.credit = true;
				} else if (data[0] === 'D') {
					message.opening.credit = false;
				} else {
					console.log("Opening balance tag contains unknown transaction type", code, data);
					throw "Unknown transaction type in opening balance tag";
				}
				message.opening.date = this._convertDate(data.slice(1,7));
				message.opening.currency = data.slice(7,10);
				message.opening.amount = Math.round(Number(data.slice(10).replace(',','.'))*100);
				
				if (message.opening.credit) {
					trxBefore -= message.opening.amount;
				} else {
					trxBefore += message.opening.amount;
				}
			} else if ((code === '62F') || (code === '62M')) {
				//Booked funds
				message.booked = {};
				if (data[0] === 'C') {
					message.booked.credit = true;
				} else if (data[0] === 'D') {
					message.booked.credit = false;
				} else {
					console.log("Opening balance tag contains unknown transaction type", code, data);
					throw "Unknown transaction type in opening balance tag";
				}
				message.booked.date = this._convertDate(data.slice(1,7));
				message.booked.currency = data.slice(7,10);
				message.booked.amount = Math.round(Number(data.slice(10).replace(',','.'))*100);
				if (message.booked.credit) {
					trxAfter -= message.booked.amount;
				} else {
					trxAfter += message.booked.amount;
				}
			} else if ((code === '64F') || (code === '64M')) {
				//Available funds
				message.available = {};
				if (data[0] === 'C') {
					message.available.credit = true;
				} else if (data[0] === 'D') {
					message.available.credit = false;
				} else {
					console.log("Opening balance tag contains unknown transaction type", code, data);
					throw "Unknown transaction type in opening balance tag";
				}
				message.available.date = this._convertDate(data.slice(1,7));
				message.available.currency = data.slice(7,10);
				message.available.amount = Math.round(Number(data.slice(10).replace(',','.'))*100);
				if (message.available.credit) {
					trxAfter -= message.available.amount;
				} else {
					trxAfter += message.available.amount;
				}
			} else if ((code === '65F') || (code === '65M')) {
				//Forward available balance
				message.forward = {};
				if (data[0] === 'C') {
					message.forward.credit = true;
				} else if (data[0] === 'D') {
					message.forward.credit = false;
				} else {
					console.log("Opening balance tag contains unknown transaction type", code, data);
					throw "Unknown transaction type in opening balance tag";
				}
				message.forward.date = this._convertDate(data.slice(1,7));
				message.forward.currency = data.slice(7,10);
				message.forward.amount = Math.round(Number(data.slice(10).replace(',','.'))*100);
				if (message.forward.credit) {
					trxAfter -= message.forward.amount;
				} else {
					trxAfter += message.forward.amount;
				}
			} else if (code === '61') {
				//Statement line
				var statement = {};
				statement.date = this._convertDate(data.slice(0,6));
				var pos = 6;
				if ((data[6] !== 'C') && (data[6] !== 'D') && (data[6] !== 'R')) {
					//Entry date in statement
					statement.entryDate = data.slice(6,10);
					pos = 10;
				}
				if (data[pos] === 'C') {
					statement.credit = true;
					//statement['r'] = false;
					pos += 1;
					if (data[pos] === ' ') pos += 1;
				} else if (data[pos] === 'D') {
					statement.credit = false;
					//statement['r'] = false;
					pos += 1;
					if (data[pos] === ' ') pos += 1;
				} else if (data[pos] === 'R') {
					throw "(FOUND TRANSACTION TYPE WITH R, STOP AND CHECK)";
					/*//statement['r'] = true;
					pos += 1;
					if (data[pos] === 'C') {
						statement.credit = true;
					} else if (data[pos] === 'D') {
						statement.credit = false;
					} else {
						console.log('Invalid indication in statement (1)!',data);
						throw "Invalid indication in statement (1).";
					}
					pos += 1;*/
				} else {
					console.log('Invalid indication in statement (2)!',data);
					throw "Invalid indication in statement (2).";
				}
				
				if (isNaN(data[pos])) { //Optional 3rd pos. currency code
					statement.curr = data[pos];
					pos += 1;
				}
				
				//This is a guess...
				var leftovers = data.slice(pos).split('N');
				statement.amount = Number(leftovers.shift().replace(',','.'))*100;
				leftovers = 'N'+leftovers.join('N');
				statement.type = leftovers.slice(0,4);
				statement.ref= leftovers.slice(4);
				
				if (statement.credit) {
					trxTotalAmount -= statement.amount;
				} else {
					trxTotalAmount += statement.amount;
				}
				
				message.transactions[numTransactions] = {};
				message.transactions[numTransactions].statement = statement;
				numTransactions += 1;
			} else if (code === '86') {
				//Description for transaction
				if (numTransactions < 1) throw "Description in SEPA message before transaction";
				var fields = null;
				if (data.startsWith('/')) {
					
					//Workaround for / in NAME and/or REMI
					var wap1 = data.split("/NAME/");
					var wap2 = null;
					if (data.search("/REMI/") < 0) {
						wap2 = wap1[1].split("/EREF/");
						wap2[0] = wap2[0].replace("/","-");
						wap1[1] = wap2.join("/EREF/");
						data = wap1.join("/NAME/");
					} else {
						wap2 = wap1[1].split("/REMI/");
						wap2[0] = wap2[0].replace("/","-");
						wap1[1] = wap2.join("/REMI/");
						data = wap1.join("/NAME/");
					}
					
					if (data.search("/REMI/") >= 0) {
						wap1 = data.split('/REMI/');
						wap2 = wap1[1].split("/EREF/");
						wap2[0] = wap2[0].replace("/","-");
						wap1[1] = wap2.join("/EREF/");
						data = wap1.join("/REMI/");
					}
					
					if (data.search("/EREF/") >= 0) {
						wap1 = data.split('/EREF/');
						data = wap1[0]+"/EREF/"+wap1[1].replace("/","-");
					}
					
					fields = data.split('/');
					fields.shift(); //First field is empty
					
					if ((fields.length % 2) > 0) {
						console.log("UNEVEN FIELDS DESCRIPTION", data);
						throw "Uneven amount of fields in description with fields.";
					}
					var pairs = {};
					for (var p = 0; p < fields.length / 2; p++) {
						pairs[fields[p*2]] = fields[p*2+1];
					}
					
					if (typeof pairs.NAME === 'string') {
						if (pairs.NAME.startsWith('\n')) {
							var tmp = pairs.NAME.split('\n');
							tmp.shift();
							pairs.NAME = tmp.join('\n');
						}
						pairs.NAME = pairs.NAME.replace('\n',' ');
						while (pairs.NAME.search('  ') >= 0) {
							pairs.NAME = pairs.NAME.replace('  ', ' ');
						}
					}
					
					if (typeof pairs.REMI === 'string') {
						if (pairs.REMI.startsWith('\n')) {
							pairs.REMI = pairs.REMI.split('\n').shift().join('\n');
						}
						pairs.REMI = pairs.REMI.replace('\n',' ');
						while (pairs.REMI.search('  ') >= 0) {
							pairs.REMI = pairs.REMI.replace('  ', ' ');
						}
					}
					
					message.transactions[numTransactions-1].fields = pairs;
				} else {
					var info = data.split('\n');
					message.transactions[numTransactions-1].info = info;
					
					fields = {};
					
					//Try to fill out fields using the awefull ABN-AMRO formatted bullshit.

					console.log("DEBUG!!",info);
					
					if (info[0].search("IBAN: ") >= 0) {
						var tmpIban = info[0].split('IBAN: ');
						fields.IBAN = tmpIban[1];
						fields.TRTP = tmpIban[0].trim();
					}
					if (info[1].search("NAAM: ") >= 0) {
						var tmpName = info[1].split('NAAM: ');
						fields.NAME = tmpName[1];
						fields.BIC = tmpName[0].split('BIC: ').join('').trim();
					}
					if ((info.length>2)&&(info[2].search('OMSCHRIJVING: ') >= 0)) {
						fields.REMI = info[2].split('OMSCHRIJVING: ').join('').trim();
					}
					
					message.transactions[numTransactions-1].fields = fields;
				}
			} else {
				console.log("Unknown tag!!",code,"->",data);
				throw "Unknown tag in SEPA message";
			}
		}
		
		var trxDiff = trxAfter - trxBefore;
		
		if (trxDiff !== trxTotalAmount) {
			console.log("TRX DIFF", trxBefore, trxAfter, trxDiff, trxTotalAmount);
			throw "TRX DIFF";
		}
		
		return message;
	}
	
	async _Parser(file) {
		if (typeof file !== 'object') throw "Invalid file: should be object.";
		if (typeof file.name !== 'string') throw "Invalid file: name should be string.";
		if (typeof file.data !== 'string') throw "Invalid file: data should be string.";
		//if (file.mime !== "application/octet-stream") throw "Invalid MIME type";
		var mt940 = Buffer.from(file.data, 'base64').toString().split('\r').join('');
		var mt940lines = mt940.split('\n');
		
		var swiftMessageParserPromises = [];
		
		var swiftMessage = "";
		for (var i in mt940lines) {
			var line = mt940lines[i];
			if (line === '-') {
				swiftMessageParserPromises.push(this._SwiftMessageParser(swiftMessage));
				swiftMessage = "";
			} else {
				swiftMessage += line+"\n";
			}
		}
		
		return await Promise.all(swiftMessageParserPromises);
	}
	
	async parse(session, params) {
		if (typeof params !== 'object') throw "Invalid parameters: should be object.";
		if (typeof params.mt940 !== 'object') throw "Invalid parameters: mt940 should be object.";
		var parserPromises = [];
		for (var i in params.mt940) {
			parserPromises.push(this._Parser(params.mt940[i]));
		}
		return Promise.all(parserPromises);
	}
	
	registerRpcMethods(rpc, prefix="mt940") {
		if (prefix!=="") prefix = prefix + "/";
		rpc.addMethod(
			prefix+"parse",
			this.parse.bind(this),
			[
				{
					type: 'object',
					required: {
						mt940: {
							type: 'object'
						}
					}
				}
			]
		);
	}
}

module.exports = Mt940;
