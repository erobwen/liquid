

//Socket_io is your front-end library you included before
var socket = io('http://localhost:8080');
liquid.upstreamSocket = socket;

socket.on('connect', function(){
	trace('serialize', "received CONNECT");
	trace('serialize', liquid.instancePage, " Page id:", liquid.instancePage.getHardToGuessPageId());
	socket.emit("registerPageId", liquid.instancePage.getHardToGuessPageId());
});


socket.on('disconnect', function(){
	trace('serialize', "Disconnected");
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
		for (id in changes.idToUpstreamId) {
			liquid.getEntity(id)._upstreamId = changes.idToUpstreamId[id];
		}
		console.log(changes);
		//result
		unserializeFromUpstream(changes.addedSerialized);

		liquid.blockUponChangeActions(function() {
			changes.events.forEach(function(event) {
				if (event.action === 'addingRelation') {
					var object = liquid.getUpstreamEntity(event.objectId);
					var relatedObject = liquid.getUpstreamEntity(event.relatedObjectId);
					var relation = object._relationDefinitions[event.relationName];
					if (relation.isSet) {
						object[relation.adderName](relatedObject);
					} else {
						object[relation.setterName](relatedObject);
					}
				} else if (event.action === 'deletingRelation') {
					liquid.activeSaver = null;
					var object = liquid.getUpstreamEntity(event.objectId);
					var relatedObject = liquid.getUpstreamEntity(event.relatedObjectId);
					var relation = object._relationDefinitions[event.relationName];
					if (relation.isSet) {
						object[relation.removerName](relatedObject);
					} else {
						object[relation.setterName](null);
					}
					liquid.activeSaver = liquid.defaultSaver;
				} else if (event.action === 'settingProperty') {
					liquid.activeSaver = null;
					var object = liquid.getUpstreamEntity(event.objectId);
					var setterName = object._propertyDefinitions[event.propertyName].setterName;
					object[setterName](event.newValue);
					liquid.activeSaver = liquid.defaultSaver;
				}
			});

			// TODO: kill objects changes.unsubscribedUpstreamIds, even remove from persistent memory if found,
			// and create an "originators copy" of the data for safekeeping. 
			for (upstreamId in changes.unsubscribedUpstreamIds) {
				var object = liquid.getUpstreamEntity(upstreamId);
				object.setIsLockedObject(true);
			}

		});
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


liquid.makeCallOnServer = function(callData) {
	console.log(callData);
	liquid.upstreamSocket.emit("makeCallOnServer", liquid.instancePage.getHardToGuessPageId(), callData);
}