/**
* Util
*/
function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
}



var liquid = {};
liquid.onServer = false;

//open up socket.io somehow!

// io.socket.on('connect', function() {
	// io.socket.on('dataChanged', function(transaction) {
		// liquid....
	// });
// });

addCommonLiquidFunctionality(liquid);
addLiquidSelectionFunctionality(liquid);
addLiquidRepetitionFunctionality(liquid);


function registerClass(schema) {
	liquid.registerClass(schema);
}


/**
* Setup temp id
*/
liquid.nextTemporaryId = 0;	
liquid.getTemporaryId = function(className) {
	return className + ".temporaryId=" + liquid.nextTemporaryId;
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


/**
* Create entity
*/
liquid.createEntity = function(className, initData) {
	var object = { className: className, entityId: liquid.getTemporaryId(className) };
	liquid.idObjectMap[object.entityId] = object;
	
	object.addProperty = function(name, defaultValue, details) {
		object[name] = defaultValue; // Both on client and server
		object['set' + liquid.capitaliseFirstLetter(name)] = function(value) {
			object[name] = value;	
		};
		// object['get' + liquid.capitaliseFirstLetter(name)] = function() {
			// return object[name];	
		// }
	};
	
	object.addRelation = function(name, cardinality, details) {
		if (cardinality === "toOne") {
			object[name] = null; // Only use on client side when we know the data is loaded. 			
			object['set' + name] = function(value) {
				object[name] = value;	
			}			
		} else {
			object[name] = []; // Only use on client side when we know the data is loaded. 
			object['add' + name] = function(related) {
				object[name].push(related);
			}		
			object['remove' + name] = function(action) {
				// object[name].push(related); TODO: remove from array
			}			
		}
	};
	
	liquid.addPropertiesAndRelationsRecursivley(liquid.classRegistry[className], object);
	delete object.addProperty;
	delete object.addRelation;
	liquid.addClassMethods(object);

	liquid.activeSaver.created(object); // addEvent instead!
	
	object.init(initData);
	
	liquid.activeSaver.initialized(object);  // addEvent instead!
		
	return object;
};
		
liquid.isLoadingFromQueue = false;
liquid.loadingQueue = [];
		
liquid.loadUrgent = function(object, extent, postLoadCallback) {
	// console.log("Loading urgently ...");		
	liquid.performLoad(object, extent, postLoadCallback);
};
	
liquid.checkLoadQueue = function () {
	// console.log("Check load queue")
	// console.log(liquid.loadingQueue);
	var errorCallback = function() {
		liquid.checkLoadQueue();
	};
	if (liquid.loadingQueue.length > 0) {
		// console.log("Finished loading, now loading a queued load ...");
		var loadRequest = liquid.loadingQueue.shift();
		liquid.isLoadingFromQueue = true;
		liquid.performLoad(loadRequest.object, loadRequest.extent, loadRequest.postLoadCallback, errorCallback);
	} else {
		// console.log("Loading queue is now empty.");
		liquid.isLoadingFromQueue = false;
	}		
};
	
liquid.applyServerChangeList = function(changeList) {
	console.groupCollapsed("Apply server changeList");
	console.log(changeList);

	changeList.forEach(function(change) {
		console.log(change);
		// TODO: Handle create and initialized. 
		if (typeof(liquid.idObjectMap[change.entityId]) !== 'undefined') {
			entity = getEntity(change.entityId);
			var relationOrProperty = change['relationOrProperty'];
			var isRelation = relationOrProperty[0] === relationOrProperty[0].toUpperCase(); 

			if (isRelation) {
				if (isArray(change.value)) {
					// console.log("Here");
					// console.log(object);
					// console.log(value);
					relatedEntities = [];
					change.value.forEach(function(entityId) {
						relatedEntities.push(getEntity(entityId));
					});
					change.value = relatedEntities;
				} else {
					change.value = getEntity(value);				
				}
			}
			
			entity[relationOrProperty] = change.value;
			console.log(entity);
		}
	});
	console.groupEnd();
};
	
liquid.callOnServer = function(object, method, postCallCallback) { // TODO: an arglist
	var message = {entityId: object.entityId, method: method};

	console.groupCollapsed("call on server initiate");
	console.log(message);
	console.groupEnd();
	$.ajax({
		data: message,
		dataType:"html",
		success:function (text, textStatus) {
			try {
				changeList = JSON.parse(text);
				console.groupCollapsed("call on server consolidate");
				console.log(changeList);
				console.groupEnd();
				globalAngularScope.$apply(function() {
					liquid.applyServerChangeList(changeList);
					postCallCallback();
				});
			} catch(error) {
				if (typeof(errorCallback) !== 'undefined') {
					errorCallback();
				}
				console.log(error);
				console.log("Error in liquid call!" + method);
				// debugger;
			}
		},
		fail: function(text, textStatus) {  },
		type: "post",
		url:"\/liquid\/call\/"
	});
};
		
liquid.load = function(object, extent, postLoadCallback) {
	// console.log("load");
	// console.log(liquid.isLoadingFromQueue);
	// console.log(liquid.loadingQueue);
	var postLoadCallbackWithLoad = function(entity) {
		postLoadCallback(entity);
		liquid.checkLoadQueue();
	};
	var errorCallback = function() {
		liquid.checkLoadQueue();
	};
	if (liquid.isLoadingFromQueue) {
		liquid.loadingQueue.push({object: object, extent: extent, postLoadCallback: postLoadCallbackWithLoad});
		// console.log("Queuing load " + extent + " for entity " + object.entityId + ".");
	} else {
		liquid.isLoadingFromQueue = true;
		liquid.performLoad(object, extent, postLoadCallbackWithLoad, errorCallback);
	}
};
	
liquid.batchLoadUrgent = function(requiredLoadings, postLoadCallback) {
	console.log("Batch load initiate");
	console.log(requiredLoadings);
			
	if (requiredLoadings.length > 0) {
		var entityIdsAndExtents = {};
		var count = 0;
		requiredLoadings.forEach(function(loading) {
			if (typeof(loading.object.loadTags[loading.extent]) === 'undefined') {
				loading.object.loadTags[loading.extent] = true;
				entityIdsAndExtents[loading.object.entityId] = loading.extent;
				count++;
			}
		});
		console.log(entityIdsAndExtents);
		
		if (count > 0) {
			$.ajax({
				data: { entityIdsAndExtents : entityIdsAndExtents },
				dataType:"html",
				success:function (text, textStatus) {
					try {
						data = JSON.parse(text);
						globalAngularScope.$apply(function() {
							console.log("Batch load consolidate");
							console.log(data);
							// console.log("= unserializing " + extent + " for entity " + object.entityId + " =");
							data.forEach(function(loadedObject) {
								unserialize(loadedObject);
							});
							if (typeof(postLoadCallback) != 'undefined' && postLoadCallback != null) {
								postLoadCallback();
							}
							// console.log("=== finished loading " + extent + " for entity " + object.entityId + " ===");
						});

					} catch(error) {
						console.log(error);
						// if (typeof(errorCallback) !== 'undefined') {
							// errorCallback();
						// }
						console.log(arguments);
						console.log("Error in liquid load!");
					}
				},
				fail: function(text, textStatus) {  },
				type: "post",
				url:"\/liquid\/batch_load\/"
			});
		} else {
			if (typeof(postLoadCallback) != 'undefined' && postLoadCallback != null) {
				postLoadCallback();
			}
		}
	} else {
		if (typeof(postLoadCallback) != 'undefined' && postLoadCallback != null) {
			postLoadCallback();
		}
	}
};


liquid.performLoad = function(object, extent, postLoadCallback, errorCallback) {
	if (typeof(object.loadTags[extent]) != 'undefined') {
		if (typeof(postLoadCallback) != 'undefined' && postLoadCallback != null) {
			postLoadCallback(object);
		}
		// if (typeof(errorCallback) !== 'undefined') {
			// errorCallback();
		// }
		return;
	} else {
		object.loadTags[extent] = true;
	}
	
	// console.log("=== loading select" + extent + " for entity " + object.entityId + " ===");
	// console.log(object);
	$.ajax({
		data: null,
		dataType:"html",
		success:function (text, textStatus) {
			try {
				data = JSON.parse(text);
				// console.log(data);
				globalAngularScope.$apply(function() {
					// console.log("= unserializing " + extent + " for entity " + object.entityId + " =");
					unserialize(data);
					if (typeof(postLoadCallback) != 'undefined' && postLoadCallback != null) {
						postLoadCallback(object);
					}
					// console.log("=== finished loading " + extent + " for entity " + object.entityId + " ===");
				});

			} catch(error) {
				console.log(error);
				if (typeof(errorCallback) !== 'undefined') {
					errorCallback();
				}
				console.log(arguments);
				console.log("Error in liquid load!");
			}
		},
		fail: function(text, textStatus) {  },
		type: "get",
		url:"\/liquid\/load\/" + object.entityId + "\/" + extent
	});
};

liquid.initializeliquidObject = function(object) {
	object.loadUrgent = function(extent, postLoadCallback, errorCallback) {
		liquid.loadUrgent(object, extent, postLoadCallback);
	};
	
	object.load = function(extent, postLoadCallback) {
		liquid.load(object, extent, postLoadCallback);
	};
};

	
	
liquid.storeLoadValues = function(object) {
	object.loadValues = {};
	for(var property in object) {
		liquid.storeLoadValue(object, property);
	}
},

liquid.storeLoadValue = function(object, property) {
	if (typeof(object[property]) !== 'function') {
		if (!inArray(property, ['loadValues', 'lastChanges', 'loaded', 'className', 'phpEntityClass', 'entityId'])) {
			// Store load value
			var value = object[property];
			var newValue = null;
			if (isArray(value)) {
				var newValue = [];
				value.forEach(function(element) {
					newValue.push(element);
				});
			} else {
				newValue = value;
			}
			object.loadValues[property] = newValue;
		}
	}
},

liquid.initializeLastChanges = function(object, property) {
	if (typeof(object.lastChanges) === 'undefined') {
		object.lastChanges = {};
	}
	if (typeof(object.loadTags) === 'undefined') {
		object.loadTags = {};
	}
	var lastChanges = object.lastChanges;

	if (!inArray(property, ['loadValues', 'lastChanges', 'loaded', 'className', 'phpEntityClass', 'entityId'])) {
		// Initialize last changes
		// if (object.entityId == "EnterValueActivity.id=3"  && property == 'value') {
			// console.log("initializing value");
			// console.log(lastChanges[property]);
			// console.log(typeof(lastChanges[property]));
			// console.log(typeof(lastChanges[property]) === 'undefined');
			// debugger;
		// }
		if(typeof(lastChanges[property]) === 'undefined') {
			lastChanges[property] = null;
			// if (object.entityId == "EnterValueActivity.id=3"  && property == 'value') {
				// console.log("nullify!");
			// }
		}
	}
},

liquid.callPostLoadFunction = function(input, idObjectMap, visited) {
	if (typeof(visited[input]) === 'undefined') {
		visited[input] = true;
		
		// console.log(input.className);
		if (input !== null) {
			if (Array.isArray(input)) {
				input.forEach(function(element) {
					liquid.callPostLoadFunction(element, idObjectMap, visited);
				});
			} else if (typeof(input) === 'object') {
				var replacement = idObjectMap[input.entityId]; // This could be entity or replacement
				
				if (replacement.wasLoadedNow) {
					replacement.postLoad();
				}
				delete replacement.wasLoadedNow;
				
				if (input.loaded) {
					for (var property in input) {
						if (property[0].toUpperCase() === property[0]) {
							// A relation
							liquid.callPostLoadFunction(input[property], idObjectMap, visited);
							// if (input.className == "StandardProject" && property == "Release") {
								// console.log(replacement[property]);
							// }
						}
					}
				}
			}
		}
	}
}

liquid.loadSingleRelation = function(object, definition, instance) {
	if (!instance.isLoaded) {
		// TODO: Set up an asynchronous loading event.
		return null;
	}
};

liquid.ensureIncomingRelationLoaded = function(object, incomingRelationNameQualifiedName) { //QualifiedName?
	if (typeof(object._reverseRelations[incomingRelationNameQualifiedName]) !== 'undefined') {
		var reverseRelation = object._reverseRelations[incomingRelationNameQualifiedName];
		
		// TODO: Setup asynchrnonous loading event for this reverse relation
	}
};
	
liquid.loadSetRelation = function(object, definition, instance) {
	if (!instance.isLoaded) {
		// TODO: Set up an asynchronous loading event.
		return [];
	}
};



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
	if (liquid.activeSaver !== null) {
		liquid.activeSaver.addEvent({type: 'addingRelation', object: object, relation: definition, relatedObject: relatedObject});
	}
	liquid.observersDirty(instance.observers);
};

