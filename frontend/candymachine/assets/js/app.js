require.config({
	shim: {
		'handlebars': [],
		'ui': ['handlebars'],
		'candy':[],
		'login':[],
		'application': ['ui', 'candy', 'login'],
	},
	paths: {
		'circle-progress': 'assets/js/vendors/circle-progress.min',
		'handlebars': 'assets/js/vendors/handlebars-v4.0.11',
		'ui': 'assets/js/candy/ui',
		'candy': 'assets/js/candy/modules/candy',
		'login': 'assets/js/candy/modules/login',
		'application': 'assets/js/candy/main',
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
