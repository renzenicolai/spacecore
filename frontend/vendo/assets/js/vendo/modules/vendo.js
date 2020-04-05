class Vendo {
	constructor( opts ) {
		this.name = 'vendo';
		
		opts = Object.assign({
			ui: null,
			app: null
		}, opts);
		
		this.ui = opts.ui;
		this.app = opts.app;
		
		this.reset();
		
		this.numberOfStates = 8;
		
		this.hwState = [];
		for (var i = 0; i < this.numberOfStates; i++) this.hwState.push('unknown');
		
		this.selectedProduct = null;
		this.currentTimeout = null;
		this.inTransaction = false;
		this.nudgeCount = 0;
		this.nudgeSlot = 0;
	}
	
	reset() {
		this.selectedProduct = null;
		console.log("--- RESET ---");
	}
	
	/* Menu */
	
	menu(menu) {
		var items = [];
		
		if ((menu === "main") || (menu === "user")) {
			items.push({
				label: "Dashboard",
				fe_icon: "home",
				action: "javascript:application.action('"+this.name+"');"
			});
		}
		return items;
	}
		
	show(reset=true) {
		if (reset) this.reset();
		this.app.currentModule = this;
		this.app.pushSubscribe('pos/vendo/state', this._onState.bind(this));
		this.app.pushSubscribe('pos/vendo/debug', this._onDebug.bind(this));
		this.app.pushSubscribe('pos/vendo/token/person', this._onPerson.bind(this));
		this.displayProducts();
	}

	evaluateState(reset=false, device=-1) {
		this.cancelTimeout();
		var busy = false;
		var busyIn = -1;
		var error = false;
		var errorIn = -1;
		for (var i = 0; i < this.numberOfStates-1; i++) {
			console.log("EVAL STATE", i, this.hwState[i]);
			if (this.hwState[i] === 'error') { error = true; errorIn = i; console.log("ERROR!!");}
			if (this.hwState[i] === 'busy')  { busy = true; busyIn = i; console.log("BUSY!!");}
		}
		var ibutton = false;
		if (this.hwState[this.numberOfStates-1] === 'busy') ibutton = true;
		if (error) {
			this.app.showMessage("Sorry, this device is out of service due to a hardware error. (D"+errorIn+")", "Hardware error");
			this.setLed(false,false,false);
		} else if (busy) {
			this.displayBusy("Vending in progress...");
			this.setLed(false,false,false);
		} else if (ibutton) {
			//this.app.showMessage("", "Remove iButton");
		} else {
			//console.log("--- IDLE ---");
			if (device!==this.numberOfStates-1) {
				if (reset) this.selectedProduct = null;
				if (this.selectedProduct === null) {
					this.displayProducts();
				} else {
					this.app.showMessage("Product selected while in state evaluation function. Tell this to Renze.", "Fatal error");
					console.log("Product selected while in evaluateState!");
				}
			} else {
				if ((!ibutton) && (!this.inTransaction)) this.timeout(2000, "evaluateStateNoIbutton");
			}
		}
	}
	
	cancelTimeout() {
		if (this.currentTimeout !== null) {
			console.log("Timeout cleared!");
			clearTimeout(this.currentTimeout);
		}
	}
	
	displayProducts() {
		if (this.inTransaction) return this.app.showMessage("Invalid state reached in displayProducts, tell this to Renze please.", "Fatal error");
		this.selectedProduct = null;
		this.cancelTimeout();
		this.app.showMessage("Fetching list of products...");
		this.app.executeCommand("product/location/list", "vendo", this._handleProducts.bind(this));
		this.setLed(false,true,false);
	}
	
	setLed(r=false,g=false,f=false) {
		console.log("LED", r,g,f);
		this.app.executeCommand('pos/led', {device: "vendo", red: r, green: g, fade: f});
	}
	
	displayBusy(reason="") {
		this.app.showMessage(reason, "Please wait...");
	}
		
	_onState(message) {
		this.hwState[message.id] = message.state;
		console.log("STATE", message.id, message.state);
		this.evaluateState(false, message.id);
	}
	
	_onDebug(message) {
		console.log("DEBUG!! ", message);
	}
	
	displayUnassigned() {
		this.app.showMessage("The iButton you presented has not yet been assigned to a person.", "Not assigned");
		this.timeout(2000, "displayUnassigned");
	}
	
	timeout(after, source="unknown") {
		this.cancelTimeout();
		console.log("Timeout set (by "+source+")!");
		this.currentTimeout = setTimeout(this.evaluateState.bind(this, true), after);
	}
	
	executeTransaction(person) {
		if (this.selectedProduct === null) return this.showMessage("Transaction function called without selected product. Please tell Renze this happened!", "Fatal error!");
		this.app.showMessage("Executing transaction...");
		this.inTransaction = true;
		
		var product = this.selectedProduct.product;
		
		console.log("Person", person);
		
		var trx = {person_id: person.id, products: [{id: product.id, amount: 1}]};
		
		this.app.executeCommand('transaction/execute', trx, this._handleTransactionResult.bind(this));
	}
	
	genericErrorHandler(err) {
		var message = "Unknown error!";
		
		if ((typeof err === 'object') && (typeof err.message === 'string')) {
			message = err.message;
		} else if (typeof err === 'string') {
			message = err;
		} else {
			console.log("Invalid argument supplied to error handler", err);
		}
		
		this.app.showMessage(message, "Fatal error");
	}
	
	_handleTransactionResult(res, err) {
		if (err) return this.genericErrorHandler(err);
		this.inTransaction = false;
		console.log("--- TRANSACTION RESULT ---");
		console.log(res);
		console.log("--- VENDING ---");
		this.nudgeCount = 3;
		this.nudgeSlot = this.selectedProduct.slot;
		this.app.showMessage("Starting the vending process...");
		this.app.executeCommand('pos/vend', {device: "vendo", slot: this.selectedProduct.slot});
		this.reset();
	}
	
	_onPerson(person) {
		console.log("PERSON!! ",person);
		if (person.err) return this.genericErrorHandler(person.err);
		//if (!person.res) return this.genericErrorHandler("No person in onPerson!");
		if (!person.res) return this.displayUnassigned();
		person = person.res;
		this.cancelTimeout();
		this.setLed(false,false,false);
		if (this.selectedProduct !== null) {
			this.executeTransaction(person);
		} else {
			var name = person.nick_name;
			if (person.first_name.length > 0) {
				name = person.first_name;
				if (person.last_name.length > 0) {
					name += " "+person.last_name;
				}
			} else {
				if (person.last_name.length > 0) {
					name += person.last_name;
				}
			}
			var details = [];
			details.push("Balance: € "+(person.balance/100).toFixed(2));
			this.app.showMessage(details, "Account details for "+name);
		}
	}
	
	subToSlot(sub) {
		if (typeof sub !== 'number') return -1;
		if (sub === 11) return 0;
		if (sub === 12) return 1;
		if (sub === 13) return 2;
		if (sub === 14) return 3;
		if (sub === 15) return 4;
		return -1;
	}
	
	selectProduct(product, slot) {
		this.app.showMessage("Selected "+product+" in slot "+slot);
		this.app.executeCommand('product/list', {id: product}, this._handleSelectProduct.bind(this, slot));
	}
	
	_handleSelectProduct(slot=-1, res, err) {
		if (err !== null) return this.genericErrorHandler(err);
		if (res.length !== 1) return this.displayProducts();
		var product =  res[0];
		
		var price = "Unknown";
		if (product.prices.length === 1) price = "€ "+(product.prices[0].amount/100).toFixed(2);
		if (product.prices.length > 1) price = "Multiple";
		
		this.selectedProduct = {product: product, slot: slot};
		this.app.showMessage([
			"Present iButton to buy product!",
			product.name,
			price
		]);
		this.setLed(true,false,false);
		this.timeout(5000, "_handleSelectProduct");
	}

	nudge() {
		if (this.nudgeCount > 0) {
			this.app.executeCommand('pos/nudge', {device: "vendo", slot: this.nudgeSlot});
			this.nudgeCount = this.nudgeCount - 1;
		} else {
			this.app.showMessage("Zit je product nog steeds vast? Vraag dan een lid van het bestuur om hulp.");
			this.timeout(5000, "nudge");
		}
	}
	
	_handleProducts(res, err) {
		console.log(this.app);
		if (err !== null) {
			return this.app.genericErrorHandler(err);
		}
		console.log(res);
		
		var items = [];
		for (var i = 0;  i < 30; i++) items.push({title:"Empty "+i, big: false});
		for (var i = 0;  i < res.length; i++) {
			var slot = this.subToSlot(res[i].sub);
			if (slot < 0) continue; //Not in this device
			if (res[i].products.length > 1) {
				return this.app.genericErrorHandler("Multiple products assigned to slot "+slot+"!");
			}
			if (res[i].products.length === 1) {
				var product = res[i].products[0];
				var price = null;
				if (product.prices.length === 1) price = "€ "+(product.prices[0].amount/100).toFixed(2);
				if (product.prices.length > 1) price = "Multiple";
				items[i].title = product.name;
				items[i].image = product.picture;
				items[i].action = "javascript:application.currentModule.selectProduct("+product.id+", "+res[i].sub+");";
				items[i].price = price;
			}
			if (res[i].products.length > 1) {
				console.log("Multiple products assigned to "+slot);
			}
		}

		//if (this.nudgeCount >= 0) items.push({
		//	title: "Help mijn product zit vast!",
		//	action: "javascript:application.currentModule.nudge()"
		//});
		
		this.ui.showTemplate("products", {
			items: items
		});
	}
};