liquid.notifyDeletingRelation = function(object, definition, instance, relatedObject) {
	console.log("notifyDeletingRelation: (" + object._  + ")." + definition.name + " ... " + (liquid.activeSaver !== null ? "with saver!" : "no saver!"));
	if (liquid.activeSaver !== null) {
		liquid.activeSaver.addEvent({type: 'deletingRelation', object: object, relation: definition, relatedObject: relatedObject});
	}
	liquid.observersDirty(instance.observers);
};


/***
 * Properties
 */
liquid.notifySettingProperty = function(object, definition, instance, newValue, oldValue) {
	console.log("notifySettingProperty: (" + object._  + ")." + definition.name + " = " + newValue + ", " + (liquid.activeSaver !== null ? "with saver!" : "no saver!"));
	if (liquid.activeSaver !== null) {
		liquid.activeSaver.addEvent({type: 'settingProperty', object: object, property: definition, newValue: newValue, oldValue: oldValue});
	}
	liquid.observersDirty(instance.observers);
}


/**--------------------------------------------------------------
* Some public interface
*----------------------------------------------------------------*/
	
	
console.log("Liquid Object:");
console.log(liquid);


// An alternative to explicitly set the saver when doing an operation. Otherwise the object beeing manipulated first will define what saver is used. 
function useSaver(saver, changeCallback) {
	if (liquid.activeSaver !== liquid.defaultSaver) {
		alert("useSaver cannot be called again recursivley inside useSaver!");
	}
	liquid.activeSaver = saver;
	changeCallback();
	liquid.activeSaver = liquid.defaultSaver;
}

