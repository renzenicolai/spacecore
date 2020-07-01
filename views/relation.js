"use strict";

const RelationController = require('../controllers/relation.js');
const FileController     = require('../controllers/file.js');
const Relation           = require('../models/record/relation.js');
const Group              = require('../models/record/relation/group.js');
const ImageFile          = require('../models/record/file/image.js');

class relations {
	constructor(database) {
		this._database           = database;
		this._relationController = new RelationController(database);
		this._fileController     = new FileController(database);

		this.errors = {
			nickname_in_use: new Error('The chosen nickname is already in use'),
			not_found:       new Error('Relation not found')
		};
	}
	
	async createRelation(session, params) {
		let existing = await this._relationController.find(null, params.nickname);
		if (existing.length > 0) throw this.errors.nickname_in_use;
		if (!('realname'       in params)) params.realname       = params.nickname;
		if (!('addresses'      in params)) params.addresses      = [];
		if (!('emailaddresses' in params)) params.emailaddresses = [];
		if (!('phonenumbers'   in params)) params.phonenumbers   = [];
		if (!('picture'        in params)) params.picture        = null; // Object
		if (!('bankaccounts'   in params)) params.bankaccounts   = [];   // Object array
		if (!('groups'         in params)) params.groups         = [];   // Object array
		if (!('tokens'         in params)) params.tokens         = [];   // Object array
		let relation = new Relation(params);
		let result = await this._relationController.put(relation);
		return result;
	}

	async editRelation(session, params) {
		let relation = await this._relationController.get(params.id);
		if (!(relation instanceof Relation)) {
			throw this.errors.not_found;
		}
		if ('nickname' in params) {
			let existing = await this._relationController.find(null, params.nickname);
			if (existing.length > 0) throw this.errors.nickname_in_use;
			relation.setNickname(params.nickname);
		}
		if ('realname'       in params) relation.setRealname(params.realname);
		if ('addresses'      in params) relation.setAddresses(params.addresses);
		if ('emailaddresses' in params) relation.setEmailaddresses(params.emailaddresses);
		if ('phonenumbers'   in params) relation.setPhonenumbers(params.phonenumbers);
		if ('picture'        in params) relation.setPicture(params.picture);
		if ('bankaccounts'   in params) relation.setBankaccounts(params.bankaccounts);
		if ('groups'         in params) relation.setGroups(params.groups);
		if ('tokens'         in params) relation.setTokens(params.tokens);
		let result = await this._relationController.put(relation);
		return result;
	}

	async removeRelation(session, params) {
		return this._relationController.remove(params);
	}

	async listRelations(session, params, removePrivateInformation = false, exactMatch = false) {
		let query = {
			id: null,
			nickname: null,
			realname: null,
			token: null,
			tokenType: null
		};
		
		if (typeof params === 'object' && params != null) {
			if (typeof params.id        === 'number')  query.id        = params.id;
			if (typeof params.nickname  === 'string')  query.nickname  = params.nickname;
			if (typeof params.realname  === 'string')  query.realname  = params.realname;
			if (typeof params.token     === 'string')  query.token     = params.token;
			if (typeof params.tokenType === 'string')  query.tokenType = params.tokenType;
		}
		
		let result = await this._relationController.find(query.id, query.nickname, query.realname, query.token, query.tokenType, exactMatch);
		
		for (let i = 0; i < result.length; i++) {
			result[i] = result[i].serialize(false);
			if (removePrivateInformation) {
				delete result[i].addresses;
				delete result[i].emailaddresses;
				delete result[i].phonenumbers;
				delete result[i].bankaccounts;
				delete result[i].tokens;
			}
		}
		
		return result;
	}
	
	async listRelationsForVending(session, params) {
		return this.listRelations(session, params, true, false);
	}

	async findRelationsByNickname(session, params) {
		return this.listRelations(session, {nickname: params}, false, true);
	}
	
	async findRelationsByNicknameForVending(session, params) {
		return this.listRelations(session, {nickname: params}, true, true);
	}

	async findRelationsByToken(session, params, removePrivateInformation = false) {
		let token = params;
		let tokenType = null;
		if (typeof params === 'object') {
			token = params.public;
			if (typeof params.type === 'string') {
				tokenType = params.type;
			}
		}
		return this.listRelations(session, {token: token, tokenType: tokenType}, removePrivateInformation, true);
	}
	
	async findRelationsByTokenForVending(session, params) {
		this.findRelationsByToken(session, params, true);
	}

	/* Groups */

