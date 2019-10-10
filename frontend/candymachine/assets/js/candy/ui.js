const Handlebars = require('handlebars');

class UI {
	constructor( opts ) {
		this._opts = Object.assign({
			"copyrightString": 'Copyright &copy; 2019 TkkrLab'
		}, opts);
		
		console.log("[UI] Registering helpers...");
		
		Handlebars.registerHelper({
			eq: function (v1, v2) {
				return v1 === v2;
			},
			ne: function (v1, v2) {
				return v1 !== v2;
			},
			lt: function (v1, v2) {
				return v1 < v2;
			},
			gt: function (v1, v2) {
				return v1 > v2;
			},
			lte: function (v1, v2) {
				return v1 <= v2;
			},
			gte: function (v1, v2) {
				return v1 >= v2;
			},
			and: function () {
				return Array.prototype.slice.call(arguments).every(Boolean);
			},
			or: function () {
				return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
			},
			list: function (v1) {
				return Array.isArray(v1);
			},
			string: function (v1) {
				return (typeof v1 === 'string');
			},
			isset: function (v1) {
				return (typeof v1 !== 'undefined');
			}
		});
		
		Handlebars.registerHelper('resolveImage', (image) => { return this._resolveImage(image); });
		
		Handlebars.registerHelper('replaceNewlines', (text) => {
			if (typeof text === "string") {
				text = Handlebars.Utils.escapeExpression(text);
				return new Handlebars.SafeString(text.replace("\n","<br />"));
			}
			return text;
		});
		
		this.templates = {};
		
		Handlebars.registerPartial('avatar', '<span class="avatar d-block" style="background-image: url({{resolveImage avatar}})"></span>');
		
		Handlebars.registerPartial('product', "<div class='{{#if (eq big true)}}ds-grid-span-2{{/if}} vendy-cell' {{#if action}}onclick='{{action}}'{{/if}}>"
											+ "<img src='{{resolveImage image}}' alt='{{title}}'>"
											+ "{{#if price}}<div class='vendy-price'>{{price}}</div>{{/if}}"
											+ "</div>");
		
		this.templates['products'] = Handlebars.compile("<div class='ds-grid-fixed ds-grid-6 vendy'>{{#each items}}{{>product}}{{/each}}</div>");
		
		this.templates['table'] = Handlebars.compile("{{>table}}");
		
		this.templates['message'] = Handlebars.compile('<div class="ds-center-middle" style="height: 1024px;">'
													 + '<dialog class="ds-dialog" open="">'
													 + '<header class="ds-dialog-header ds-bg-primary {{#if image}}ds-dialog-header-image{{/if}}">'
													 + '{{#if image}}<img class="ds-background-image" src="{{resolveImage image}}" alt="">{{/if}}'
													 + '{{#if title}}<div class="ds-space"><h2>{{title}}</h2></div>{{/if}}'
													 + '</header><div class="ds-dialog-content">'
													 + '{{#each lines}}<div class="ds-space">{{this}}</div>{{/each}}'
													 + '</div></dialog>'
													 + '<div class="ds-dialog-overlay"></div>'
													 + '</div>');
		
		this.templates['dashboard'] = Handlebars.compile('{{#if content}}'
													   + '{{#if content.header}}{{>pageHeader content.header}}{{/if}}'
													   + '{{#each content.body}}<div class="row">{{#each this}}{{>pageColumn}}{{/each}}</div>{{/each}}'
													   + '{{else}}{{{raw}}}{{/if}}');
	}
	
	_resolveImage(input, fallback="./assets/spacecore-globe.svg") {
		if (typeof input === 'string') return input;
		if (typeof input !== 'object') return fallback;
		if (input === null) return fallback;
		if (typeof input.mime !== 'string') return fallback;
		if (typeof input.data !== 'string') return fallback;	
		return "data:"+input.mime+";base64,"+input.data;
	}
		
	show(html, elem="application") {
		document.getElementById(elem).innerHTML = html;
	}
	
	showTemplate(template='single', data={}, elem="application") {
		if (typeof this.templates[template] === 'undefined') return false;
		this.show(this.templates[template](data), elem);
		return true;
	}
	
	renderTemplate(template='single', data={}) {
		if (typeof this.templates[template] === 'undefined') return null;
		return this.templates[template](data);
	}
}


