/**
 * General setup
 */

var liquid = {
	onServer : false
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

function changesOriginateFromServer() {
	return changesOriginateFromServerNesting > 0;
}

var changesOriginateFromServerNesting = 0;


liquid.withoutPushingToServer = function(action) {
	changesOriginateFromServerNesting++
	action();
	changesOriginateFromServerNesting--
};

// Form for events:
//  {action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
//  {action: deletingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
//  {action: addingRelation, objectDownstreamId:45, relationName: 'Foobar', relatedObjectDownstreamId:45 }
//  {action: settingProperty, objectDownstreamId:45, propertyName: 'Foobar', propertyValue: 'Some string perhaps'}
function serializeEventForUpstream(event) {
	var serialized  = {
		action: event.action
	};

	if (event.object._upstreamId !== null) {
		serialized.objectId = event.object._upstreamId;
	} else {
		serialized.objectDownstreamId = event.object._id;
	}

	if (event.definition.type === 'relation') {
		serialized.relationName = event.definition.qualifiedName;

		if (typeof(event.relatedObject) !== 'undefined') {
			if (event.relatedObject._upstreamId !== null) {
				serialized.relatedObjectId = event.relatedObject._upstreamId;
			} else {
				serialized.relatedObjectDownstreamId = event.relatedObject._id;
			}
		}
	} else {
		serialized.propertyName = event.definition.name;
		serialized.value = event.value;
	}

	return serialized;
}

liquid.pushDataUpstream = function() {
	if (typeof(liquid.upstreamSocket) !== undefined) {
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
				var requiredObjects = {};
				if (event.object._upstreamId !== null && event.action == 'addingRelation' && event.relatedObject._upstreamId === null) {
					addRequiredCascade(event.relatedObject, requiredObjects);
				}
			}
		});

		var downstreamIdToSerializedObjectMap = [];
		for(id in requiredObjects) {
			var serializedObject = serializeObject(requiredObjects[id], true);
			downstreamIdToSerializedObjectMap[serializedObject.downstreamId] = serializedObject;
		}

		var serializedEvents = [];
		liquid.activePulse.events.forEach(function(event) {
			var eventIsFromUpstream = liquid.activePulse.originator === 'upstream' && event.isDirectEvent;
			if (!event.redundant && !eventIsFromUpstream) {
				if (event.object._upstreamId !== null) {
					serializedEvents.push(serializeEventForUpstream(event));
				} else if (typeof(requiredObjects[event.object._id]) !== 'undefined') {
					serializedEvents.push(serializeEventForUpstream(event));
				}
			}
		});

		var pulse = {
			serializedEvents : serializedEvents,
			downstreamIdToSerializedObjectMap : downstreamIdToSerializedObjectMap
		};
		liquid.upstreamSocket.emit("pushDownstreamPulse", liquid.hardToGuessPageId, pulse); //42 is unused saver id
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
		newObject.noDataLoaded = true;
		liquid.upstreamIdObjectMap[upstreamId] = newObject;
		newObject._ = newObject.__();
	}
	return liquid.upstreamIdObjectMap[upstreamId];
}

function unserializeUpstreamObject(serializedObject) {
	// console.log("unserializeObject");
	// console.log(serializedObject);
	var upstreamId = serializedObject.id;
	if (typeof(liquid.upstreamIdObjectMap[upstreamId]) === 'undefined') {
		ensureEmptyObjectExists(upstreamId, serializedObject.className);
	}
	var targetObject = liquid.upstreamIdObjectMap[upstreamId];
	// console.log(targetObject);
	if (targetObject.noDataLoaded) {
		targetObject.forAllOutgoingRelations(function(definition, instance) {
			var data = serializedObject[definition.name];
			if (definition.isSet) {
				data = data.map(unserializeUpstreamReference);
			} else {
				data = unserializeUpstreamReference(data);
			}
			liquid.withoutPushingToServer(function() {
				targetObject[definition.setterName](data);
			});
		});
		for (propertyName in targetObject._propertyDefinitions) {
			definition = targetObject._propertyDefinitions[propertyName];
			var data = serializedObject[definition.name];
			liquid.withoutPushingToServer(function() {
				targetObject[definition.setterName](data);
			});
		}
		targetObject.noDataLoaded = false;
		targetObject._ = targetObject.__();
	} else {
		console.log("Loaded data that was already loaded!!!");
	}
}


function unserializeFromUpstream(arrayOfSerialized) { // If optionalSaver is undefined it will be used to set saver for all unserialized objects.
	arrayOfSerialized.forEach(function(serialized) {
		unserializeUpstreamObject(serialized);
	});
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


console.log("Liquid Object:");
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