	async listGroups(session, params, exactMatch = false) {
		let query = {
			id: null,
			name: null,
			description: null,
			addtonew: null
		};
		
		if (typeof params === 'object' && params != null) {
			if (typeof params.id          === 'number') query.id          = params.id;
			if (typeof params.name        === 'string') query.name        = params.name;
			if (typeof params.description === 'string') query.description = params.description;
			if (typeof params.addtonew    === 'string') query.addtonew    = params.addtonew;
		}
		
		let result = await this._relationController.findGroup(query.id, query.name, query.description, query.addtonew, exactMatch);
		
		for (let i = 0; i < result.length; i++) {
			result[i] = result[i].serialize(false);
		}
		
		return result;
	}
	
	async findGroups(session, params) {
		return this.listGroups(session, params, true);
	}

	async createGroup(session, params) {
		if (!('name'        in params)) params.name      = '';
		if (!('description' in params)) params.addresses = '';
		if (!('addtonew'    in params)) params.addtonew  = false;
		if (!('picture'     in params)) params.picture   = null;
		let group = new Group(params);
		let result = await this._relationController.putGroup(group);
		return result;
	}

	async editGroup(session, params) {
		let group = await this._relationController.getGroup(params.id);
		if ('name'        in params) group.setName(params.name);
		if ('description' in params) group.setDescription(params.description);
		if ('addtonew'    in params) group.setAddtonew(params.addtonew);
		if ('picture'     in params) group.setPicture(params.picture);
		let result = await this._relationController.putGroup(group);
		return result;
	}

	async removeGroup(session, params) {
		return this._relationController.removeGroup(params);
	}
	
	/* Tokens */
	
	async listTokens(session, params, exactMatch = false) {
		let query = {
			public: null,
			type: null
		};
		
		if (typeof params === 'object' && params != null) {
			if (typeof params.public    === 'string')  query.public    = params.public;
			if (typeof params.type      === 'string')  query.type      = params.type;
		}
		
		let result = await this._relationController.findTokens(query.public, query.type, exactMatch);
		
		for (let i = 0; i < result.length; i++) {
			result[i] = result[i].serialize(false);
		}
		
		return result;
	}
	
	async findTokens(session, params) {
		return this.listTokens(session, params, true);
	}

	/* RPC function registration */

