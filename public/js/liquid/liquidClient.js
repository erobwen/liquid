/**
 * General setup
 */

var liquid = {
	onServer : false
};

addCommonLiquidFunctionality(liquid);
addLiquidSelectionFunctionality(liquid);
addLiquidRepetitionFunctionality(liquid);




/**--------------------------------------------------------------
 *                   Object/Entity retreival
 *----------------------------------------------------------------*/

/**
 * Setup temp id
 */
liquid.nextTemporaryId = 0;
liquid.getTemporaryId = function(className) {
	return className + ".temporaryId=" + liquid.nextTemporaryId;
};



/**
 * Get entity
 */
liquid.getEntity = function(entityId) {
	return liquid.idObjectMap[entityId];
};

/**
* Find entity
*/
liquid.findEntity = function(properties) {
	return liquid.findEntities(properties)[0];
}
liquid.find = liquid.findEntity;

liquid.findEntities = function(properties) {
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
		change.objectId = change.object.id;
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
			change.relatedObjectId = change.relatedObject.id;
			delete change.relatedObject;
		}

		if (typeof(change.previouslyRelatedObject) !== 'undefined') {
			change.previouslyRelatedObjectId = change.previouslyRelatedObject.id;
			delete change.previouslyRelatedObject;
		}
	});
}



/**--------------------------------------------------------------
*                   Detailed Observation
*
* Detailed observation ignores mirror relations. Therefore all 
* Events in detailed obervation are unique, and can be used to 
* Save data, transmitt changes to peers etc. 
*----------------------------------------------------------------*/

/***
 * Relations
 */
liquid.notifyAddingRelation = function(object, definition, instance, relatedObject){
	console.log("notifyAddingRelation: (" + object._  + ")." + definition.name + " ... " + (liquid.activeSaver !== null ? "with saver!" : "no saver!"));
	if (!changesOriginateFromServer()) {
		pushChange({type: 'addingRelation', object: object, relation: definition, relatedObject: relatedObject});
	}
	liquid.observersDirty(instance.observers);
};

liquid.notifyDeletingRelation = function(object, definition, instance, relatedObject) {
	console.log("notifyDeletingRelation: (" + object._  + ")." + definition.name + " ... " + (liquid.activeSaver !== null ? "with saver!" : "no saver!"));
	if (!changesOriginateFromServer()) {
		pushChange({type: 'deletingRelation', object: object, relation: definition, relatedObject: relatedObject});
	}
	liquid.observersDirty(instance.observers);
};


/***
 * Properties
 */
liquid.notifySettingProperty = function(object, propertyDefinition, propertyInstance, newValue, oldValue) {
	console.log("notifySettingProperty: (" + object._  + ")." + propertyDefinition.name + " = " + newValue + ", " + (liquid.activeSaver !== null ? "with saver!" : "no saver!"));
	if (!changesOriginateFromServer()) {
		pushChange({type: 'settingProperty', object: object, property: propertyDefinition, newValue: newValue, oldValue: oldValue});
	}
	liquid.observersDirty(propertyInstance.observers);
}



/**--------------------------------------------------------------
*   Unserialization
*----------------------------------------------------------------*/

function unserializeReference(reference) {
	var fragments = reference.split(":");
	var className = fragments[0];
	var id = parseInt(fragments[1]);
	return ensureEmptyObjectExists(id, className);
}

function ensureEmptyObjectExists(id, className) {
	if (typeof(liquid.idObjectMap[id]) === 'undefined') {
		var newObject = liquid.createClassInstance(className);
		newObject.id = id;
		newObject.noDataLoaded = true;
		liquid.idObjectMap[id] = newObject;
	}
	return liquid.idObjectMap[id];
}

function unserializeObject(serializedObject) {
	// console.log("unserializeObject");
	// console.log(serializedObject);
	var id = serializedObject.id;
	var idObjectMap = liquid.idObjectMap;
	if (typeof(idObjectMap[id]) === 'undefined') {
		ensureEmptyObjectExists(id, serializedObject.className);
	}
	var targetObject = idObjectMap[id];
	// console.log(targetObject);
	if (targetObject.noDataLoaded) {
		for (relationName in targetObject._relationDefinitions) {
			var definition = targetObject._relationDefinitions[relationName];
			if (!definition.isReverseRelation) {
				// console.log(definition);
				var data = serializedObject[definition.name];
				// console.log(data);
				if (definition.isSet) {
					data = data.map(unserializeReference);
				} else {
					data = unserializeReference(data);
				}
				liquid.withoutPushingToServer(function() {
					targetObject[definition.setterName](data);
				});
			}
		}
		for (propertyName in targetObject._propertyDefinitions) {
			definition = targetObject._propertyDefinitions[propertyName];
			var data = serializedObject[definition.name];
			liquid.withoutPushingToServer(function() {
				targetObject[definition.setterName](data);
			});
		}
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
window.createEntity = liquid.createEntity;
window.getEntity = liquid.getEntity;
window.registerClass = liquid.registerClass;

window.liquid = liquid;
