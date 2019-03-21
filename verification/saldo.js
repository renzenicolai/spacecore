class SaldoVerification {
	constructor(opts) {
		this._opts = Object.assign({
			persons: null,
			transactions: null
		}, opts);
		if (this._opts.persons === null) {
			console.log("Saldo verification can not be executed without the persons module!");
			process.exit(1);
		}
		if (this._opts.transactions === null) {
			console.log("Saldo verification can not be executed without the transactions module!");
			process.exit(1);
		}
	}
	
	async verify() {
		var failed = false;
		var persons = await this._opts.persons.select();
		for (var i in persons) {
			var transactions = await this._opts.transactions.select({person_id: persons[i].getIndex()});
			var transactionSaldo = 0;
			for (var j in transactions) {
				transactionSaldo += transactions[j].getField("total");
			}
			if (persons[i].getField("saldo") != transactionSaldo) {
				console.log("Saldo verification failed for "+persons[i].getField("nick_name")+": saldo is "+persons[i].getField("saldo")+" and transaction total is "+transactionSaldo);
				failed = true;
			}
		}
		
		if (failed) {
			console.log("Saldo audit failed. Application will now terminate!");
			process.exit(1);
		}
		
	}
}

module.exports = SaldoVerification;
