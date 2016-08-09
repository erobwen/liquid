

//Socket_io is your front-end library you included before
var socket = io('http://localhost:8080');

socket.on('connect', function(){
	console.log("received CONNECT");
	console.log(liquid.hardToGuessPageId);
	socket.emit("registerPageId", liquid.hardToGuessPageId);
});

socket.on('settingRelation', function(objectId, relationName, relatedObjectId) {
	console.log("socket: settingRelation (" + objectId + ")." + relationName + " = " + "(" + relatedObjectId + ")");
	// TODO: Assert object in idObjectMap?
	liquid.holdChangePropagation(function() {
		liquid.withoutPushingToServer(function() {
			liquid.activeSaver = null;
			var object = liquid.getEntity(objectId);
			var relatedObject = liquid.getEntity(relatedObjectId);
			var setterName = object._relationDefinitions[relationName].setterName;
			object[setterName](relatedObject);
			liquid.activeSaver = liquid.defaultSaver;
		});
	});
})

socket.on('addingRelation', function(objectId, relationName, relatedObjectId) {
	console.log("socket: addingRelation (" + objectId + ")." + relationName + ".add(" + "(" + relatedObjectId + "))");
	liquid.holdChangePropagation(function() {
		liquid.withoutPushingToServer(function() {
			liquid.activeSaver = null;
			var object = liquid.getEntity(objectId);
			var relatedObject = liquid.getEntity(relatedObjectId);
			var adderName = object._relationDefinitions[relationName].adderName;
			object[adderName](relatedObject);
			liquid.activeSaver = liquid.defaultSaver;
		});
	});
})

socket.on('deletingRelation', function(objectId, relationName, relatedObjectId) {
	console.log("socket: deletingRelation (" + objectId + ")." + relationName + ".delete(" + "(" + relatedObjectId + "))");
	liquid.holdChangePropagation(function() {
		liquid.withoutPushingToServer(function() {
			liquid.activeSaver = null;
			var object = liquid.getEntity(objectId);
			var relatedObject = liquid.getEntity(relatedObjectId);
			var removerName = object._relationDefinitions[relationName].removerName;
			object[removerName](relatedObject);
			liquid.activeSaver = liquid.defaultSaver;
		});
	});
})

socket.on('settingProperty', function(objectId, propertyName, newValue) {
	console.log("socket: settingProperty (" + objectId + ")." + propertyName + " = " + newValue);	
	liquid.holdChangePropagation(function() {
		liquid.withoutPushingToServer(function() {
			liquid.activeSaver = null;
			var object = liquid.getEntity(objectId);
			var setterName = object._propertyDefinitions[propertyName].setterName;
			object[setterName](newValue);
			liquid.activeSaver = liquid.defaultSaver;
		});
	});
})

socket.on('disconnect', function(){
	console.log("Disconnected");
});

socket.on('batchSaveReturn', function(){
	// liquid.saverMap.
	// saver.consolidateIds(temporaryEntityIdToEntityIdMap);
			// console.groupEnd();
									
						// console.log("Successfully saved!");
						// globalAngularScope.$apply(function() {	
							// saver.savingChanges = false;
							// if (saver.changelist.length === 0) {
								// saver.allChangesSaved = true;
							// }
							// saver.postSaveEvents.forEach(function(event) { 
								// console.groupCollapsed("Running post save event");
								// try {
									// event(); 
								// } catch(error) {
									// console.log("Error in post save event");
									// console.log(error);
								// }
								// console.groupEnd();
							// });
							// console.log(saver);
						// });
						
						
					// } catch(error) {
						// console.log(error);
						// $scope.errorInAjaxCall();
						// console.groupEnd();
					// }
				// },
				// fail: function(text, textStatus) {  },
				// type: "post",
				// url:"/liquid/save"
			// });
			// alert("saving");

});
  
liquid.socket = socket;
  
  
// window.sessionStorage  Unique per tab. Store a session id here, that is specific to each browser window.

  
// Socket.on('welcome', function (socket) {
 
  // What we've send from the back-end
  // console.log(socket.message);
 
  // And we send something else !
  // Socket.emit('hey', {message: "I really don't care."});
// });
