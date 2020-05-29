class Login {
	constructor( opts ) {
		this.name = 'login';
		
		opts = Object.assign({
			ui: null,
			app: null
		}, opts);
		
		this.ui = opts.ui;
		this.app = opts.app;
		
		this.reset();
	}
	
	reset() {
		this.state = {};
	}
	
	/* Menu */
	
	menu(menu='main') {
		return [];
	}
	
	/* Module */
	
	show(reset=true, part="login") {
		if (reset) this.reset();
		this.app.currentModule = this;
		this.app.showMessage("Authentication in progress...");
		this.app.executeCommand('user/authenticate', {user_name: 'candy'}, this._login.bind(this));
	}
	
	/* Internal functions */
	
	_login(res, err) {
		if (err !== null) {
			if ((typeof err === "object") && (typeof err.message === "string")) {
				this._login(err.message);
			} else {
				this._login("Could not login, server returned error.");
				console.log("loginResultHandler could not parse error as string, error is",err);
			}
			return;
		}
		this.app.currentModule = this.app.homeModule;
		this.app.executeCommand('session/state', null, this.app.handleRefresh);
	}
};
