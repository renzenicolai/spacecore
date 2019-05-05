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
	}

	reset() {
		this.state = {
			lastSelected: null,
			searchText: "",
			sortBy: "nick_name",
			sortReverse: false,
			lastData: null,

			lastSelectedGroup: null,
			groupsSearchText: "",
			groupsSortBy: "name",
			groupsSortReverse: false,
			groupsLastData: null
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

		if (part==="persons") {
			/* These are loaded async and may not be available right after rendering the page */
			this.app.executeCommand('person/group/list', {}, this._handleGroupsRefresh.bind(this));

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

	_handleManageTokens(res, err) {
		if (err !== null) {
			return this.genericErrorHandler(err);
		}
		this.state.tokensLastData = res;

		var tokensTable = this._renderTokens(
			this.app.sort(
				this.app.filter(
					res,
					this.state.tokensSearchText,
					['public', 'owner', 'enabled'],
					false
				),
				this.state.tokensSortBy,
				this.state.tokensSortReverse
			)
		);

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
									{
										type: "button",
										action: "javascript:spacecore.currentModule.tokenAdd();",
										fe_icon: "plus",
										small: true
									}
								]
							},
							table: tokensTable
						}
					]
				]
			]
		});

		if (this.state.lastSelectedToken !== null) window.location.href = "#person-token-"+this.state.lastSelectedToken.id;
	}

	_renderTokens(res) {
		//TODO
		return null;
	}

	/* Groups */

	manageGroups() {
		this.app.executeCommand('person/group/list', {}, this._handleManageGroups.bind(this));
	}

	_handleManageGroups(res, err) {
		if (err !== null) {
			return this.genericErrorHandler(err);
		}

		this._handleGroupsRefresh(res, err); //Update cache

		this.state.groupsLastData = res;

		var groupsTable = this._renderGroups(
			this.app.sort(
				this.app.filter(
					res,
					this.state.groupsSearchText,
					['name', 'description', 'addToNew'],
					false
				),
				this.state.groupsSortBy,
				this.state.groupsSortReverse
			)
		);

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
		});

		if (this.state.lastSelectedGroup !== null) window.location.href = "#person-group-"+this.state.lastSelectedGroup.id;
	}

	_renderGroups(res) {
		var table = {
			id: "table_groups",
			header: [
				{
					fe_icon: "user",
					width: 1,
					text_center: true,
					action: "javascript:spacecore.currentModule.changeGroupsSort('id');",
					fe_icon_after: this._getGroupsSortIcon('id')
				},
				{
					text: "Name",
					action: "javascript:spacecore.currentModule.changeGroupsSort('name');",
					fe_icon_after: this._getGroupsSortIcon('name')
				},
				{
					text: "Description",
					action: "javascript:spacecore.currentModule.changeGroupsSort('description');",
					fe_icon_after: this._getGroupsSortIcon('description')
				},
				{
					text: "Default",
					action: "javascript:spacecore.currentModule.changeGroupsSort('addToNew');",
					fe_icon_after: this._getGroupsSortIcon('addToNew')
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
							/*{
								action: "javascript:spacecore.currentModule.groupEdit("+res[i].id+");",
								fe_icon: "info",
								label: "Details"
							},*/
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

		console.log("SearchGroups", this.state.groupsSearchText, this.state.groupsLastData, this.state.groupsSortBy, this.state.groupsSortReverse);

		var filtered = this.app.sort(
			this.app.filter(
				this.state.groupsLastData,
				this.state.groupsSearchText,
				['name', 'description', 'addToNew'],
				false),
			this.state.groupsSortBy,
			this.state.groupsSortReverse);

		var content = this.ui.renderTemplate('table', this._renderGroups(filtered));
		document.getElementById('table_groups').innerHTML = content;
	}

	changeGroupsSort(field) {
		if (this.state.groupsSortBy === field) {
			this.state.groupsSortReverse = !this.state.groupsSortReverse;
		} else {
			this.state.groupsSortReverse = false;
			this.state.groupsSortBy = field;
		}
		this.searchGroups();
	}

	_handleGroupsRefresh(res, err) {
		if (err) return console.log("Persons _handleGroupsRefresh exception", err);
		this.groups = res;
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
										value: "You are about to remove '"+this.state.lastSelected.nick_name+"' from group '"+this._getGroupNameById(group)+"'."
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

	addGroupToPerson(id, nick_name="") {
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
								title: "Add group"
							},
							form: {
								id: "addgrouptoperson-form",
								elements: [
									{
										type: "hidden",
										name: "person",
										value: id,
										convertToNumber: true
									},
									{
										type: "static",
										label: "Person",
										value: nick_name,
										ng: true
									},
									{
										type: "radio",
										name: "group",
										label: "Group",
										selected: this.groups[0].id,
										options: groupItems,
										convertToNumber: true
									}
								],
								footer: [
										{
											type: "button",
											action: "javascript:spacecore.currentModule.showDetails("+id+");",
											fe_icon: "x",
											value: "Cancel",
											class: "secondary"
										},
										{
											type: "button",
											action: "javascript:spacecore.currentModule.submitForm('addgrouptoperson-form','person/addToGroup')",
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

		if ((form==="addgrouptoperson-form") || (form==="removegroupfromperson-form")) {
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
										value: "You are about to remove person '"+this.state.lastSelected.nick_name+"' from the system."
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

		var filtered = this.app.sort(
			this.app.filter(
				this.state.lastData,
				this.state.searchText,
				['nick_name', 'first_name', 'last_name'],
				false),
			this.state.sortBy,
			this.state.sortReverse);

		var content = this.ui.renderTemplate('table', this._renderPersons(filtered));
		document.getElementById('table_persons').innerHTML = content;
	}

	changeSort(field) {
		if (this.state.sortBy === field) {
			this.state.sortReverse = !this.state.sortReverse;
		} else {
			this.state.sortReverse = false;
			this.state.sortBy = field;
		}
		this.search();
	}

	_getSortIcon(field) {
		if (this.state.sortBy !== field) return null;
		if (this.state.sortReverse) return "chevron-up";
		return "chevron-down";
	}

	_getGroupsSortIcon(field) {
		if (this.state.groupsSortBy !== field) return null;
		if (this.state.groupsSortReverse) return "chevron-up";
		return "chevron-down";
	}

	_renderPersons(res) {
		var table = {
			id: "table_persons",
			header: [
				{
					fe_icon: "user",
					width: 1,
					text_center: true,
					action: "javascript:spacecore.currentModule.changeSort('id');",
					fe_icon_after: this._getSortIcon('id')
				},
				{
					text: "Nickname",
					action: "javascript:spacecore.currentModule.changeSort('nick_name');",
					fe_icon_after: this._getSortIcon('nick_name')
				},
				{
					text: "First name",
					action: "javascript:spacecore.currentModule.changeSort('first_name');",
					fe_icon_after: this._getSortIcon('first_name')
				},
				{
					text: "Last name",
					action: "javascript:spacecore.currentModule.changeSort('last_name');",
					fe_icon_after: this._getSortIcon('last_name')
				},
				{
					text: "Balance",
					action: "javascript:spacecore.currentModule.changeSort('balance');",
					fe_icon_after: this._getSortIcon('balance')
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
			this.app.sort(
				this.app.filter(
					res,
					this.state.searchText,
					['nick_name', 'first_name', 'last_name'],
					false
				),
				this.state.sortBy,
				this.state.sortReverse
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
		});

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
			id: "table_transactions",
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
				description = "Transaction contains more than one operation";
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
								action: "javascript:spacecore.currentModule.editAddress("+res.addresses[i].id+", "+res.id+");",
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
								action: "javascript:spacecore.currentModule.editBankaccount("+res.bankaccounts[i].id+", "+res.id+");",
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
								action: "javascript:spacecore.currentModule.editPhone("+res.phone[i].id+", "+res.id+");",
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
								action: "javascript:spacecore.currentModule.editPhone("+res.email[i].id+", "+res.id+");",
								fe_icon: "edit",
								label: "Edit email address"
							},
							{
								action: "javascript:spacecore.currentModule.removePhoneFromPerson("+res.email[i].id+");",
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
						text: res.tokens[i].enabled,
					},
					{
						text: res.tokens[i].type.name,
					},
					{
						text_center: true,
						menu: [
							{
								action: "javascript:spacecore.currentModule.editToken("+res.tokens[i].id+", "+res.id+");",
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
										action: "javascript:spacecore.currentModule.addGroupToPerson("+res.id+", '"+res.nick_name+"')",
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
										action: "javascript:spacecore.currentModule.addAddressToPerson("+res.id+", '"+res.nick_name+"')",
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
										action: "javascript:spacecore.currentModule.addEmailToPerson("+res.id+", '"+res.nick_name+"')",
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
										action: "javascript:spacecore.currentModule.addPhoneToPerson("+res.id+", '"+res.nick_name+"')",
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
								title: "Tokens",
								options: [
									{
										type: "button",
										action: "javascript:spacecore.currentModule.addTokenToPerson("+res.id+", '"+res.nick_name+"')",
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
		});
		this.app.jumpToTop();
	}
};