	registerRpcMethods(rpc, prefix="relation") {
		if (prefix!=="") prefix = prefix + "/";

		/*
		 * relations: create
		 *
		 * Create a relation
		 * 
		 */
		rpc.addMethod(
			prefix+"create",
			this.createRelation.bind(this),
			[
				{
					type: 'string',
					desciption: 'Nickname of the relation to be created'
				},
				{
					type: 'object',
					desciption: 'Object describing the relation to be created',
					required: {
						nickname: {
							type: 'string',
							description: 'Nickname'
						}
					},
					optional: {
						realname: {
							type: 'string',
							description: 'Real name'
						},
						picture: {
							type: 'object',
							description: 'Avatar picture',
							required: {
								mime: {
									type: 'string'
								},
								name: {
									type: 'string'
								},
								data: {
									type: 'string'
								}
							}
						}
					}
				}
			]
		);

		/*
		 * relations: edit
		 *
		 * Edit a relation
		 * 
		 */
		rpc.addMethod(
			prefix+"edit",
			this.editRelation.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the changes to be made to the relation',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the relation to be edited'
						}
					},
					optional: {
						nickname: {
							type: 'string',
							description: 'Nickname of the relation'
						},
						first_name: {
							type: 'string',
							description: 'First name of the relation'
						},
						last_name: {
							type: 'string',
							description: 'Last name of the relation'
						},
						picture: {
							type: 'object',
							description: 'Avatar of the relation (file object)',
							allowNull: true,
							required: {
								mime: {
									type: 'string'
								},
								name: {
									type: 'string'
								},
								data: {
									type: 'string'
								}
							}
						}
					}
				}
			]
		);

		/*
		 * relations: remove
		 *
		 * Delete a relation
		 * 
		 */
		rpc.addMethod(
			prefix+"remove",
			this.removeRelation.bind(this),
			{
				type: 'number',
				description: 'Identifier of the relation to be removed'
			},
			{
				type: 'object',
				required: {
					type: 'number',
					description: 'Identifier of the relation to be removed'
				}
			}
		);

		/*
		 * relations: list
		 *
		 * Retrieve a list of relations that fits the supplied query
		 * 
		 */
		rpc.addMethod(
			prefix+"list",
			this.listRelations.bind(this),
			{
				type: 'object',
				description: 'Query that may contain one or more the following filter items: id, nickname, realname, token and tokenType'
			}
		);

		/*
		 * relations: list for vending
		 *
		 * Retrieve a list of relations that fits the supplied query
		 * Without sensitive information
		 * 
		 */
		rpc.addMethod(
			prefix+"listForVending",
			this.listRelationsForVending.bind(this),
			{
				type: 'object',
				description: 'Query that may contain one or more the following filter items: id, nickname, realname, token and tokenType'
			}
		);
		
		/*
		 * relations: find
		 *
		 * Find a relation by nickname
		 * 
		 */
		rpc.addMethod(
			prefix+"find",
			this.findRelationsByNickname.bind(this),
			{
				type: 'string',
				description: 'Nickname of the relation'
			}
		);

		/*
		 * relations: find for vending
		 *
		 * Find a relation by nickname
		 * Without sensitive information
		 * 
		 */
		rpc.addMethod(
			prefix+"findForVending",
			this.findRelationsByNicknameForVending.bind(this),
			{
				type: 'string',
				description: 'Nickname of the relation'
			}
		);

		/*
		 * relations: find by token
		 *
		 * Find a relation by token
		 * 
		 */
		rpc.addMethod(
			prefix+"findByToken",
			this.findRelationsByToken.bind(this),
			[
				{
					type: 'string',
					description: 'Public key'
				},
				{
					type: 'object',
					required: {
						public: {
							type: 'string'
						}
					},
					optional: {
						type: {
							type: 'string'
						}
					}
				}
			]
		);
		
		/*
		 * relations: find by token
		 *
		 * Find a relation by token
		 * Without sensitive information
		 * 
		 */
		rpc.addMethod(
			prefix+"findByTokenForVending",
			this.findRelationsByTokenForVending.bind(this),
			[
				{
					type: 'string',
					description: 'Public key'
				},
				{
					type: 'object',
					required: {
						public: {
							type: 'string'
						}
					},
					optional: {
						type: {
							type: 'string'
						}
					}
				}
			]
		);
		
		/*
		 * Token: list
		 *
		 * List tokens
		 *
		 */
		rpc.addMethod(
			prefix+"token/list",
			this.listTokens.bind(this),
			{
				type: 'object',
				description: 'Query that may contain one or more of the following filter items: public, type. Matches using LIKE.'
			}
		);
		
		/*
		 * Token: find
		 *
		 * Find tokens
		 *
		 */
		rpc.addMethod(
			prefix+"token/find",
			this.listTokens.bind(this),
			{
				type: 'object',
				description: 'Query that may contain one or more of the following filter items: public, type. Exact match only.'
			}
		);
		
		/*
		 * Group: list
		 *
		 * List relation groups
		 *
		 */
		rpc.addMethod(
			prefix+"group/list",
			this.listGroups.bind(this),
			{
				type: 'object',
				description: 'Query that may contain one or more of the following filter items: name, description, addtonew. Matches using LIKE.'
			}
		);
		
		/*
		 * Group: find
		 *
		 * Find relation groups
		 *
		 */
		rpc.addMethod(
			prefix+"group/find",
			this.listGroups.bind(this),
			{
				type: 'object',
				description: 'Query that may contain one or more of the following filter items: name, description, addtonew. Exact match only.'
			}
		);

		/*
		 * Group: create
		 *
		 * Create a relation group
		 *
		 */
		rpc.addMethod(
			prefix+"group/create",
			this.createGroup.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the group',
					required: {
						name: {
							type: 'string',
							description: 'Name of the group'
						},
						description: {
							type: 'string',
							description: 'Description of the group'
						},
						addtonew: {
							type: 'boolean',
							description: 'Flag indicating weither or not the group should be added to new relations by default'
						},
						picture: {
							type: 'object',
							description: 'Group avatar (file object)',
							allowNull: true,
							required: {
								mime: {
									type: 'string'
								},
								name: {
									type: 'string'
								},
								data: {
									type: 'string'
								}
							}
						}
					}
				}
			]
		);

		/*
		 * Group: edit
		 *
		 * Edit a relation group
		 *
		 */
		rpc.addMethod(
			prefix+"group/edit",
			this.editGroup.bind(this),
			[
				{
					type: 'object',
					desciption: 'Object describing the group to be edited',
					required: {
						id: {
							type: 'number',
							description: 'Identifier of the group'
						}
					},
					optional: {
						name: {
							type: 'string',
							description: 'Name of the group'
						},
						description: {
							type: 'string',
							description: 'Description of the group'
						},
						addtonew: {
							type: 'boolean',
							description: 'Flag indicating weither or not the group should be added to new relations by default'
						}
					}
				}
			]
		);

		/*
		 * Group: remove
		 *
		 * Delete a relation group
		 *
		 */
		rpc.addMethod(
			prefix+"group/remove",
			this.removeGroup.bind(this),
			{
				type: 'number',
				description: 'Identifier of the group to be removed'
			}
		);
	}
}

module.exports = relations;
