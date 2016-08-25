

//Socket_io is your front-end library you included before
var socket = io('http://localhost:8080');
liquid.upstreamSocket = socket;

socket.on('connect', function(){
	console.log("received CONNECT");
	console.log(liquid.hardToGuessPageId);
	socket.emit("registerPageId", liquid.hardToGuessPageId);
});


socket.on('disconnect', function(){
	console.log("Disconnected");
});


socket.on('upstreamIdAssignmentNotification', function() {

});



/**
 * result.serializedObjects
 * [{
	 * 	 id: 34
	 * 	 className: 'Dog'
	 *	 HumanOwner: 'Human:23'
	 *	 property: "A string"
	 * }]
 * result.unsubscribedUpstreamIds
 * result.idToUpstreamId
 * result.events  [{action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }]
 */

socket.on('pushSubscriptionChanges', function(changes){
	liquid.pulse('upstream', function() {
		// Consolidate ids:
		for (id in result.idToUpstreamId) {
			liquid.getEntity(id)._upstreamId = result.idToUpstreamId[id];
		}
		
		unserializeFromUpstream(result.serializedObjects);
		
		changes.events.forEach(function(event) {
			if (event.action === 'addingRelation') {
				var object = liquid.getUpstreamEntity(event.objectId);
				var relatedObject = liquid.getUpstreamEntity(event.relatedObjectId);
				var adderName = object._relationDefinitions[event.relationName].adderName;
				object[adderName](relatedObject);
			} else if (event.action === 'deletingRelation') {

			} else if (event.action === 'settingProperty') {

			}
		});

		// TODO: kill objects result.unsubscribedUpstreamIds
	});
});
  
liquid.socket = socket;
  
  
// window.sessionStorage  Unique per tab. Store a session id here, that is specific to each browser window.

  
// Socket.on('welcome', function (socket) {
 
  // What we've send from the back-end
  // console.log(socket.message);
 
  // And we send something else !
  // Socket.emit('hey', {message: "I really don't care."});
// });



// socket.on('settingRelation', function(objectId, relationQualifiedName, relatedObjectId) {
// 	console.log("socket: settingRelation (" + objectId + ")." + relationQualifiedName + " = " + "(" + relatedObjectId + ")");
// 	// TODO: Assert object in idObjectMap?
// 	liquid.pulse('upstream', function() {
// 		liquid.activeSaver = null;
// 		var object = liquid.getEntity(objectId);
// 		var relatedObject = liquid.getEntity(relatedObjectId);
// 		var setterName = object._relationDefinitions[relationQualifiedName].setterName;
// 		object[setterName](relatedObject);
// 		liquid.activeSaver = liquid.defaultSaver;
// 	});
// })
//
// socket.on('addingRelation', function(objectId, relationQualifiedName, relatedObjectId) {
// 	console.log("socket: addingRelation (" + objectId + ")." + relationQualifiedName + ".add(" + "(" + relatedObjectId + "))");
// 	liquid.pulse('upstream', function() {
// 		liquid.activeSaver = null;
// 		var object = liquid.getUpstreamEntity(objectId);
// 		var relatedObject = liquid.getUpstreamEntity(relatedObjectId);
// 		var adderName = object._relationDefinitions[relationQualifiedName].adderName;
// 		object[adderName](relatedObject);
// 		liquid.activeSaver = liquid.defaultSaver;
// 	});
// })
//
// socket.on('deletingRelation', function(objectId, relationQualifiedName, relatedObjectId) {
// 	console.log("socket: deletingRelation (" + objectId + ")." + relationQualifiedName + ".delete(" + "(" + relatedObjectId + "))");
// 	liquid.pulse('upstream', function() {
// 		liquid.activeSaver = null;
// 		var object = liquid.getUpstreamEntity(objectId);
// 		var relatedObject = liquid.getUpstreamEntity(relatedObjectId);
// 		var removerName = object._relationDefinitions[relationQualifiedName].removerName;
// 		object[removerName](relatedObject);
// 		liquid.activeSaver = liquid.defaultSaver;
// 	});
// })
//
// socket.on('settingProperty', function(objectId, propertyName, newValue) {
// 	console.log("socket: settingProperty (" + objectId + ")." + propertyName + " = " + newValue);
// 	liquid.pulse('upstream', function() {
// 		liquid.activeSaver = null;
// 		var object = liquid.getUpstreamEntity(objectId);
// 		var setterName = object._propertyDefinitions[propertyName].setterName;
// 		object[setterName](newValue);
// 		liquid.activeSaver = liquid.defaultSaver;
// 	});
// })
