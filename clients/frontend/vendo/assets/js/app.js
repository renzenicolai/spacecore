require.config({
	shim: {
		'handlebars': [],
		'ui': ['handlebars'],
		'vendo':[],
		'login':[],
		'application': ['ui', 'vendo', 'login'],
	},
	paths: {
		'circle-progress': 'assets/js/vendors/circle-progress.min',
		'handlebars': 'assets/js/vendors/handlebars-v4.0.11',
		'ui': 'assets/js/vendo/ui',
		'vendo': 'assets/js/vendo/modules/vendo',
		'login': 'assets/js/vendo/modules/login',
		'application': 'assets/js/vendo/main',
	}
});

function startApplication(common=null) {
	
	var location = window.location.href.split('/');
	var protocol = location[0];
	var domain = location[2];
		
	var apiUrl = '';
	
	if (protocol === 'http:') {
		apiUrl = 'ws://'+domain+"/api/";
	} else if (protocol === 'https:') {
		apiUrl = 'wss://'+domain+"/api/";
	} else {
		console.log('Unknown protocol ('+protocol+')!');
		document.getElementById('message').innerHTML = 'Unknown protocol ('+protocol+')! Can not connect to websocket server.';
	}
			
	if (apiUrl !== '') {
		window.application = new Application({
			apiUrl: apiUrl
		});
		
		if (typeof history.pushState === "function") {
				history.pushState("A", null, null);
				window.onpopstate = function () {
					history.pushState('B', null, null);
					application.handleBackButton();
				};
		}

	}
}

require(['application'], startApplication);
