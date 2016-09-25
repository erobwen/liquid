/**
 * General setup
 */

var liquid = {
	onServer : false,
	onClient: true
};

addCommonLiquidFunctionality(liquid);
addLiquidEntity(liquid);
addLiquidSelectionFunctionality(liquid);
addLiquidRepetitionFunctionality(liquid);




/**--------------------------------------------------------------
 *                   Object/Entity retreival
 *----------------------------------------------------------------*/


/**
* Find entity
*/
liquid.findLocalEntity = function(properties) {
	return liquid.findEntities(properties)[0];
}
liquid.find = liquid.findEntity;

liquid.findLocalEntities = function(properties) {
	var result = [];
	for (id in liquid.idObjectMap) {
		var object = liquid.idObjectMap[id];
		var failed = false;
		for (key in properties) {
			if (key === 'className') {
				failed = object.className !== properties[key];
			} else if (typeof(object._propertyInstances[key]) !== 'undefined') {
				failed = object._propertyInstances[key].data !== properties[key];
			} else {
				failed = true;
			}
			if (failed) {
				break;
			}
		}
		if (!failed) {
			result.push(object);
		}
	}
	return result;
}


/**--------------------------------------------------------------
 *              Push data upstream
 *----------------------------------------------------------------*/


// Form for events:
//  {action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
//  {action: deletingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
//  {action: addingRelation, objectDownstreamId:45, relationName: 'Foobar', relatedObjectDownstreamId:45 }
//  {action: settingProperty, objectDownstreamId:45, propertyName: 'Foobar', propertyValue: 'Some string perhaps'}
function serializeEventForUpstream(event) {
	console.log(event);
	var serialized  = {
		action: event.action
	};

	if (event.object._upstreamId !== null) {
		serialized.objectId = event.object._upstreamId;
	} else {
		serialized.objectDownstreamId = event.object._id;
	}

	if (event.definition.type === 'relation') {
		serialized.relationQualifiedName = event.definition.qualifiedName;

		if (typeof(event.relatedObject) !== 'undefined') {
			if (event.relatedObject._upstreamId !== null) {
				serialized.relatedObjectId = event.relatedObject._upstreamId;
			} else {
				serialized.relatedObjectDownstreamId = event.relatedObject._id;
			}
		}
	} else {
		serialized.propertyName = event.definition.name;
		serialized.newValue = event.newValue;
	}

	return serialized;
}

liquid.pushDataUpstream = function() {
	// console.log("Not yet!");
	// return;
	if (typeof(liquid.upstreamSocket) !== undefined) {
		// console.group("Consider push data upstream");

		// Find data that needs to be pushed upstream
		var requiredObjects = {};
		function addRequiredCascade(object, requiredObjects) {
			if (object._upstreamId === null && typeof(requiredObjects[object.id]) === 'undefined') {
				requiredObjects[object.id] = object;
				object.forAllOutgoingRelatedObjects(function(definition, instance, relatedObject) {
					addRequiredCascade(relatedObject);
				});
			}
		}

		liquid.activePulse.events.forEach(function(event) {
			var eventIsFromUpstream = liquid.activePulse.originator === 'upstream' && event.isDirectEvent;
			if (!eventIsFromUpstream) {
				trace('serialize', "processing event required objects");
				if (event.object._upstreamId !== null && event.action == 'addingRelation' && event.relatedObject._upstreamId === null) {
					addRequiredCascade(event.relatedObject, requiredObjects);
				}
			}
		});

		var serializedObjects = [];
		for(id in requiredObjects) {
			var serializedObject = liquid.serializeObject(requiredObjects[id], true);
			serializedObjects.push(serializedObject);
		}

		var serializedEvents = [];
		liquid.activePulse.events.forEach(function(event) {
			// console.log(event);
			var eventIsFromUpstream = liquid.activePulse.originator === 'upstream' && event.isDirectEvent;
			if (!event.redundant && !eventIsFromUpstream) {
				trace('serialize', "not from upstream");
				if (event.object._upstreamId !== null && typeof(event.definition) !== 'undefined' && !event.definition.clientOnly) {
					serializedEvents.push(serializeEventForUpstream(event));
				} else if (typeof(requiredObjects[event.object._id]) !== 'undefined') {
					serializedEvents.push(serializeEventForUpstream(event));
				}
			}
		});

		var pulse = {
			serializedEvents : serializedEvents,
			serializedObjects : serializedObjects
		};

		if (pulse.serializedEvents.length > 0 || pulse.serializedObjects.length > 0) {
			trace('serialize', "Push upstream:");
			console.log(pulse);
			if (typeof(liquid.pushDownstreamPulseToServer) !== 'undefined') {
				liquid.pushDownstreamPulseToServer(pulse);
			}
		}

		// console.groupEnd();
	}
};



/**--------------------------------------------------------------
*            Unserialization from upstream
*----------------------------------------------------------------*/

