

//Socket_io is your front-end library you included before
var socket = io('http://localhost:8080');
liquid.upstreamSocket = socket;

socket.on('connect', function(){
	console.log("received CONNECT");
	console.log(liquid.instancePage.getHardToGuessPageId());
	socket.emit("registerPageId", liquid.instancePage.getHardToGuessPageId());
});


socket.on('disconnect', function(){
	console.log("Disconnected");
});


/**
 * Receiving from server
 * 
 * Structure of input:
 * 
 * serializedObjects
 * [{
	 * 	 id: 34
	 * 	 className: 'Dog'
	 *	 HumanOwner: 'Human:23'
	 *	 property: "A string"
	 * }]
 * unsubscribedUpstreamIds
 * idToUpstreamId
 * events  [{action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }]
 */
socket.on('pushSubscriptionChanges', function(changes){
	liquid.pulse('upstream', function() {
		// Consolidate ids:
		for (id in result.idToUpstreamId) {
			liquid.getEntity(id)._upstreamId = result.idToUpstreamId[id];
		}
		
		unserializeFromUpstream(result.serializedObjects);

		liquid.blockUponChangeActions(function() {
			changes.events.forEach(function(event) {
				if (event.action === 'addingRelation') {
					var object = liquid.getUpstreamEntity(event.objectId);
					var relatedObject = liquid.getUpstreamEntity(event.relatedObjectId);
					var adderName = object._relationDefinitions[event.relationName].adderName;
					object[adderName](relatedObject);
				} else if (event.action === 'deletingRelation') {
					liquid.activeSaver = null;
					var object = liquid.getUpstreamEntity(event.objectId);
					var relatedObject = liquid.getUpstreamEntity(event.relatedObjectId);
					var removerName = object._relationDefinitions[event.relationName].removerName;
					object[removerName](relatedObject);
					liquid.activeSaver = liquid.defaultSaver;
				} else if (event.action === 'settingProperty') {
					liquid.activeSaver = null;
					var object = liquid.getUpstreamEntity(objectId);
					var setterName = object._propertyDefinitions[event.propertyName].setterName;
					object[setterName](newValue);
					liquid.activeSaver = liquid.defaultSaver;
				}
			});
		});
		// TODO: kill objects result.unsubscribedUpstreamIds, even remove from persistent memory if found, 
		// and create an "originators copy" of the data for safekeeping. 
	});
});


/**
 * Pushing to server
 * 
 * @param pulse
 */

liquid.pushDownstreamPulseToServer = function(pulse) {
	liquid.upstreamSocket.emit("pushDownstreamPulse", liquid.instancePage.getHardToGuessPageId(), pulse);
};