liquid.getEntity = function(entityId) {
	return liquid.idObjectMap[entityId];	
}

function getEntity(entityId) {
	return liquid.idObjectMap[entityId];
}

function createEntity(liquidClass, initData, saver) {
	return liquid.createEntity(liquidClass, initData, saver);
}


/**--------------------------------------------------------------
*   Unserialization
*----------------------------------------------------------------*/

function createAndSetupNewObjects(serializedObject, idObjectMap, objectsWithNewRelationInfo) {
	if (typeof(serializedObject) === 'object') {
		var objectTransferedTo = null;
		if (typeof(idObjectMap[serializedObject.id]) === 'undefined') {
			// Object with this id has never been seen before .loaded
			var newObject = liquid.createClassInstance(serializedObject.className);
			newObject.id = serializedObject.id;
			// console.log("Created:");
			// console.log(newObject);
			
			idObjectMap[serializedObject.id] = newObject;
			
			// Make a note that this object needs 
			if (!serializedObject.noDataLoaded) {
				objectsWithNewRelationInfo.push(serializedObject);
			}
			objectTransferedTo = newObject;
		} else if (!serializedObject.noDataLoaded) { //idObjectMap[serializedObject.id].noDataLoaded && 
			// Object has been seen but not loaded, setup again to remove unloaded dummy functions. 
			var existingObject = idObjectMap[serializedObject.id];
			existingObject.noDataLoaded = false;
			
			// Make a note that this object needs 
			objectsWithNewRelationInfo.push(serializedObject);
			objectTransferedTo = existingObject;
		}
		
		// Transfer properties. If object not already loaded 
		if (objectTransferedTo !== null) {
			for (var propertyName in objectTransferedTo._propertyDefinitions) {
				var propertyInstance = objectTransferedTo._propertyInstances[propertyName];
				if (!serializedObject.noDataLoaded &&typeof(serializedObject._properties[propertyName]) !== 'undefined') {
					propertyInstance.data = serializedObject._properties[propertyName];
					// TODO: Transfer history
				} else {
					var propertyDefinition = objectTransferedTo._propertyDefinitions[propertyName];
					propertyInstance.data = propertyDefinition.defaultValue;
				}
			}
			objectTransferedTo._ = objectTransferedTo.getObjectSignum();			
		}
		
		// Recursivley create and setup objects
		for (relationName in serializedObject._relations) {
			var relationData = serializedObject._relations[relationName];
			if (relationData === null) {
				continue;
			} else if (isArray(relationData)) {
				// Dense array
				relationData.forEach(function(relatedSerializedObject) {
					createAndSetupNewObjects(relatedSerializedObject, idObjectMap, objectsWithNewRelationInfo);
				});
			} else if (typeof(relationData) === 'object') {
				if (typeof(relationData.id) !== 'undefined') {
					// Single relation object
					createAndSetupNewObjects(relationData, idObjectMap, objectsWithNewRelationInfo);
				} else {
					// Sparse array
					for (index in relationData) {
						createAndSetupNewObjects(relationData[index], idObjectMap, objectsWithNewRelationInfo);
					}
				}
			} else {
				// A single relation id.
			}
		}
	}
}

