require('./include');

/* ------------------
 *    Splashscreen
 * ------------------ */

var colors = require('colors');
console.log(colors.cyan(
"  _     _             _     _         \n" +
" | |   (_)           (_)   | |     /\\  \n" +
" | |    _  __ _ _   _ _  __| |    /  \\    \n" + 
" | |   | |/ _` | | | | |/ _` |   /    \\  \n" +
" | |___| | (_| | |_| | | (_| |  (      )\n" +
" |_____|_|\\__, |\\__,_|_|\\__,_|   \\____/      \n" +
"             | |                      \n" +			  
"             |_|                      \n"));


/* ----------------------
 *    Initialize liquid
 * ---------------------- */

include('./liquidServer.js');

require('./public/js/liquid_application/referenceService.js');

var fibers = require('fibers');
fibers(function() {
	liquid.initialize();
}).run();



/* ----------------------------
 *    Initialize http server 
 * ---------------------------- */

var express = require('express');
var liquidHttpServer = express();
// set the view engine to ejs
liquidHttpServer.set('view engine', 'ejs');
var cookieParser = require('cookie-parser');
var session = require('express-session');
console.log(session);
liquidHttpServer.use(cookieParser());
liquidHttpServer.use(session({secret: '12345QWER67890TY'}));

var controllers = require('./controllers.js');
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
		// console.log(socket); // null
		// console.log(hardToGuessPageId);
		// console.log(liquid.pagesMap);
		if (typeof(hardToGuessPageId) !== 'undefined' && hardToGuessPageId !== null && typeof(liquid.pagesMap[hardToGuessPageId]) !== 'undefined') {
			liquid.pagesMap[hardToGuessPageId].socket = socket;
			// console.log("Made an association between socket and hardToGuessPageId");
		}
	});
	
	socket.on('batchSave', function(hardToGuessPageId, saverId, changeList){
		// console.log('batchSave');
		//console.log(hardToGuessPageId);
		//console.log(saverId);
		//console.log(changeList);
		liquid.dataRequest(hardToGuessPageId, function(user, session, page) {
			changeList.forEach(function(change) {
				var object = liquid.getEntity(change.objectId);
				if (change.type === 'settingRelation' ||
					change.type === 'addingRelation' ||
					change.type === 'deletingRelation') {
					var relatedObject = liquid.getEntity(change.relatedObjectId);

					if (change.type === 'settingRelation') {
						var setterName = object._relationDefinitions[change.relationName].setterName;
						object[setterName](relatedObject);
					} else if (change.type === 'addingRelation') {
						var adderName = object._relationDefinitions[change.relationName].adderName;
						object[adderName](relatedObject);
					} else if (change.type === 'deletingRelation'){
						var removerName = object._relationDefinitions[change.relationName].removerName;
						object[removerName](relatedObject);	
					}
				} else if (change.type === "settingProperty") {
					var setterName = object._propertyDefinitions[change.propertyName].setterName;
					object[setterName](change.newValue);
				}
			});
		});
		// socket.emit("var saverId = arguments.saverId;")
	});

    socket.on('disconnect', function() {
        console.log('Disconnected'); 
    });
});

