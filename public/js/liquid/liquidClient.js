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
 *                   Data pushing
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


function pushChange(change) {
	var changelist = [change];
	serializeChangelist(changelist);
	liquid.socket.emit("batchSave", liquid.hardToGuessPageId, 42, changelist); //42 is unused saver id
}

function serializeChangelist(changelist) {
	// Translate change from objects to entityIds. Do this as late as possible so that objects that change from a temporary id to a real one gets the right id in the save.
	changelist.forEach(function(change) {
		change.objectId = change.object._upstreamId;
		delete change.object;

		if (typeof(change.relation) !== 'undefined') {
			change.relationName = change.relation.qualifiedName;
			delete change.relation;
		}

		if (typeof(change.property) !== 'undefined') {
			change.propertyName = change.property.name;
			delete change.property;
		}

		if (typeof(change.relatedObject) !== 'undefined') {
			change.relatedObjectId = change.relatedObject._upstreamId;
			delete change.relatedObject;
		}

		if (typeof(change.previouslyRelatedObject) !== 'undefined') {
			change.previouslyRelatedObjectId = change.previouslyRelatedObject._upstreamId;
			delete change.previouslyRelatedObject;
		}
	});
}



/**--------------------------------------------------------------
*   Unserialization
*----------------------------------------------------------------*/

function unserializeReference(reference) {
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

function unserializeObject(serializedObject) {
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
				data = data.map(unserializeReference);
			} else {
				data = unserializeReference(data);
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


function unserialize(arrayOfSerialized) { // If optionalSaver is undefined it will be used to set saver for all unserialized objects.
	arrayOfSerialized.forEach(function(serialized) {
		unserializeObject(serialized);
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
