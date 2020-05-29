class BalanceVerification {
	constructor(opts) {
		this._opts = Object.assign({
			persons: null,
			transactions: null
		}, opts);
		if (this._opts.persons === null) {
			console.log("Balance verification can not be executed without the persons module!");
			process.exit(1);
		}
		if (this._opts.transactions === null) {
			console.log("Balance verification can not be executed without the transactions module!");
			process.exit(1);
		}
	}
	
	async verify() {
		var failed = false;
		var persons = await this._opts.persons.select();
		for (var i in persons) {
			var transactions = await this._opts.transactions.select({person_id: persons[i].getIndex()});
			var transactionBalance = 0;
			for (var j in transactions) {
				transactionBalance -= transactions[j].getField("total");
			}
			if (persons[i].getField("balance") != transactionBalance) {
				console.log("Balance verification failed for "+persons[i].getField("nick_name")+": balance is "+persons[i].getField("balance")+" and transaction total is "+transactionBalance);
				failed = true;
			}
		}
		
		if (failed) {
			console.log("Balance audit failed. Application will now terminate!");
			process.exit(1);
		}
		
	}
}

module.exports = BalanceVerification;
