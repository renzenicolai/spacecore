class Products {
	constructor( opts ) {
		opts = Object.assign({
			name: 'products'
		}, opts);
		this.name = opts.name;
		this.reset(); //Initialize state
	}
		
	reset() {
		this.personGroupsReady = false;
		this.state = {
			products:        {lastSelected: null, lastData: null, searchText: "", searchId: 'products-search',                   tableId: 'table_products',         filterFields: ['name'],              render: this._renderProducts.bind(this)},
			groups:          {lastSelected: null, lastData: null, searchText: "", searchId: 'products-groups-search',            tableId: 'table_groups',           filterFields: ['name'],              render: this._renderGroups},
			identifiers:     {lastSelected: null, lastData: null, searchText: "", searchId: 'products-identifiers-search',       tableId: 'table_identifiers',      filterFields: ['name'],              render: this._renderIdentifiers},
			identifierTypes: {lastSelected: null, lastData: null, searchText: "", searchId: 'products-identifier-types-search',  tableId: 'table_identifier_types', filterFields: ['name', 'long_name'], render: this._renderIdentifierTypes},
			locations:       {lastSelected: null, lastData: null, searchText: "", searchId: 'products-locations-search',         tableId: 'table_locations',        filterFields: ['name'],              render: this._renderLocations},
			brands:          {lastSelected: null, lastData: null, searchText: "", searchId: 'products-brands-search',            tableId: 'table_brands',           filterFields: ['name'],              render: this._renderBrands},
			packages:        {lastSelected: null, lastData: null, searchText: "", searchId: 'products-packages-search',          tableId: 'table_packages',         filterFields: ['name'],              render: this._renderPackages},
			personGroups:    {lastData: null /* Other functionality for this data type is in the persons module. */},
		};
	}
	
	refresh() {
		spacecore.executeCommand('person/group/list',            {}, this._handleRefreshPersonGroups.bind(this));
		spacecore.executeCommand('product/group/list',           {}, this._handleRefreshGroups.bind(this));
		spacecore.executeCommand('product/identifier/type/list', {}, this._handleRefreshIdentifierTypes.bind(this));
		spacecore.executeCommand('product/location/list',        {}, this._handleRefreshLocations.bind(this));
		spacecore.executeCommand('product/brand/list',           {}, this._handleRefreshBrands.bind(this));
		spacecore.executeCommand('product/package/list',         {}, this._handleRefreshPackages.bind(this));
	}
		
	/* Menu */
	
	menu(menu='main') {
		var items = [];
		if (menu === 'main') {
			if (spacecore.checkPermission('product/list')) items.push({
				label: "Products",
				fe_icon: "shopping-bag",
				action: "javascript:spacecore.action('"+this.name+"', null, true);"
			});
		}
		return items;
	}
		
	/* Module */
	
	show(reset=true, part="products") {
		if (reset) this.reset();
		spacecore.currentModule = this;
		spacecore.history = [];
		window.location.href = "#";
		
		this.refresh();
		
		if (!this.personGroupsReady) {
			//This is needed to ensure availability of the extra data needed to print the product list
			spacecore.showLoadingCircle("Products");
			setTimeout(this.show.bind(this, false, part), 200);
			return;
		}
		
		switch(part) {
			case "products":        spacecore.executeCommand('product/list',                 {}, this._handleShowProducts.bind(this)); break;
			case "groups":          spacecore.executeCommand('product/group/list',           {}, this._handleShowGroups.bind(this)); break;
			case "identifierTypes": spacecore.executeCommand('product/identifier/type/list', {}, this._handleShowIdentifierTypes.bind(this)); break;
			case "locations":       spacecore.executeCommand('product/location/list',        {}, this._handleShowLocations.bind(this)); break;
			case "brands":          spacecore.executeCommand('product/brand/list',           {}, this._handleShowBrands.bind(this)); break;
			case "packages":        spacecore.executeCommand('product/package/list',         {}, this._handleShowPackages.bind(this)); break;
			//case "details":         spacecore.currentModule.showDetails(this.getCurrentProductId()()); break;
			default:                this.genericErrorHandler("Unhandled part in products module: '"+part+"'");
		}
	}
	
	_handleRefreshGroups(res, err) {
		if (err) return console.log("Refresh exception", err);
		this.state.groups.lastData = res;
	}
	
	_handleRefreshIdentifierTypes(res, err) {
		if (err) return console.log("Refresh exception", err);
		this.state.identifierTypes.lastData = res;
	}
	
	_handleRefreshLocations(res, err) {
		if (err) return console.log("Refresh exception", err);
		this.state.locations.lastData = res;
	}
	
	_handleRefreshBrands(res, err) {
		if (err) return console.log("Refresh exception", err);
		this.state.brands.lastData = res;
	}
	
	_handleRefreshPackages(res, err) {
		if (err) return console.log("Refresh exception", err);
		this.state.packages.lastData = res;
	}
	
	_handleRefreshPersonGroups(res, err) {
		if (err) return console.log("Refresh exception", err);
		this.state.personGroups.lastData = res;
		this.personGroupsReady = true;
	}
	
	/* Helper functions */
	genericErrorHandler(err, action="show()") {
		var message = "Unknown error!";

		if ((typeof err === 'object') && (typeof err.message === 'string')) {
			message = err.message;
		} else if (typeof err === 'string') {
			message = err;
		} else {
			console.log("Invalid argument supplied to error handler", err);
		}
		
		console.log("genericErrorHandler", err);

		spacecore.showMessage2(
			message,
			"Products",
			"Error",
			[
				{
					type: "button",
					value: "OK",
					action: "javascript:spacecore.currentModule."+action+";"
				}
			]
		);
	}
	
	getCurrentProductId() {
		return this.state.products.lastSelected.id;
	}
	
	submitForm(form, method) { spacecore.submitForm(this.submitFormHandler.bind(this, form, method), form, method); }

	submitFormHandler(form, method, res, err) {
		var action = "javascript:spacecore.currentModule.show();";
		var actionFunc = spacecore.currentModule.show;
		var skip = false;

		if (form==="removeproduct-form") {
			if (err === null) return this.show();
			action = "javascript:spacecore.currentModule.show();";
		}
		
		/*if (form==="createproduct-form") {
			if (err === null) return this.showDetails(res);
			action = "javascript:spacecore.currentModule.showDetails("+res+");";
		}*/

		if (
			(form==="addgrouptoproduct-form") ||
			(form==="removegroupfromproduct-form") ||
			(form==="editproduct-form") ||
			(form==="createproduct-form")
		) {
			if (err === null) return spacecore.handleBackButton();
			action = "javascript:spacecore.handleBackButton();";
		}

		if ((form==="group-form") || (form=="removegroup-form")) {
			if (err === null) return this.show(false, 'groups'); //Skip the result if succesfull
			action = "javascript:spacecore.currentModule.show(false, 'groups');";
		}

		if (err) {
			console.log("submitFormHandler error", err);
			var content = [ err.message ];
			if (typeof err.raw.message == "string") content.push(err.raw.message);
			spacecore.showMessage2(
				content, "Products", "Error",
				[{ type: "button", value: "OK", action: action }]
			);
		} else {
			spacecore.showMessage2(
				[ res ], "Products", "Result",
				[{ type: "button", value: "OK", action: action }]
			);
		}
	}
	
	findPersonGroup(id) {
		for (var i in this.state.personGroups.lastData) {
			var group = this.state.personGroups.lastData[i];
			console.log(group.id, id);
			if (group.id === id) return group; 
		}
		return null;
	}
	
	/* Products */
	
	_renderProducts(res) {
		var table = {
			id: this.state.products.tableId,
			header: [
				{ fe_icon: "image", width: 1, text_center: true },
				{ text: "Name" },
				{ text: "Description"},
				{ text: "Brand" },
				{ text: "Package" },
				{ text: "Price" },
				{ text: "Stock" },
				{ text: "Active" },
				{ width: 1 }
			],
			body: []
		};
		
		for (var i in res) {
			var brand = "-";
			if (res[i].brand_id !== null) brand = res[i].brand.name;
			var pkg = "-";
			if (res[i].package !== null) {
				pkg = res[i].package.name;
			}
			var price = "-";
			if (res[i].prices.length > 1) {
				price = "";
				for (var p in res[i].prices) {
					console.log(res[i].prices[p]);
					var groupName = "Unknown";
					var group = this.findPersonGroup(res[i].prices[p].person_group_id);
					if (group) groupName = group.name;
					price += groupName+": € "+(res[i].prices[p].amount/100.0).toFixed(2)+"\n";
				}
				//price = "...";
			} else if (res[i].prices.length === 1) {
				price = "€ "+(res[i].prices[0].amount/100.0).toFixed(2);
			}
			var stock = 0;
			for (var j in res[i].stock) {
				stock += Number(res[i].stock[j].amount_current);
			}
			
			var action_edit    = "javascript:spacecore.currentModule.edit("+res[i].id+");";
			var action_details = action_edit;//"javascript:spacecore.currentModule.showDetails("+res[i].id+");";
			var action_remove  = "javascript:spacecore.currentModule.remove("+res[i].id+");";
			
			table.body.push({ id: "product-"+res[i].id, fields: [
					{ action: action_details, avatar: res[i].picture, text_center: true },
					{ action: action_details, text: res[i].name },
					{ action: action_details, text: res[i].description },
					{ action: action_details, text: brand },
					{ action: action_details, text: pkg },
				    { action: action_details, text: price },
					{ action: action_details, text: String(stock) },
					{ action: action_details, fe_icon: res[i].active ? "check" : "x" },
					{ text_center: true, menu: [
						{ action: action_details, fe_icon: "info",    label: "Details" },
						{ action: action_edit,    fe_icon: "command", label: "Edit" },
						{ action: action_remove,  fe_icon: "trash-2", label: "Remove" }
					]}
			]});
		}
		return table;
	}
	
	_handleShowProducts(res, err) {
		if (err !== null) {
			return this.genericErrorHandler(err);
		}
		
		this.state.products.lastData = res;
		
		var productsTable = this._renderProducts(
			spacecore.filter(res, this.state.products.searchText, this.state.products.filterFields, false)
		);
				
		spacecore.showPage({
			header: { title: "Products", options: [
					{type:"button", fe_icon: "folder",   action: "javascript:spacecore.currentModule.show(true, 'groups');",          value: "Groups",                       class: "secondary"                                       },
					{type:"button", fe_icon: "hash",     action: "javascript:spacecore.currentModule.show(true, 'identifierTypes');", value: "Identifier types",             class: "secondary"                                       },
					{type:"button", fe_icon: "map-pin",  action: "javascript:spacecore.currentModule.show(true, 'locations');",       value: "Locations",                    class: "secondary"                                       },
					{type:"button", fe_icon: "umbrella", action: "javascript:spacecore.currentModule.show(true, 'brands');",          value: "Brands",                       class: "secondary"                                       },
					{type:"button", fe_icon: "package",  action: "javascript:spacecore.currentModule.show(true, 'packages');",        value: "Packages",                     class: "secondary"                                       },
					{type:"text",   fe_icon: "search",   action: "javascript:spacecore.search('products');",                          value: this.state.products.searchText, id: "products-search", placeholder: "Search products..." }
			]},
			body: [[[{ type: "card", header: { title: "Products", options: [ {type: "button", action: "javascript:spacecore.currentModule.add();", fe_icon: "plus", small: true } ] }, table: productsTable}]]]
		}, [this.state.products.tableId]);
		
		if (this.state.products.lastSelected !== null) window.location.href = "#product-"+this.state.products.lastSelected.id;
		spacecore.history.push(this.show.bind(this, false, "products"));
	}
	
	getDetails(id, target) {
		return spacecore.executeCommand('product/list',{id: id},target.bind(this));
	}
	
	showEdit(data=this.state.products.lastSelected, action="product/edit", formName="editproduct-form", title="Edit product", submitText="Edit") {
		var action_back = "javascript:spacecore.handleBackButton();";
		var action_edit = "javascript:spacecore.currentModule.submitForm('"+formName+"','"+action+"')";
		var elements = [
					{ type: "text",     name: "name",        label: "Name",        value: data.name },
					{ type: "text",     name: "description", label: "Description", value: data.description },
					{ type: "checkbox", name: "active",      label: "Active",      checked: Boolean(data.active) },
					{ type: "file",     name: "picture",     label: "Picture",     default: "Select an image to upload...",id: "productPictureFile", value: "", picture: data.picture }
				];
		if (typeof data.id === "number") {
			elements.push({ type: "hidden", name: "id", value: data.id, convertToNumber: true });
		}
		spacecore.showPage({
			header: { title: "Product details", options: [] },
			body: [[[
					{ type: "card", width: ['lg-8', 'md-12'], header: { title: title }, form: { id: formName, elements: elements, footer: [
						{type: "button", action: action_back, fe_icon: "x", value: "Cancel", class: "secondary" },
						{type: "button", action: action_edit, fe_icon: "save", value: submitText, ml: "auto" }
					]}}
				]]]
		});
	}
	
	edit(id=null, fromDetails=false) {
		if (fromDetails) spacecore.history.push(this.show.bind(this, false, "details"));
		if (id !== null) {
			this.getDetails(id, (res, err) => {
				if (err || (res.length < 1)) return console.log("Error while fetching details for user to be edited.", err,res);
				this.state.products.lastSelected = res[0];
				this.showEdit();
			});
		} else {
			this.showEdit();
		}
	}
	
	add() {
		this.showEdit({name: "", description: "", active: true, picture: null}, "product/create", "createproduct-form", "Create product", "Create");
	}
	
	showRemove() {
		var data = this.state.products.lastSelected;
		var action_back    = "javascript:spacecore.handleBackButton();";
		var action_remove  = "javascript:spacecore.currentModule.submitForm('removeproduct-form','product/remove')";
		spacecore.showPage({
			header: { title: "Products", options: [] },
			body: [[[{
				type: "card", width: ['lg-8', 'md-12'], header: { title: "Remove product" }, form: { id: "removeproduct-form", elements: [
					{ type: "hidden", name: "id", value: data.id, convertToNumber: true },
					{ type: "static", label: "Are you sure?", value: "You are about to remove product '"+this.state.products.lastSelected.name+"' from the system.\nThis will permanently remove the link to this product from all transactions!" }
				], footer: [
					{ type: "button", action: action_back,   fe_icon: "x",       value: "Cancel",         class: "secondary" },
					{ type: "button", action: action_remove, fe_icon: "trash-2", value: "Remove product", ml: "auto" }
				]}
			}]]]
		});
	}
	
	remove(id=null, fromDetails=false) {
		if (fromDetails) spacecore.history.push(this.show.bind(this, false, "details"));
		// Allow for deleting a product without opening the details view
		if (id !== null) {
			this.getDetails(id, (res, err) => {
				if (err || (res.length < 1)) return console.log("Error while fetching details for product to be removed.", err,res);
				this.state.products.lastSelected = res[0];
				this.showRemove();
			});
		} else {
			this.showRemove();
		}
	}
	
	/* Groups */
	
	_renderGroups(res) {
		var table = { id: this.state.groups.tableId, header: [
			{ text: "Name" }, { text: "Products"}, { width: 1 }
		], body: []};
		
		for (var i in res) {			
			var action_edit    = "javascript:spacecore.currentModule.editGroup("+res[i].id+");";
			var action_remove  = "javascript:spacecore.currentModule.removeGroup("+res[i].id+");";
			
			table.body.push({ id: "group-"+res[i].id, fields: [
					{ action: action_edit, text: res[i].name },
					{ action: action_edit, text: String(res[i].products.length) },
					{ elements: [
						spacecore.ui.elemBtnSecondary(action_edit, null, null, "command"),
						spacecore.ui.elemBtnSecondary(action_remove, null, null, "trash-2")
					]}
			]});
		}
		return table;
	}
	
	_handleShowGroups(res, err) {
		if (err !== null) return this.genericErrorHandler(err);		
		this.state.groups.lastData = res;
		var groupsTable = this._renderGroups( spacecore.filter(res, this.state.groups.searchText, this.state.groups.filterFields, false) );
		spacecore.showPage({
			header: { title: "Products", options: [
					spacecore.ui.elemSearchBox("javascript:spacecore.search('groups');", "Search groups...", this.state.groups.searchId, "search", this.state.groups.searchText),
					spacecore.ui.elemBtnSecondary("javascript:spacecore.currentModule.show();", "Back", "backBtn", "chevron-left")
			]},
			body: [[[{ type: "card", header: { title: "Product groups", options: [ {type: "button", action: "javascript:spacecore.currentModule.addGroup();", fe_icon: "plus", small: true } ] }, table: groupsTable}]]]
		}, [this.state.groups.tableId]);
		if (this.state.groups.lastSelected !== null) window.location.href = "#group-"+this.state.groups.lastSelected.id;
		spacecore.history.push(this.show.bind(this, false, "groups"));
	}
	
	/* Identifier types */
	
	_renderIdentifierTypes(res) {
		var table = { id: this.state.identifierTypes.tableId, header: [
			{ text: "Name" }, { text: "Long name"}, { width: 1 }
		], body: []};
		
		for (var i in res) {
			var action_edit    = "javascript:spacecore.currentModule.editIdentifierType("+res[i].id+");";
			var action_remove  = "javascript:spacecore.currentModule.removeIdentifierType("+res[i].id+");";
			
			table.body.push({ id: "identifier-type-"+res[i].id, fields: [
					{ action: action_edit, text: res[i].name },
					{ action: action_edit, text: res[i].long_name },
					{ elements: [
						spacecore.ui.elemBtnSecondary(action_edit, null, null, "command"),
						spacecore.ui.elemBtnSecondary(action_remove, null, null, "trash-2")
					]}
			]});
		}
		return table;
	}
	
	_handleShowIdentifierTypes(res, err) {
		if (err !== null) return this.genericErrorHandler(err);		
		this.state.identifierTypes.lastData = res;
		var groupsTable = this._renderIdentifierTypes( spacecore.filter(res, this.state.identifierTypes.searchText, this.state.identifierTypes.filterFields, false) );
		spacecore.showPage({
			header: { title: "Products", options: [
					spacecore.ui.elemSearchBox("javascript:spacecore.search('identifierTypes');", "Search identifier types...", this.state.identifierTypes.searchId, "search", this.state.identifierTypes.searchText),
					spacecore.ui.elemBtnSecondary("javascript:spacecore.currentModule.show();", "Back", "backBtn", "chevron-left")
			]},
			body: [[[{ type: "card", header: { title: "Product identifier types", options: [ {type: "button", action: "javascript:spacecore.currentModule.addIdentifierType();", fe_icon: "plus", small: true } ] }, table: groupsTable}]]]
		}, [this.state.identifierTypes.tableId]);
		if (this.state.identifierTypes.lastSelected !== null) window.location.href = "#identifier-type-"+this.state.identifierTypes.lastSelected.id;
		spacecore.history.push(this.show.bind(this, false, "identifierTypes"));
	}
	
	/* Locations */
	
	_renderLocations(res) {
		var table = { id: this.state.locations.tableId, header: [
			{ text: "Name" }, { text: "Sub" }, { text: "Description" }, { text: "Products" }, { text: "Visible" }, { width: 1 }
		], body: []};
		
		for (var i in res) {
			var action_edit    = "javascript:spacecore.currentModule.editLocation("+res[i].id+");";
			var action_remove  = "javascript:spacecore.currentModule.removeLocation("+res[i].id+");";
			
			table.body.push({ id: "location-"+res[i].id, fields: [
					{ action: action_edit, text: res[i].name },
					{ action: action_edit, text: res[i].sub },
					{ action: action_edit, text: res[i].description },
					{ action: action_edit, text: String(res[i].products.length) },
					{ action: action_edit, fe_icon: res[i].visible ? "check" : "x" },
					{ elements: [
						spacecore.ui.elemBtnSecondary(action_edit, null, null, "command"),
						spacecore.ui.elemBtnSecondary(action_remove, null, null, "trash-2")
					]}
			]});
		}
		return table;
	}
	
	_handleShowLocations(res, err) {
		if (err !== null) return this.genericErrorHandler(err);		
		this.state.locations.lastData = res;
		var locationsTable = this._renderLocations( spacecore.filter(res, this.state.locations.searchText, this.state.locations.filterFields, false) );
		spacecore.showPage({
			header: { title: "Products", options: [
					spacecore.ui.elemSearchBox("javascript:spacecore.search('locations');", "Search locations...", this.state.locations.searchId, "search", this.state.locations.searchText),
					spacecore.ui.elemBtnSecondary("javascript:spacecore.currentModule.show();", "Back", "backBtn", "chevron-left")
			]},
			body: [[[{ type: "card", header: { title: "Product locations", options: [ {type: "button", action: "javascript:spacecore.currentModule.addLocation();", fe_icon: "plus", small: true } ] }, table: locationsTable}]]]
		}, [this.state.locations.tableId]);
		if (this.state.locations.lastSelected !== null) window.location.href = "#location-"+this.state.locations.lastSelected.id;
		spacecore.history.push(this.show.bind(this, false, "locations"));
	}
	
	/* Brands */
	
	_renderBrands(res) {
		return [];
	}
	
	_handleShowBrands(res, err) {
		if (err !== null) return this.genericErrorHandler(err);		
		this.state.brands.lastData = res;
		var brandsTable = this._renderBrands( spacecore.filter(res, this.state.brands.searchText, this.state.brands.filterFields, false) );
		spacecore.showPage({
			header: { title: "Products", options: [
					spacecore.ui.elemSearchBox("javascript:spacecore.search('brands');", "Search brands...", this.state.brands.searchId, "search", this.state.brands.searchText),
					spacecore.ui.elemBtnSecondary("javascript:spacecore.currentModule.show();", "Back", "backBtn", "chevron-left")
			]},
			body: [[[{ type: "card", header: { title: "Product brands", options: [ {type: "button", action: "javascript:spacecore.currentModule.addBrand();", fe_icon: "plus", small: true } ] }, table: brandsTable}]]]
		}, [this.state.brands.tableId]);
		if (this.state.brands.lastSelected !== null) window.location.href = "#brand-"+this.state.brands.lastSelected.id;
		spacecore.history.push(this.show.bind(this, false, "brands"));
	}
	
	/* Packages */
	
	_renderPackages(res) {
		return [];
	}
	
	_handleShowPackages(res, err) {
		if (err !== null) return this.genericErrorHandler(err);		
		this.state.packages.lastData = res;
		var packagesTable = this._renderPackages( spacecore.filter(res, this.state.packages.searchText, this.state.packages.filterFields, false) );
		spacecore.showPage({
			header: { title: "Products", options: [
					spacecore.ui.elemSearchBox("javascript:spacecore.search('packages');", "Search packages...", this.state.packages.searchId, "search", this.state.packages.searchText),
					spacecore.ui.elemBtnSecondary("javascript:spacecore.currentModule.show();", "Back", "backBtn", "chevron-left")
			]},
			body: [[[{ type: "card", header: { title: "Product packages", options: [ {type: "button", action: "javascript:spacecore.currentModule.addPackage();", fe_icon: "plus", small: true } ] }, table: packagesTable}]]]
		}, [this.state.packages.tableId]);
		if (this.state.packages.lastSelected !== null) window.location.href = "#package-"+this.state.packages.lastSelected.id;
		spacecore.history.push(this.show.bind(this, false, "packages"));
	}
};
