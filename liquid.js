require('./include');

/* ------------------
 *    Splashscreen
 * ------------------ */

var colors = require('colors');
// console.log(colors.cyan(
// "  _     _             _     _         \n" +
// " | |   (_)           (_)   | |     /\\  \n" +
// " | |    _  __ _ _   _ _  __| |    /  \\    \n" +
// " | |   | |/ _` | | | | |/ _` |   /    \\  \n" +
// " | |___| | (_| | |_| | | (_| |  (      )\n" +
// " |_____|_|\\__, |\\__,_|_|\\__,_|   \\____/      \n" +
// "             | |                      \n" +
// "             |_|                      \n"));


/* ----------------------
 *    Initialize liquid
 * ---------------------- */

// Liquid server and model libraries.
include('./liquidServer.js');
includeFolderOnce('./public/js/liquid_application/model');

// Link classes etc.
var fibers = require('fibers');
fibers(function() {
	liquid.initialize();
}).run();

// Custom setup server script
include('./public/js/liquid_application/setupServer.js');


/* ----------------------------
 *    Initialize http server 
 * ---------------------------- */

var express = require('express');
var liquidHttpServer = express();
// set the view engine to ejs
liquidHttpServer.set('view engine', 'ejs');
var cookieParser = require('cookie-parser');
var session = require('express-session');
// console.log(session);
liquidHttpServer.use(cookieParser());
liquidHttpServer.use(session({secret: '12345QWER67890TY'}));

var controllers = require('./expressControllers.js');
for (controllerName in controllers) {
	liquidHttpServer.get('/' + controllerName, controllers[controllerName]);	
}

liquidHttpServer.use(express.static('public')); // TODO: use grunt to compile to different directory

liquidHttpServer.listen(4000, function () {
  console.log('Liquid is now listening on port 4000!');
});


/* ----------------------------
 *    Initialize socket io 
 * ---------------------------- */
 
var http = require("http"),
	server = http.createServer(function(req, res) {
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end(index);
	}).listen(8080);
	 
var socketIo = require('socket.io').listen(server); // Don't forget to "npm install socket.io" before including this
var fs = require('fs');
	
var liquidSocket = socketIo.sockets;
 
liquidSocket.on('connection', function (socket) {
 
    console.log('Connected a socket!');
	
	socket.on('registerPageId', function(hardToGuessPageId) {
		// console.log("Register page connection");
		// console.log(hardToGuessPageId);
		if (typeof(hardToGuessPageId) !== 'undefined' && hardToGuessPageId !== null && typeof(liquid.pagesMap[hardToGuessPageId]) !== 'undefined') {
			liquid.pagesMap[hardToGuessPageId]._socket = socket;
			// console.log("Made an association between socket and hardToGuessPageId");
		}
	});

	socket.on('pushDownstreamPulse', function(hardToGuessPageId, pulseData) {
		if (typeof(liquid.pagesMap[hardToGuessPageId]) !== 'undefined') {
			var page = liquid.pagesMap[hardToGuessPageId];
			liquid.pulse(page, function() {
				unserializeDownstreamPulse(pulseData);
			});
		} else {
			socket.emit('disconnectedDueToInactivityOrServerFault'); // TODO: Consider create new page?
		}
	});

    socket.on('disconnect', function(hardToGuessPageId) {
		// hardToGuessPageId
		// var page = liquid.pagesMap[hardToGuessPageId];
		// delete liquid.pagesMap[hardToGuessPageId];
		// page.setSession(null);
		// // TODO: unpersist page
        console.log('Disconnected'); 
        console.log(hardToGuessPageId);
    });
});