function idOrObjectToObject(idOrObject, idObjectMap) {
	if (typeof(idOrObject) === 'object') {
		return idObjectMap[idOrObject.id];
	} else {
		return idObjectMap[idOrObject];
	}
}

// function isRelationLoaded

function setupIncomingAndOutgoingRelations(object, relatedObject, relationDefinition, relationInstance) {
	if (relationDefinition.isReverseRelation) {
		liquid.addIncomingRelationOnLoad(object, relationDefinition.incomingRelationQualifiedName, relatedObject);
		liquid.addOutgoingRelationOnLoad(relatedObject, relationDefinition.incomingRelationQualifiedName, object);
	} else {
		liquid.addIncomingRelationOnLoad(relatedObject, relationDefinition.qualifiedName, object);					
	}
}


function transferRelationInfo(serializedObject, idObjectMap) {
	// console.log("Transfer relation for id:" + serializedObject.id);
	// console.log(idObjectMap);
	var targetObject = idObjectMap[serializedObject.id];
	// Recursivley create and setup objects
	for (relationName in serializedObject._relations) {
		var relationData = serializedObject._relations[relationName];
		var targetDefinition = targetObject._relationDefinitions[relationName];
		var targetInstance = targetObject._relationInstances[relationName];
		if(!targetInstance.isLoaded) {
			if (relationData === null) {
				targetInstance.data = null;
				targetInstance.isLoaded = true;				
			} else if (isArray(relationData)) {
				// Dense array
				targetInstance.data = [];
				relationData.forEach(function(relatedSerializedObject) {
					var relatedObject = idOrObjectToObject(relatedSerializedObject, idObjectMap);
					targetInstance.data.push(relatedObject);
					setupIncomingAndOutgoingRelations(targetObject, relatedObject, targetDefinition, targetInstance);
				});
				targetInstance.isLoaded = true;
				// No need to trigger sort, should be sorted already
			} else if (typeof(relationData) === 'object') {
				if (typeof(relationData.id) !== 'undefined') {
					// Single relation object
					var relatedObject = idOrObjectToObject(relationData, idObjectMap);
					targetInstance.data = relatedObject;
					setupIncomingAndOutgoingRelations(targetObject, relatedObject, targetDefinition, targetInstance);
					targetInstance.isLoaded = true;
				} else {
					// Sparse array
					targetInstance.data = {};
					for (index in relationData) {
						var relatedObject = idOrObjectToObject(relationData[index], idObjectMap);
						targetInstance.data[index] = relatedObject;
						setupIncomingAndOutgoingRelations(targetObject, relatedObject, targetDefinition, targetInstance);
					}
					targetInstance.isLoaded = false; // Is only partially loaded
				}
			} else {
				// A single relation id.
				var relatedObject = idObjectMap[relationData];
				targetInstance.data = relatedObject;
				setupIncomingAndOutgoingRelations(targetObject, relatedObject, targetDefinition, targetInstance);
				targetInstance.isLoaded = true;
			}
		}
	}
}