function unserializeUpstreamReference(reference) {
	if (reference === null) {
		return null;
	}
	var fragments = reference.split(":");
	var className = fragments[0];
	var id = parseInt(fragments[1]);
	return ensureEmptyObjectExists(id, className);
}

function ensureEmptyObjectExists(upstreamId, className) {
	if (typeof(liquid.upstreamIdObjectMap[upstreamId]) === 'undefined') {
		var newObject = liquid.createClassInstance(className);
		newObject._upstreamId = upstreamId;
		liquid.upstreamIdObjectMap[upstreamId] = newObject;
		newObject._ = newObject.__();
		newObject.setIsPlaceholderObject(true);
		// newObject._noDataLoaded = true;
	}
	return liquid.upstreamIdObjectMap[upstreamId];
}

function unserializeUpstreamObject(serializedObject) {
	// console.log("unserializeObject: " + serializedObject.className);
	// console.log(serializedObject);
	var upstreamId = serializedObject.id;
	if (typeof(liquid.upstreamIdObjectMap[upstreamId]) === 'undefined') {
		ensureEmptyObjectExists(upstreamId, serializedObject.className);
	}
	var targetObject = liquid.upstreamIdObjectMap[upstreamId];
	// console.log(targetObject);
	if (targetObject.getIsPlaceholderObject()) {
		targetObject.forAllOutgoingRelations(function(definition, instance) {
			// console.log("processingRelation: " + definition.name);
			trace('unserialize', definition.name, "~~>", targetObject);
			if (typeof(serializedObject[definition.qualifiedName]) !== 'undefined') {
				var data = serializedObject[definition.qualifiedName];
				if (definition.isSet) {
					data = data.map(unserializeUpstreamReference);
				} else {
					data = unserializeUpstreamReference(data);
				}
				targetObject[definition.setterName](data);
			}
		});
		for (propertyName in targetObject._propertyDefinitions) {
			definition = targetObject._propertyDefinitions[propertyName];
			// console.log("processingProperty: " + definition.name);
			trace('unserialize', definition.name, "~~>", targetObject);
			if (typeof(serializedObject[definition.name]) !== 'undefined') {
				var data = serializedObject[definition.name];
				targetObject[definition.setterName](data);
			}
		}
		targetObject.setIsPlaceholderObject(false);
		targetObject._ = targetObject.__();
	} else {
		trace('unserialize', "Loaded data that was already loaded!!!");
		// console.log("Loaded data that was already loaded!!!");
	}
}


function unserializeFromUpstream(arrayOfSerialized) { // If optionalSaver is undefined it will be used to set saver for all unserialized objects.
	liquid.allUnlocked++;
	arrayOfSerialized.forEach(function(serialized) {
		trace('unserialize', "unserializeFromUpstream: ", serialized.id);
		// console.log("unserializeFromUpstream: " + serialized.id);
		unserializeUpstreamObject(serialized);
	});
	if (typeof(liquid.instancePage) !== 'undefined') {
		liquid.instancePage.upstreamPulseReceived();
	}
	liquid.allUnlocked--;
}



		// consolidateIds : function(temporaryEntityIdToEntityIdMap) {
		// 	// console.groupCollapsed("Consolidating ids");
		// 	if (!isArray(temporaryEntityIdToEntityIdMap)) {
		// 		for(var tempId in temporaryEntityIdToEntityIdMap) {
		// 			// console.log("Found id to consolidate");
		// 			// console.log(tempId);
		//
		// 			var entityId = temporaryEntityIdToEntityIdMap[tempId];
		// 			// console.log(entityId);
		//
		// 			// Replace in object self
		// 			var entity = getEntity(tempId);
		// 			entity.entityId = entityId;
		// 			// console.log(entity);
		//
		// 			// Replace in idObjectMap
		// 			liquid.idObjectMap[entityId] = entity;
		// 			delete liquid.idObjectMap.tempId;
		// 		}
		// 	} else {
		// 		// console.log("Nothing to consolidate");
		// 	}
		// 	// console.groupEnd();
		// },
		

// function removeRedundantSessionChanges(changeList, event) {
// 	var newList = [];
// 	changeList.forEach(function(loggedEvent) {
// 		if (loggedEvent.entity == event.entity && loggedEvent.relationOrProperty == event.relationOrProperty) {
// 			// Skip this event
// 		} else {
// 			newList.push(loggedEvent);
// 		}
// 	});
// 	return newList;
// }



/**
* Setup default saver
*/

/**--------------------------------------------------------------
 * Some public interface
 *----------------------------------------------------------------*/


console.log("");console.log("=== Liquid Object: ===");
console.log(liquid);




window.find = liquid.find;

window.uponChangeDo = liquid.uponChangeDo;
window.repeatOnChange = liquid.repeatOnChange;

window.create = liquid.create;

window.getEntity = liquid.getEntity;
window.getUpstreamEntity = liquid.getUpstreamEntity;
window.getPersistentEntity = liquid.getPersistentEntity;
window.getGlobalEntity = liquid.getGlobalEntity;

window.registerClass = liquid.registerClass;

window.liquid = liquid;
