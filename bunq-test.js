"use strict";

//Libraries
const Bunq     = require('./lib/bunq.js');

process.on('unhandledRejection', (err) => { 
	console.error('======== UNHANDLED REJECTION ========');
	console.error(err);
	console.error('=====================================');
	process.exit(1);
})

var bunq = new Bunq({
	
});

//Not yet implemented, sorry!