function unserialize(arrayOfSerialized) { // If optionalSaver is undefined it will be used to set saver for all unserialized objects.
	var objectsWithNewRelationInfo = []
	arrayOfSerialized.forEach(function(serialized) {
		createAndSetupNewObjects(serialized, liquid.idObjectMap, objectsWithNewRelationInfo);
	});
	objectsWithNewRelationInfo.forEach(function(serialized) {
		transferRelationInfo(serialized, liquid.idObjectMap);
	});	
	var result = [];
	arrayOfSerialized.forEach(function(serialized) {
		result.push(liquid.idObjectMap[serialized.id]);
	});
	return result;
}



/**--------------------------------------------------------------
* Saver creation
*----------------------------------------------------------------*/

var nextSaverId = 1;
liquid.saverMap = {};
function createSaver(name) {
	// console.log("createSaver");
	// if (typeof(liquid.saverMap) === 'undefined') {
		// liquid.saverMap = {};
	// }
	// console.log(nextSaverId);
	// var saverId = nextSaverId;
	// nextSaverId++;
	var saver = {
		id : nextSaverId++,
		name : name,
		autosave : false,
		autosaveDelay : 0, // 3000 for three seconds. 
		waitingToAutosave: false,
		allChangesSaved : true, 
		savingChanges : 0,
		changeList : [],
		postSaveEvents : [],
				
		save : function() {			
			// saver.updateLoadValues();
		
			saver.serializeChangelist();

			// console.groupCollapsed("Saving initiate");
			// console.log(saver.changeList);
			// console.groupEnd();
			
			// console.log("Saving " + saver.name);
			// console.log();
			liquid.socket.emit("batchSave", liquid.hardToGuessPageId, saver.id, saver.changeList); //
			saver.savingChanges++;
			saver.changeList = [];
			// clearArray(saver.changeList);
			// console.log(saver.changeList);
			// console.log(saver);
		},
		
		addEvent : function(event) {
			saver.allChangesSaved = false;
			// {type: 'modify', 'entity': object, 'relationOrProperty':relationOrProperty, 'value':value};

			// saver.changeList = removeRedundantSessionChanges(saver.changeList, event);
			saver.changeList.push(event);
			// console.log("Current changeList for " + saver.name + ":");
			// console.log(saver.changeList);
			saver.checkAutosave();
		},
		// created : function(object) {
			// var newEvent = {type: 'create', entity: object};	
			// saver.changeList.push(newEvent);
			// saver.checkAutosave();
		// },
		// initialized : function(object) {  // To filter out pre-initialized events?
			// var newEvent = {type: 'initialized', entity: object};	
			// saver.changeList.push(newEvent);
			// saver.checkAutosave();
		// },
						

		
		checkAutosave : function() {
			if (saver.autosave) {
				if (saver.autosaveDelay > 0) {
					if (!saver.waitingToAutosave) {
						setTimeout(function(){ 
							saver.waitingToAutosave = false;
							saver.save(); 
						}, 
						saver.autosaveDelay);
					}
					saver.waitingToAutosave = true;
				} else {
					saver.save();
				} 
			}
		},
		
		
		// revert : function() {
			// saver.changeList.forEach(function(change) {
				// var entity  = change.entity;
				// entity[change.relationOrProperty] = entity.loadValues[change.relationOrProperty];
			// });
			// clearArray(saver.changeList);
			// saver.allChangesSaved = true;
		// },
		
		// updateLoadValues : function() {
			// saver.changeList.forEach(function(change) {
				// liquid.storeLoadValue(change.entity, change.relationOrProperty);
			// });
		// },
		
		consolidateIds : function(temporaryEntityIdToEntityIdMap) {
			// console.groupCollapsed("Consolidating ids");
			if (!isArray(temporaryEntityIdToEntityIdMap)) {
				for(var tempId in temporaryEntityIdToEntityIdMap) {
					// console.log("Found id to consolidate");
					// console.log(tempId);
					
					var entityId = temporaryEntityIdToEntityIdMap[tempId];
					// console.log(entityId);
					
					// Replace in object self
					var entity = getEntity(tempId);
					entity.entityId = entityId;
					// console.log(entity);
					
					// Replace in idObjectMap
					liquid.idObjectMap[entityId] = entity;
					delete liquid.idObjectMap.tempId;
				}
			} else {
				// console.log("Nothing to consolidate");
			}
			// console.groupEnd();
		},
		
		serializeChangelist : function() {
			// Translate change from objects to entityIds. Do this here so that objects that change from a temporary id to a real one gets the right id in the save. 
			saver.changeList.forEach(function(change) {
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
		},
		
		saveChangelist : function(changeList) {
			$.ajax({
				data:{ changeList : changeList },
				dataType:"html",
				success:function (text, textStatus) {},
				fail: function(text, textStatus) {},
				type: "post",
				url:"/liquid/save"
			});
			clearArray(changeList);
		}
		
	};
	// console.log(saver);
	// console.log(liquid);
	// debugger;
	liquid.saverMap[saver.id] = saver;
	return saver;
}

/**
* Setup default saver
*/
liquid.defaultSaver = createSaver("Default Saver");
liquid.defaultSaver.autosave = true;
liquid.activeSaver = liquid.defaultSaver;


function removeRedundantSessionChanges(changeList, event) {
	var newList = [];
	changeList.forEach(function(loggedEvent) {
		if (loggedEvent.entity == event.entity && loggedEvent.relationOrProperty == event.relationOrProperty) {
			// Skip this event
		} else {
			newList.push(loggedEvent);
		}
	});
	return newList;
}

/**--------------------------------------------------------------
*                 		Startup and Export
*----------------------------------------------------------------*/


var liquidPageRequest = liquid.request;
window.find = liquid.find;
var createEntity = liquid.createEntity;
var registerClass = liquid.registerClass;
var connectLiquidSchemas = liquid.connectSchemas;
var liquid = liquid;
var uponChangeDo = liquid.uponChangeDo;
var repeatOnChange = liquid.repeatOnChange;
