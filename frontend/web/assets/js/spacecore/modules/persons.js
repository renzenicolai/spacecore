class Persons {
	constructor( opts ) {
		this.name = 'persons';

		opts = Object.assign({
			ui: null,
			app: null
		}, opts);

		this.ui = opts.ui;
		this.app = opts.app;

		this.reset();

		this.groups = {};
		this.tokenTypes = [];
	}

	reset() {
		this.state = {
			lastSelected: null,
			searchText: "",
			lastData: null,

			lastSelectedGroup: null,
			groupsSearchText: "",
			groupsLastData: null,
			
			lastSelectedToken: null,
			tokensSearchText: "",
			tokensLastData: null
		};
	}

	/* Menu */

	menu(menu='main') {
		var items = [];
		if (menu === 'main') {
			if (this.app.checkPermission('person/list')) items.push({
				label: "Persons",
				fe_icon: "user",
				action: "javascript:spacecore.action('"+this.name+"', null, true);"
			});
		}
		return items;
	}

	/* Module */

	show(reset=true, part="persons") {
		if (reset) this.reset();
		this.app.currentModule = this;

		window.location.href = "#";
		
		if (part==="persons") {
			/* These are loaded async and may not be available right after rendering the page */
			this.app.executeCommand('person/group/list', {}, this._handleGroupsRefresh.bind(this));
			this.app.executeCommand('person/token/type/list', {}, this._handleTokenTypesRefresh.bind(this));

			/* Render the page */
			this.app.executeCommand('person/list', {}, this._handleShow.bind(this));
		} else {
			console.log("Unhandled part in persons module",part);
		}
	}

	/* Tokens */

	manageTokens() {
		this.app.executeCommand('person/token/list', {}, this._handleManageTokens.bind(this));
	}
	
	getPersonName(person) {
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
		return name;
	}
	
	getCurrentPersonName() {
		return this.getPersonName(this.state.lastSelected);
	}
	
	getCurrentPersonId() {
		return this.state.lastSelected.id;
	}

	_handleManageTokens(res, err) {
		if (err !== null) return this.genericErrorHandler(err);
		
		this.app.history.push(this.manageTokens.bind(this));
		
		for (var i in res) {
			res[i].owner = "-";
			if (typeof res[i].person === 'object') {
				res[i].owner = this.getPersonName(res[i].person);
			}
		}
		
		this.state.tokensLastData = res;
		var tokensTable = this._renderTokens(this.app.filter(res, this.state.tokensSearchText, ['public', 'owner', 'enabled'], false));

		this.app.showPage({
			header: {
				title: "Persons: tokens",
				options: [
						{
							type:"text",
							id: "persons-tokens-search",
							fe_icon: "search",
							placeholder: "Search tokens...",
							action:  "javascript:spacecore.currentModule.searchTokens();",
							value: this.state.groupsSearchText
						},
						{
							"type":"button",
							"fe_icon": "chevron-left",
							"action":  "javascript:spacecore.currentModule.show();",
							"value": "Back",
							"class": "secondary"
						}
					]
			},
			body: [
				[
					[
						{
							type: "card",
							header: {
								title: "Tokens",
								options: [
									/*{
										type: "button",
										action: "javascript:spacecore.currentModule.tokenAdd();",
										fe_icon: "plus",
										small: true
									}*/
								]
							},
							table: tokensTable
						}
					]
				]
			]
		}, ['table_tokens']);

		if (this.state.lastSelectedToken !== null) window.location.href = "#person-token-"+this.state.lastSelectedToken.id;
	}

	_renderTokens(res) {
		var table = {
			id: "table_tokens",
			header: [
				{
					fe_icon: "key",
					width: 1,
					text_center: true
				},
				{
					text: "Identifier"
				},
				{
					text: "Owner"
				},
				{
					text: "Type"
				},
				{
					text: "Enabled"
				},
				{
					width: 1
				}
			],
			body: []
		};

		for (var i in res) {
			table.body.push({
				id: "person-token-"+res[i].id,
				fields: [
					{
						//action: "javascript:spacecore.currentModule.tokenEdit("+res[i].id+");",
						text: res[i].id,
						text_center: true
					},
					{
						//action: "javascript:spacecore.currentModule.tokenEdit("+res[i].id+");",
						text: res[i].public
					},
					{
						//action: "javascript:spacecore.currentModule.tokenEdit("+res[i].id+");",
						text: res[i].owner
					},
					{
						text: res[i].type.name
					},
					{
						//action: "javascript:spacecore.currentModule.tokenEdit("+res[i].id+");",
						fe_icon: res[i].enabled ? "check" : "x"
					},
					{
						text_center: true,
						/*menu: [
							{
								action: "javascript:spacecore.currentModule.tokenEdit("+res[i].id+");",
								fe_icon: "command",
								label: "Edit"
							},
							{
								action: "javascript:spacecore.currentModule.tokenRemove("+res[i].id+");",
								fe_icon: "trash-2",
								label: "Remove"
							}
						]*/
						elements: [{
							"type":"button",
							"fe_icon": "user",
							"action":  "javascript:spacecore.currentModule.showDetails("+res[i].person.id+");",
							"class": "secondary"
						}]
					}
				]
			});
		}
		return table;
	}
	
	searchTokens(elem='persons-tokens-search') {
		this.state.tokensSearchText = document.getElementById(elem).value;

		console.log("SearchTokens", this.state.tokensSearchText, this.state.tokensLastData);

		var filtered = this.app.filter(
			this.state.tokensLastData,
			this.state.tokensSearchText,
			['public', 'owner', 'enabled'],
			false
		);

		var content = this.ui.renderTemplate('table', this._renderTokens(filtered));
		document.getElementById('table_tokens').innerHTML = content;
		this.ui.enableSorting(['table_tokens']);
	}
	
	/*tokenAdd() {		
		var typeOptions = [];
		for (var i in this.tokenTypes) typeOptions.push({id: i, value: this.tokenTypes[i].name});
		
		//var typeAction = function() { document.getElementById("privateKeyField") };
		
		this.app.showPage({
			header: {
				title: "Persons: tokens",
				options: []
			},
			body: [
				[
					[
						{
							type: "card",
							width: ['lg-8', 'md-12'],
							header: {
								title: "Add token"
							},
							form: {
								id: "addtoken-form",
								elements: [
									{
										type: "select-buttons",
										name: "type",
										label: "Type",
										options: typeOptions
									},
									{
										type: "text",
										name: "public",
										label: "Public key"
									},
									{
										type: "text",
										name: "public",
										label: "Private key",
										id: "privateKeyField"
									},
									{
										type: "checkbox",
										name: "enabled",
										label: "Enabled",
										checked: true
									}
								],
								footer: [
										{
											type: "button",
											action: "javascript:spacecore.currentModule.manageTokens();",
											fe_icon: "x",
											value: "Cancel",
											class: "secondary"
										},
										{
											type: "button",
											action: "javascript:spacecore.currentModule.submitForm('addtoken-form','person/token/create')",
											fe_icon: "save",
											value: "Add token",
											ml: "auto"
										}
									]
							}
						}
					]
				]
			]
		});
	}*/
	
	/*tokenEdit(id) {
		this.app.executeCommand('person/token/list', {id: id}, this._tokenEditHandler.bind(this));
	}
	
	_tokenEditHandler(res, err) {
		alert("Not implemented");
		this.manageTokens();
	}
	
	tokenRemove(id) {
		this.app.executeCommand('person/token/list', {id: id}, this._tokenRemoveHandler.bind(this));
	}
	
	_tokenRemoveHandler(res, err) {
		alert("Not implemented");
		this.manageTokens();
	}*/

	/* Groups */

	manageGroups() {
		this.app.executeCommand('person/group/list', {}, this._handleManageGroups.bind(this));
	}

	_handleManageGroups(res, err) {
		if (err !== null) return this.genericErrorHandler(err);
		this._handleGroupsRefresh(res, err); //Update cache
		this.state.groupsLastData = res;
		var groupsTable = this._renderGroups(this.app.filter(res, this.state.groupsSearchText, ['name', 'description', 'addToNew'], false));

		this.app.showPage({
			header: {
				title: "Persons: groups",
				options: [
						{
							type:"text",
							id: "persons-groups-search",
							fe_icon: "search",
							placeholder: "Search groups...",
							action:  "javascript:spacecore.currentModule.searchGroups();",
							value: this.state.groupsSearchText
						},
						{
							"type":"button",
							"fe_icon": "chevron-left",
							"action":  "javascript:spacecore.currentModule.show();",
							"value": "Back",
							"class": "secondary"
						}
					]
			},
			body: [
				[
					[
						{
							type: "card",
							header: {
								title: "Groups",
								options: [
									{
										type: "button",
										action: "javascript:spacecore.currentModule.groupAdd();",
										fe_icon: "plus",
										small: true
									}
								]
							},
							table: groupsTable
						}
					]
				]
			]
		}, ['table_groups']);

		if (this.state.lastSelectedGroup !== null) window.location.href = "#person-group-"+this.state.lastSelectedGroup.id;
	}

	_renderGroups(res) {
		var table = {
			id: "table_groups",
			header: [
				{
					fe_icon: "user",
					width: 1,
					text_center: true
				},
				{
					text: "Name"
				},
				{
					text: "Description"
				},
				{
					text: "Default"
				},
				{
					width: 1
				}
			],
			body: []
		};

		for (var i in res) {
			table.body.push({
				id: "person-group-"+res[i].id,
				fields: [
					{
						action: "javascript:spacecore.currentModule.groupEdit("+res[i].id+");",
						text: res[i].id,
						text_center: true
					},
					{
						action: "javascript:spacecore.currentModule.groupEdit("+res[i].id+");",
						text: res[i].name
					},
					{
						action: "javascript:spacecore.currentModule.groupEdit("+res[i].id+");",
						text: res[i].description
					},
					{
						action: "javascript:spacecore.currentModule.groupEdit("+res[i].id+");",
						fe_icon: res[i].addToNew ? "check" : "x"
					},
					{
						text_center: true,
						menu: [
							{
								action: "javascript:spacecore.currentModule.groupEdit("+res[i].id+");",
								fe_icon: "command",
								label: "Edit"
							},
							{
								action: "javascript:spacecore.currentModule.groupRemove("+res[i].id+");",
								fe_icon: "trash-2",
								label: "Remove"
							}
						]
					}
				]
			});
		}
		return table;
	}

	searchGroups(elem='persons-groups-search') {
		this.state.groupsSearchText = document.getElementById(elem).value;

		console.log("SearchGroups", this.state.groupsSearchText, this.state.groupsLastData);

		var filtered = this.app.filter(
			this.state.groupsLastData,
			this.state.groupsSearchText,
			['name', 'description', 'addToNew'],
			false
		);

		var content = this.ui.renderTemplate('table', this._renderGroups(filtered));
		document.getElementById('table_groups').innerHTML = content;
		this.ui.enableSorting(['table_groups']);
	}

	_handleGroupsRefresh(res, err) {
		if (err) return console.log("Persons _handleGroupsRefresh exception", err);
		this.groups = res;
	}
	
	_handleTokenTypesRefresh(res, err) {
		if (err) return console.log("Persons _handleTokenTypesRefresh exception", err);
		this.tokenTypes = res;
	}

	_getGroupNameById(id) {
		for (var i in this.groups) {
			if (this.groups[i].id === id) return this.groups[i].name;
		}
		return "";
	}

	groupAdd(name="", description="", addToNew="") {
		this.app.showPage({
			header: {
				title: "Persons: groups",
				options: []
			},
			body: [
				[
					[
						{
							type: "card",
							width: ['lg-8', 'md-12'],
							header: {
								title: "Add group"
							},
							form: {
								id: "addgroup-form",
								elements: [
									{
										type: "text",
										name: "name",
										label: "Name",
										value: name,
									},
									{
										type: "text",
										name: "description",
										label: "Description",
										value: description
									},
									{
										type: "checkbox",
										name: "default",
										label: "Default",
										checked: addToNew
									}
								],
								footer: [
										{
											type: "button",
											action: "javascript:spacecore.currentModule.manageGroups();",
											fe_icon: "x",
											value: "Cancel",
											class: "secondary"
										},
										{
											type: "button",
											action: "javascript:spacecore.currentModule.submitForm('addgroup-form','person/group/create')",
											fe_icon: "save",
											value: "Add group",
											ml: "auto"
										}
									]
							}
						}
					]
				]
			]
		});
	}

	groupRemove(id) {
		this.app.executeCommand('person/group/list', {id: id}, this._groupRemoveHandler.bind(this));
	}

	_groupRemoveHandler(res, err) {
		if (err !== null) {
			return this.genericErrorHandler(err);
		}

		if (res.length !== 1) {
			return this.genericErrorHandler({message: "Group not found!"});
		}

		var data = res[0];

		this.app.showPage({
			header: {
				title: "Persons: groups",
				options: []
			},
			body: [
				[
					[
						{
							type: "card",
							width: ['lg-8', 'md-12'],
							header: {
								title: "Remove group"
							},
							form: {
								id: "removegroup-form",
								elements: [
									{
										type: "hidden",
										name: "id",
										value: data.id,
										convertToNumber: true
									},
									{
										type: "static",
										label: "Are you sure?",
										value: "You are about to remove group '"+data.name+"'."
									},
									{
										type: "checkbox",
										label: "Force (remove even if there are persons in this group)",
										name: "force"
									}
								],

								footer: [
										{
											type: "button",
											action: "javascript:spacecore.currentModule.manageGroups();",
											fe_icon: "x",
											value: "Cancel",
											class: "secondary"
										},
										{
											type: "button",
											action: "javascript:spacecore.currentModule.submitForm('removegroup-form','person/group/remove')",
											fe_icon: "trash-2",
											value: "Remove group",
											ml: "auto"
										}
									]
							}
						}
					]
				]
			]
		});
	}

	groupEdit(id) {
		this.app.executeCommand('person/group/list', {id: id}, this._groupEditHandler.bind(this));
	}

	_groupEditHandler(res, err) {
		if (err !== null) {
			return this.genericErrorHandler(err);
		}

		if (res.length !== 1) {
			return this.genericErrorHandler({message: "Group not found!"});
		}

		var data = res[0];

		this.app.showPage({
			header: {
				title: "Persons: groups",
				options: []
			},
			body: [
				[
					[
						{
							type: "card",
							width: ['lg-8', 'md-12'],
							header: {
								title: "Edit group"
							},
							form: {
								id: "editgroup-form",
								elements: [
									{
										type: "hidden",
										name: "id",
										value: data.id,
										convertToNumber: true
									},
									{
										type: "text",
										name: "name",
										label: "Name",
										value: data.name,
									},
									{
										type: "text",
										name: "description",
										label: "Description",
										value: data.description
									},
									{
										type: "checkbox",
										name: "default",
										label: "Default",
										checked: data.addToNew > 0
									}
								],

								footer: [
										{
											type: "button",
											action: "javascript:spacecore.currentModule.manageGroups();",
											fe_icon: "x",
											value: "Cancel",
											class: "secondary"
										},
										{
											type: "button",
											action: "javascript:spacecore.currentModule.submitForm('editgroup-form','person/group/edit')",
											fe_icon: "save",
											value: "Edit group",
											ml: "auto"
										}
									]
							}
						}
					]
				]
			]
		});
	}
	
	_removeItemFromPersonForm(typeName, typeFieldName, itemName, itemId, endpoint) {
		if (typeof this.state.lastSelected !== "object") return console.log("removeItemFromPersonForm called without a person selected!", this.state.lastSelected);
		var id = this.state.lastSelected.id;

		this.app.showPage({
			header: {
				title: "Persons",
				options: []
			},
			body: [
				[
					[
						{
							type: "card",
							width: ['lg-8', 'md-12'],
							header: {
								title: "Remove "+typeName+" from "+this.getPersonName(this.state.lastSelected)
							},
							form: {
								id: "removeitemfromperson-form",
								elements: [
									{
										type: "hidden",
										name: "person",
										value: id,
										convertToNumber: true
									},
									{
										type: "hidden",
										name: typeFieldName,
										value: itemId,
										convertToNumber: true
									},
									{
										type: "static",
										label: "Are you sure?",
										value: "You are about to remove "+typeName+" "+itemName+" from "+this.getPersonName(this.state.lastSelected)+"."
									}
								],
								footer: [
										{
											type: "button",
											action: "javascript:spacecore.currentModule.showDetails();",
											fe_icon: "x",
											value: "Cancel",
											class: "secondary"
										},
										{
											type: "button",
											action: "javascript:spacecore.currentModule.submitForm('removeitemfromperson-form','"+endpoint+"')",
											fe_icon: "trash-2",
											value: "Remove",
											ml: "auto"
										}
									]
							}
						}
					]
				]
			]
		});
	}

	/* Persons */

	removeGroupFromPerson(group) {
		if (typeof this.state.lastSelected !== "object") return console.log("removeGroupFromPerson called without a person selected!", this.state.lastSelected);
		var id = this.state.lastSelected.id;

		var groupItems = [];
		for (var i in this.groups) {
			var item = {
				value: this.groups[i].id,
				label: this.groups[i].name
			};
			groupItems.push(item);
		}

		this.app.showPage({
			header: {
				title: "Persons",
				options: []
			},
			body: [
				[
					[
						{
							type: "card",
							width: ['lg-8', 'md-12'],
							header: {
								title: "Remove group"
							},
							form: {
								id: "removegroupfromperson-form",
								elements: [
									{
										type: "hidden",
										name: "person",
										value: id,
										convertToNumber: true
									},
									{
										type: "hidden",
										name: "group",
										value: group,
										convertToNumber: true
									},
									{
										type: "static",
										label: "Are you sure?",
										value: "You are about to remove '"+this.getPersonName(this.state.lastSelected)+"' from group '"+this._getGroupNameById(group)+"'."
									}
								],
								footer: [
										{
											type: "button",
											action: "javascript:spacecore.currentModule.showDetails();",
											fe_icon: "x",
											value: "Cancel",
											class: "secondary"
										},
										{
											type: "button",
											action: "javascript:spacecore.currentModule.submitForm('removegroupfromperson-form','person/removeFromGroup')",
											fe_icon: "trash-2",
											value: "Remove from group",
											ml: "auto"
										}
									]
							}
						}
					]
				]
			]
		});
	}

	addGroupToPerson(id) {
		var groupItems = [];
		for (var i in this.groups) {
			var item = {
				value: this.groups[i].id,
				label: this.groups[i].name
			};
			groupItems.push(item);
		}

		this._addItemToPersonForm(id, "person/addToGroup", "Add group to "+this.getCurrentPersonName(), "Add group", [
			{ type: "radio", name: "group", label: "Group", selected: this.groups[0].id, options: groupItems, convertToNumber: true }
		]);
	}
	
	_addItemToPersonForm(id, method, title, btnText, formElements) {
		var items = [];
		if (id>0) {
			items.push({ type: "hidden", name: "person", value: id, convertToNumber: true });
		}
		items = items.concat(formElements);
		this.app.showPage({ header: { title: "Persons", options: [] },
			body: [
				[
					[
						{
							type: "card",
							width: ['lg-8', 'md-12'],
							header: {
								title: title
							},
							form: {
								id: "additemtoperson-form",
								elements: items,
								footer: [
										{
											type: "button",
											action: "javascript:spacecore.currentModule.showDetails("+this.getCurrentPersonId()+");",
											fe_icon: "x",
											value: "Cancel",
											class: "secondary"
										},
										{
											type: "button",
											action: "javascript:spacecore.currentModule.submitForm('additemtoperson-form','"+method+"')",
											fe_icon: "save",
											value: btnText,
											ml: "auto"
										}
									]
							}
						}
					]
				]
			]
		});
	}
	
	addAddressToPerson(id) {
		this._addItemToPersonForm(id, "person/addAddress", "Add address to "+this.getCurrentPersonName(), "Add address", [
			{ type: "text", name: "street",      label: "Street"      },
			{ type: "text", name: "housenumber", label: "Housenumber" },
			{ type: "text", name: "postalcode",  label: "Postal code" },
			{ type: "text", name: "city",        label: "City"        }
		]);
	}
		
	_getAddressByIdFromLastSelected(id) {
		var addresses = spacecore.currentModule.state.lastSelected.addresses;
		for (var i in addresses) if (addresses[i].id===id) return addresses[i];
		return null;
	}
	
	removeAddressFromPerson(id) {
		var record = this._getAddressByIdFromLastSelected(id);
		var desc = "'"+record.street+" "+record.housenumber+", "+record.postalcode+" "+record.city+"'";
		this._removeItemFromPersonForm("address", "id", desc, id, "person/removeAddress");
	}
	
	editAddressOfPerson(id) {
		var record = this._getAddressByIdFromLastSelected(id);
		this._addItemToPersonForm(-1, "person/editAddress", "Edit address of "+this.getCurrentPersonName(), "Edit address", [
			{ type: "hidden", name: "id",                                value: id,                convertToNumber: true },
			{ type: "text",   name: "street",      label: "Street"     , value: record.street                            },
			{ type: "text",   name: "housenumber", label: "Housenumber", value: record.housenumber                       },
			{ type: "text",   name: "postalcode",  label: "Postal code", value: record.postalcode                        },
			{ type: "text",   name: "city",        label: "City"       , value: record.city                              }
		]);
	}
	
	addEmailToPerson(id) {
		this._addItemToPersonForm(id, "person/addEmail", "Add e-mail address to "+this.getCurrentPersonName(), "Add e-mail address", [
			{ type: "text", name: "address", label: "E-mail address" }
		]);
	}
	
	_getEmailByIdFromLastSelected(id) {
		var emails = spacecore.currentModule.state.lastSelected.email;
		for (var i in emails) if (emails[i].id===id) return emails[i];
		return null;
	}
	
	removeEmailFromPerson(id) {
		var record = this._getEmailByIdFromLastSelected(id);
		var desc = "'"+record.address+"'";
		this._removeItemFromPersonForm("email address", "id", desc, id, "person/removeEmail");
	}
	
	editEmailOfPerson(id) {
		var record = this._getEmailByIdFromLastSelected(id);
		this._addItemToPersonForm(-1, "person/editEmail", "Edit e-mail address of "+this.getCurrentPersonName(), "Edit e-mail address", [
			{ type: "hidden", name: "id",                               value: id,            convertToNumber: true },
			{ type: "text",   name: "address", label: "E-mail address", value: record.address                       }
		]);
	}
	
	addPhoneToPerson(id) {
		this._addItemToPersonForm(id, "person/addPhone", "Add phonenumber to "+this.getCurrentPersonName(), "Add phonenumber", [
			{ type: "text", name: "phonenumber", label: "Phonenumber" }
		]);
	}
	
	_getPhoneByIdFromLastSelected(id) {
		var phone = spacecore.currentModule.state.lastSelected.phone;
		for (var i in phone) if (phone[i].id===id) return phone[i];
		return null;
	}
	
	removePhoneFromPerson(id) {
		var record = this._getPhoneByIdFromLastSelected(id);
		var desc = "'"+record.phonenumber+"'";
		this._removeItemFromPersonForm("phonenumber", "id", desc, id, "person/removePhone");
	}
	
	editPhoneOfPerson(id) {
		var record = this._getPhoneByIdFromLastSelected(id);
		this._addItemToPersonForm(-1, "person/editPhone", "Edit phonenumber of "+this.getCurrentPersonName(), "Edit phonenumber", [
			{ type: "hidden", name: "id",                                value: id,                 convertToNumber: true },
			{ type: "text",   name: "phonenumber", label: "Phonenumber", value: record.phonenumber                        }
		]);
	}
	
	addBankaccountToPerson(id) {
		this._addItemToPersonForm(id, "person/addBankaccount", "Add bankaccount to "+this.getCurrentPersonName(), "Add bankaccount", [
			{ type: "text", name: "iban", label: "IBAN"           },
			{ type: "text", name: "name", label: "Account holder" }
		]);
	}
	
	_getBankaccountByIdFromLastSelected(id) {
		var bankaccounts = spacecore.currentModule.state.lastSelected.bankaccounts;
		for (var i in bankaccounts) if (bankaccounts[i].id===id) return bankaccounts[i];
		return null;
	}
	
	removeBankaccountFromPerson(id) {
		var record = this._getBankaccountByIdFromLastSelected(id);
		var desc = "'"+record.iban+"'";
		this._removeItemFromPersonForm("bankaccount", "id", desc, id, "person/removeBankaccount");
	}
	
	editBankaccountOfPerson(id) {
		var record = this._getBankaccountByIdFromLastSelected(id);
		this._addItemToPersonForm(-1, "person/editBankaccount", "Edit bankaccount of "+this.getCurrentPersonName(), "Edit bankaccount", [
			{ type: "hidden", name: "id",                             value: id,         convertToNumber: true },
			{ type: "text",   name: "iban", label: "IBAN"           , value: record.iban                       },
			{ type: "text",   name: "name", label: "Account holder" , value: record.name                       }
		]);
	}
	
	addTokenToPerson(id) {
		var typeOptions = [];
		for (var i in this.tokenTypes) typeOptions.push({value: i, label: this.tokenTypes[i].name});
		this._addItemToPersonForm(id, "person/addToken", "Add token to "+this.getCurrentPersonName(), "Add token", [
			{ type: "select",   name: "type",    label: "Type",                   options: typeOptions,  action: "spacecore.currentModule.tokenTypeAction()", id: "typeField", convertToNumber: true },
			{ type: "text",     name: "public",  label: "Public key / identifier"                                                                                                                    },
			{ type: "text",     name: "private", label: "Private key / secret",   id: "privateKeyField", disabled: (!this.tokenTypes[0].requirePrivate)                                              },
			{ type: "checkbox", name: "enabled", label: "Enable"                                                                                                                                     }
		]);
	}
	
	_getTokenByIdFromLastSelected(id) {
		var tokens = spacecore.currentModule.state.lastSelected.tokens;
		for (var i in tokens) if (tokens[i].id===id) return tokens[i];
		return null;
	}
	
	removeTokenFromPerson(id) {
		var record = this._getTokenByIdFromLastSelected(id);
		var desc = "'"+record.public+"'";
		this._removeItemFromPersonForm(record.type.name, "id", desc, id, "person/removeToken");
	}
	
	tokenTypeAction() {
		var currentType = parseInt(document.getElementById("typeField").value);
		document.getElementById("privateKeyField").disabled = !this.tokenTypes[currentType].requirePrivate;
	};
	
	editTokenOfPerson(id) {
		var record = this._getTokenByIdFromLastSelected(id);
		var typeOptions = [];
		for (var i in this.tokenTypes) {
			typeOptions.push({value: Number(i), label: this.tokenTypes[i].name});
		}
		console.log("ENABLED", record.enabled, typeof record.enabled);
		this._addItemToPersonForm(-1, "person/editToken", "Edit token of "+this.getCurrentPersonName(), "Edit token", [
			{ type: "hidden",   name: "id",                                                                                                                                                           value: id,            convertToNumber: true },
			{ type: "select",   name: "type",    label: "Type",                   options: typeOptions,  action: "spacecore.currentModule.tokenTypeAction()", id: "typeField", convertToNumber: true, value: record.type.id                       },
			{ type: "text",     name: "public",  label: "Public key / identifier"                                                                                                                   , value: record.public                        },
			{ type: "text",     name: "private", label: "Private key / secret",   id: "privateKeyField", disabled: (!this.tokenTypes[0].requirePrivate)                                             , value: record.private                       },
			{ type: "checkbox", name: "enabled", label: "Enable"                                                                                                                                    , checked: Boolean(record.enabled)            }
		]);
	}

	/* Form handling */

	submitForm(form, method) {
		spacecore.submitForm(this.submitFormHandler.bind(this, form, method), form, method);
	}

	submitFormHandler(form, method, res, err) {
		var action = "show()";
		var actionFunc = spacecore.currentModule.show;
		var skip = false;

		if (form==="addperson-form") {
			if (err === null) return this.showDetails(res);
			action = "showDetails("+res+")";
		}

		if (form==="editperson-form") {
			if (err === null) return this.showDetails(res);
			action = "show()";
		}

		if (form==="removeperson-form") {
			if (err === null) return this.show();
			action = "show()";
		}

		if (
			(form==="addgrouptoperson-form") ||
			(form==="removegroupfromperson-form") ||
			(form==="additemtoperson-form") ||
			(form==="removeitemfromperson-form")
		) {
			if (err === null) return this.showDetails(); //Skip the result if succesfull
			action = "showDetails()";

		}

		if ((form==="addgroup-form") || (form==="editgroup-form") || (form=="removegroup-form")) {
			if (err === null) return this.manageGroups(); //Skip the result if succesfull
			action = "manageGroups()";
		}

		if (err) {
			this.app.showMessage2(
				[
					err.message
				],
				"Persons",
				"Error",
				[
					{
						type: "button",
						value: "OK",
						action: "javascript:spacecore.currentModule."+action+";"
					}
				]
			);
		} else {
			this.app.showMessage2(
				[
					res
				],
				"Persons",
				"Result",
				[
					{
						type: "button",
						value: "OK",
						action: "javascript:spacecore.currentModule."+action+";"
					}
				]
			);
		}
	}

	/* Persons */

	add(nick_name="", first_name="", last_name="") {
		this.app.showPage({
			header: {
				title: "Persons",
				options: []
			},
			body: [
				[
					[
						{
							type: "card",
							width: ['lg-8', 'md-12'],
							header: {
								title: "Add person"
							},
							form: {
								id: "addperson-form",
								elements: [
									{
										type: "text",
										name: "nick_name",
										label: "Nickname",
										value: nick_name,
									},
									{
										type: "text",
										name: "first_name",
										label: "First name",
										value: first_name
									},
									{
										type: "text",
										name: "last_name",
										label: "Last name",
										value: last_name
									},
									{
										type: "file",
										name: "avatar",
										label: "Avatar",
										default: "Select an image to upload...",
										id: "personAvatarFile",
										value: ""
									}
								],
								footer: [
										{
											type: "button",
											action: "javascript:spacecore.action();",
											fe_icon: "x",
											value: "Cancel",
											class: "secondary"
										},
										{
											type: "button",
											action: "javascript:spacecore.currentModule.submitForm('addperson-form','person/create')",
											fe_icon: "save",
											value: "Add person",
											ml: "auto"
										}
									]
							}
						}
					]
				]
			]
		});
	}

	remove(id=null) {
		if (id !== null) {
			return this.getDetails(id, (res, err) => {
				if (err || (res.length < 1)) return console.log("Error while fetching details for user to be removed.", err,res);
				this.state.lastSelected = res[0];
				this.remove();
			});
		}

		if (typeof this.state.lastSelected !== "object") return console.log("remove called without a person selected!", this.state.lastSelected);
		var data = this.state.lastSelected;

		this.app.showPage({
			header: {
				title: "Persons",
				options: []
			},
			body: [
				[
					[
						{
							type: "card",
							width: ['lg-8', 'md-12'],
							header: {
								title: "Remove person"
							},
							form: {
								id: "removeperson-form",
								elements: [
									{
										type: "hidden",
										name: "id",
										value: data.id,
										convertToNumber: true
									},
									{
										type: "static",
										label: "Are you sure?",
										value: "You are about to remove person '"+this.getPersonName(this.state.lastSelected)+"' from the system."
									}
								],
								footer: [
										{
											type: "button",
											action: "javascript:spacecore.currentModule.showDetails();",
											fe_icon: "x",
											value: "Cancel",
											class: "secondary"
										},
										{
											type: "button",
											action: "javascript:spacecore.currentModule.submitForm('removeperson-form','person/remove')",
											fe_icon: "trash-2",
											value: "Remove person",
											ml: "auto"
										}
									]
							}
						}
					]
				]
			]
		});
	}

	search(elem='persons-search') {
		this.state.searchText = document.getElementById(elem).value;

		var filtered = this.app.filter(
			this.state.lastData,
			this.state.searchText,
			['nick_name', 'first_name', 'last_name'],
			false
		);

		var content = this.ui.renderTemplate('table', this._renderPersons(filtered));
		document.getElementById('table_persons').innerHTML = content;
		this.ui.enableSorting(['table_persons']);
	}

	_renderPersons(res) {
		var table = {
			id: "table_persons",
			header: [
				{
					fe_icon: "user",
					width: 1,
					text_center: true
				},
				{
					text: "Nickname"
				},
				{
					text: "First name"
				},
				{
					text: "Last name"
				},
				{
					text: "Balance"
				},
				{
					width: 1
				}
			],
			body: []
		};

		for (var i in res) {
			table.body.push({
				id: "person-"+res[i].id,
				fields: [
					{
						action: "javascript:spacecore.currentModule.showDetails("+res[i].id+");",
						avatar: res[i].avatar,
						text_center: true
					},
					{
						action: "javascript:spacecore.currentModule.showDetails("+res[i].id+");",
						text: res[i].nick_name
					},
					{
						action: "javascript:spacecore.currentModule.showDetails("+res[i].id+");",
						text: res[i].first_name
					},
					{
						action: "javascript:spacecore.currentModule.showDetails("+res[i].id+");",
						text: res[i].last_name
					},
				    {
						action: "javascript:spacecore.currentModule.showDetails("+res[i].id+");",
						text: "€ "+(res[i].balance/100.0).toFixed(2)
					},
					{
						text_center: true,
						menu: [
							{
								action: "javascript:spacecore.currentModule.showDetails("+res[i].id+");",
								fe_icon: "info",
								label: "Details"
							},
							{
								action: "javascript:spacecore.currentModule.edit("+res[i].id+");",
								fe_icon: "command",
								label: "Edit"
							},
							{
								action: "javascript:spacecore.currentModule.remove("+res[i].id+");",
								fe_icon: "trash-2",
								label: "Remove"
							}
						]
					}
				]
			});
		}
		return table;
	}

	genericErrorHandler(err, action="show()") {
		var message = "Unknown error!";

		if ((typeof err === 'object') && (typeof err.message === 'string')) {
			message = err.message;
		} else if (typeof err === 'string') {
			message = err;
		} else {
			console.log("Invalid argument supplied to error handler", err);
		}

		this.app.showMessage2(
			message,
			"Persons",
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
	
	_handleShow(res, err) {
		if (err !== null) {
			return this.genericErrorHandler(err);
		}

		this.state.lastData = res;

		var personsTable = this._renderPersons(
			this.app.filter(
				res,
				this.state.searchText,
				['nick_name', 'first_name', 'last_name'],
				false
			)
		);

		this.app.showPage({
			header: {
				title: "Persons",
				options: [
						{
							"type":"button",
							"fe_icon": "key",
							"action":  "javascript:spacecore.currentModule.manageTokens();",
							"value": "Manage tokens",
							"class": "secondary"
						},
						{
							"type":"button",
							"fe_icon": "folder",
							"action":  "javascript:spacecore.currentModule.manageGroups();",
							"value": "Manage groups",
							"class": "secondary"
						},
						{
							type:"text",
							id: "persons-search",
							fe_icon: "search",
							placeholder: "Search persons...",
							action:  "javascript:spacecore.currentModule.search();",
							value: this.state.searchText
						}
					]
			},
			body: [
				[
					[
						{
							type: "card",
							header: {
								title: "Persons",
								options: [
									{
										type: "button",
										action: "javascript:spacecore.currentModule.add();",
										fe_icon: "plus",
										small: true
									}
								]
							},
							table: personsTable
						}
					]
				]
			]
		}, ['table_persons']);
		
		if (this.state.lastSelected !== null) window.location.href = "#person-"+this.state.lastSelected.id;
	}

	/* Person details */

	edit(id=null) {
		if (id !== null) {
			return this.getDetails(id, (res, err) => {
				if (err || (res.length < 1)) return console.log("Error while fetching details for user to be edited.", err,res);
				this.state.lastSelected = res[0];
				this.edit();
			});
		}


		if (typeof this.state.lastSelected !== "object") {
			return console.log("edit called without a person selected!", this.state.lastSelected);
		}

		var data = this.state.lastSelected;

		this.app.showPage({
			header: {
				title: "Person details",
				options: []
			},
			body: [
				[
					[
						{
							type: "card",
							width: ['lg-8', 'md-12'],
							header: {
								title: "Edit person"
							},
							form: {
								id: "editperson-form",
								elements: [
									{
										type: "hidden",
										name: "id",
										value: data.id,
										convertToNumber: true
									},
									{
										type: "text",
										name: "nick_name",
										label: "Nickname",
										value: data.nick_name
									},
									{
										type: "text",
										name: "first_name",
										label: "First name",
										value: data.first_name
									},
									{
										type: "text",
										name: "last_name",
										label: "Last name",
										value: data.last_name
									},
									{
										type: "file",
										name: "avatar",
										label: "Avatar",
										default: "Select an image to upload...",
										id: "personAvatarFile",
										value: ""
									}
								],

								footer: [
										{
											type: "button",
											action: "javascript:spacecore.currentModule.showDetails();",
											fe_icon: "x",
											value: "Cancel",
											class: "secondary"
										},
										{
											type: "button",
											action: "javascript:spacecore.currentModule.submitForm('editperson-form','person/edit')",
											fe_icon: "save",
											value: "Edit",
											ml: "auto"
										}
									]
							}
						}
					]
				]
			]
		});

	}

	getDetails(id, target) {
		return this.app.executeCommand('person/list',{id: id},target.bind(this));
	}

	showDetails(id=null) {
		if ((id === null) && (typeof this.state.lastSelected === "object")) {
			id = this.state.lastSelected.id;
		}

		if (id === null) {
			this.show();
		} else {
			this.getDetails(id, this._handleShowDetails);
		}
	}

	_handleShowDetails(res, err) {
		if (err) {
			console.log('_handleShowDetails error', err);
			genericErrorHandler(err);
		}

		if (res.length < 1) {
			this.genericErrorHandler({message: "Person not found."});
			return;
		}

		res = res[0]; //First result is the only result

		this.state.lastSelected = res;
		this.app.executeCommand('transaction/list/query', [{person_id: res.id}], this._handleShowDetails2.bind(this, res, err));
	}

	_handleShowDetails2(res, err, transactionsRes, transactionsErr) {
		console.log("_handleShowDetails2");
		if (err !== null) {
			console.log("handlePersonDetails error ",err);
			this.genericErrorHandler(err);
			return;
		}

		if (transactionsErr !== null) {
			console.log("handlePersonDetails transactions error ",err);
			this.genericErrorHandler(transactionsErr);
			return;
		}

		this.app.history.push(this.show.bind(this, false));

		console.log("Person", res);

		var table_groups = {
			id: "table_person_groups",
			header: [
				"Group",
				{
					width: 1
				}
			],
			body: []
		};

		for (var i in res.groups) {
			table_groups.body.push({
				id: "group-"+res.groups[i].id,
				fields: [
					{
						text: res.groups[i].name,
					},
					{
						text_center: true,
						menu: [
							{
								action: "javascript:spacecore.currentModule.removeGroupFromPerson("+res.groups[i].id+");",
								fe_icon: "trash-2",
								label: "Remove group from person"
							},
						]
					}
				]
			});
		}

		var table_transactions = {
			id: "table_person_transactions",
			header: [
				"ID",
				"Details",
				"Total",
				"Timestamp",
				{
					width: 1
				}
			],
			body: []
		};

		for (var i in transactionsRes) {
			var description = "";

			if (transactionsRes[i].rows.length < 1) {
				description = "Empty transaction";
			} else if (transactionsRes[i].rows.length === 1) {
				description = transactionsRes[i].rows[0].amount+"x "+transactionsRes[i].rows[0].description;
			} else {
				//description = "Transaction contains more than one operation";
				description = '';
				for (var j in transactionsRes[i].rows) {
					if (description !== '') description += "\n";
					description += transactionsRes[i].rows[j].amount+"x "+transactionsRes[i].rows[j].description+" (€ "+(transactionsRes[i].rows[j].price*transactionsRes[i].rows[j].amount/100.0).toFixed(2)+")";
				}
			}
			var timestamp = new Date(transactionsRes[i].timestamp*1000);
			var timestring = ((timestamp.getDate()<10)?"0":"")+timestamp.getDate() + "-" +
			                 (((timestamp.getMonth()+1)<10)?"0":"")+(timestamp.getMonth()+1) + "-" +
			                 timestamp.getFullYear() + " " +
			                 ((timestamp.getHours()<10)?"0":"")+timestamp.getHours() + ":" +
			                 ((timestamp.getMinutes()<10)?"0":"")+timestamp.getMinutes();
			table_transactions.body.push({
				id: "transaction-"+transactionsRes[i].id,
				fields: [
					{
						text: transactionsRes[i].id
					},
					{
						text: description
					},
					{
						text: "€ "+(transactionsRes[i].total/100.0).toFixed(2)
					},
					{
						text: timestring
					},
					{
						text: ""
					}
				]
			});
		}

		var table_addresses = {
			id: "table_person_addresses",
			header: [
				"Street",
				"#",
				"Code",
				"City",
				{
					width: 1
				}
			],
			body: []
		};

		for (var i in res.addresses) {
			table_addresses.body.push({
				id: "address-"+res.addresses[i].id,
				fields: [
					{
						text: res.addresses[i].street,
					},
					{
						text: res.addresses[i].housenumber,
					},
					{
						text: res.addresses[i].postalcode,
					},
					{
						text: res.addresses[i].city,
					},
					{
						text_center: true,
						menu: [
							{
								action: "javascript:spacecore.currentModule.editAddressOfPerson("+res.addresses[i].id+");",
								fe_icon: "edit",
								label: "Edit address"
							},
							{
								action: "javascript:spacecore.currentModule.removeAddressFromPerson("+res.addresses[i].id+");",
								fe_icon: "trash-2",
								label: "Remove address"
							},
						]
					}
				]
			});
		}

		var table_bankaccounts = {
			id: "table_person_bankaccounts",
			header: [
				"Name",
				"IBAN",
				{
					width: 1
				}
			],
			body: []
		};

		for (var i in res.bankaccounts) {
			table_bankaccounts.body.push({
				id: "bankaccount-"+res.bankaccounts[i].id,
				fields: [
					{
						text: res.bankaccounts[i].name,
					},
					{
						text: res.bankaccounts[i].iban,
					},
					{
						text_center: true,
						menu: [
							{
								action: "javascript:spacecore.currentModule.editBankaccountOfPerson("+res.bankaccounts[i].id+");",
								fe_icon: "edit",
								label: "Edit bankaccount"
							},
							{
								action: "javascript:spacecore.currentModule.removeBankaccountFromPerson("+res.bankaccounts[i].id+");",
								fe_icon: "trash-2",
								label: "Remove bankaccount"
							},
						]
					}
				]
			});
		}

		var table_phone = {
			id: "table_person_phone",
			header: [
				"Phonenumber",
				{
					width: 1
				}
			],
			body: []
		};

		for (var i in res.phone) {
			table_phone.body.push({
				id: "phone-"+res.phone[i].id,
				fields: [
					{
						text: res.phone[i].phonenumber,
					},
					{
						text_center: true,
						menu: [
							{
								action: "javascript:spacecore.currentModule.editPhoneOfPerson("+res.phone[i].id+");",
								fe_icon: "edit",
								label: "Edit phonenumber"
							},
							{
								action: "javascript:spacecore.currentModule.removePhoneFromPerson("+res.phone[i].id+");",
								fe_icon: "trash-2",
								label: "Remove phonenumber"
							},
						]
					}
				]
			});
		}

		var table_email = {
			id: "table_person_email",
			header: [
				"Address",
				{
					width: 1
				}
			],
			body: []
		};

		for (var i in res.email) {
			table_email.body.push({
				id: "email-"+res.email[i].id,
				fields: [
					{
						text: res.email[i].address,
					},
					{
						text_center: true,
						menu: [
							{
								action: "javascript:spacecore.currentModule.editEmailOfPerson("+res.email[i].id+");",
								fe_icon: "edit",
								label: "Edit email address"
							},
							{
								action: "javascript:spacecore.currentModule.removeEmailFromPerson("+res.email[i].id+");",
								fe_icon: "trash-2",
								label: "Remove email address"
							},
						]
					}
				]
			});
		}

		var table_tokens = {
			id: "table_person_tokens",
			header: [
				"Key",
				"Enabled",
				"Type",
				{
					width: 1
				}
			],
			body: []
		};

		for (var i in res.tokens) {
			table_tokens.body.push({
				id: "token-"+res.tokens[i].id,
				fields: [
					{
						text: res.tokens[i].public,
					},
					{
						fe_icon: res.tokens[i].enabled ? "check" : "x"
					},
					{
						text: res.tokens[i].type.name,
					},
					{
						text_center: true,
						menu: [
							{
								action: "javascript:spacecore.currentModule.editTokenOfPerson("+res.tokens[i].id+");",
								fe_icon: "edit",
								label: "Edit token"
							},
							{
								action: "javascript:spacecore.currentModule.removeTokenFromPerson("+res.tokens[i].id+");",
								fe_icon: "trash-2",
								label: "Remove token"
							},
						]
					}
				]
			});
		}

		this.app.showPage({
			header: {
				title: "Person details",
				options: [
						{
							"type":"button",
							"fe_icon": "command",
							"action":  "javascript:spacecore.currentModule.edit();",
							"value": "Edit",
							"class": "secondary"
						},
						{
							"type":"button",
							"fe_icon": "trash-2",
							"action":  "javascript:spacecore.currentModule.remove();",
							"value": "Remove",
							"class": "secondary"
						},
						{
							"type":"button",
							"fe_icon": "chevron-left",
							"action":  "javascript:spacecore.handleBackButton();",
							"value": "Back",
							"class": "secondary"
						}
					]
			},
			body: [
				[{
					width: "lg-4",
					elements: [
						{
							type: "card",
							padding: 5,
							media: {
								avatar: res.avatar,
								name: res.first_name+" "+res.last_name,
								comment: res.nick_name,
								buttons: ""
							}
						},
						{
							type: "card",
							header: {
								title: "Groups",
								options: [
									{
										type: "button",
										action: "javascript:spacecore.currentModule.addGroupToPerson("+res.id+")",
										fe_icon: "plus",
										small: true
									}
								]
							},
							table: table_groups
						},
						{
							type: "card",
							header: {
								title: "Addresses",
								options: [
									{
										type: "button",
										action: "javascript:spacecore.currentModule.addAddressToPerson("+res.id+")",
										fe_icon: "plus",
										small: true
									}
								]
							},
							table: table_addresses
						},
						{
							type: "card",
							header: {
								title: "Email addresses",
								options: [
									{
										type: "button",
										action: "javascript:spacecore.currentModule.addEmailToPerson("+res.id+")",
										fe_icon: "plus",
										small: true
									}
								]
							},
							table: table_email
						},
						{
							type: "card",
							header: {
								title: "Phonenumbers",
								options: [
									{
										type: "button",
										action: "javascript:spacecore.currentModule.addPhoneToPerson("+res.id+")",
										fe_icon: "plus",
										small: true
									}
								]
							},
							table: table_phone
						},
						{
							type: "card",
							header: {
								title: "Bankaccounts",
								options: [
									{
										type: "button",
										action: "javascript:spacecore.currentModule.addBankaccountToPerson("+res.id+")",
										fe_icon: "plus",
										small: true
									}
								]
							},
							table: table_bankaccounts
						},
						{
							type: "card",
							header: {
								title: "Tokens",
								options: [
									{
										type: "button",
										action: "javascript:spacecore.currentModule.addTokenToPerson("+res.id+")",
										fe_icon: "plus",
										small: true
									}
								]
							},
							table: table_tokens
						},
					]
				},
				{
					width: ["lg-8", "md-12"],
					elements: [
						{
							type: "card",
							header: {
								title: "Transactions",
								options: []
							},
							table: table_transactions
						}
					]
				}]
			]
		}, ['table_person_addresses', 'table_person_bankaccounts', 'table_person_email', 'table_person_groups', 'table_person_phone', 'table_person_tokens', 'table_person_transactions']);
		this.app.jumpToTop();
	}
};
