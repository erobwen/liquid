var Fiber = require('fibers');

var liquidCommon = require('./public/js/liquid/liquidCommon.js');
var liquidEntity = require('./public/js/liquid/liquidEntity.js');
var liquidSelection = require('./public/js/liquid/liquidSelection.js');
var liquidRepetition = require('./public/js/liquid/liquidRepetition.js');
var neo4j = require('./liquidNeo4jInterface.js');
include('./public/js/liquid/liquidUtility.js'); ///..  // Note: path relative to the include service!
require( 'console-group' ).install();

/**
 * The liquid with common functionality
 */ 
var liquid = {};
liquid.onServer = true;
liquidCommon.addCommonLiquidFunctionality(liquid);
liquidEntity.addLiquidEntity(liquid)
liquidSelection.addLiquidSelectionFunctionality(liquid);
liquidRepetition.addLiquidRepetitionFunctionality(liquid);

var commonInitialize = liquid.initialize;
liquid.initialize = function() {
	neo4j.initialize();
	commonInitialize();
	liquid.clearPagesAndSessions();
};

liquid.clearDatabase = function() {
	neo4j.clearDatabase();
};

liquid.clearPagesAndSessions = function() {
	neo4j.query("MATCH (n {className:'LiquidSession'}) DETACH DELETE n");
	neo4j.query("MATCH (n {className:'LiquidPage'}) DETACH DELETE n");
};

/**--------------------------------------------------------------
*                 Sessions
*----------------------------------------------------------------*/

liquid.sessions = {};

liquid.createSession = function(connection) {
	liquid.sessions[connection] = {};
	return liquid.sessions[connection];
}


/**--------------------------------------------------------------
*                 Indexes
*----------------------------------------------------------------*/

liquid.getIndex = function(className) {
	var ids = neo4j.findEntitiesIds({className : className});
	//console.log(queryResult);
}

/*********************************************************************************************************
 *  Persisntency
 *
 *
 *
 *
 *
 *******************************************************************************************************/

/**--------------------------------------------------------------
*                Persistent object finding 
*----------------------------------------------------------------*/


liquid.findPersistentEntity = function(properties) {
	return liquid.findPersistentEntities(properties)[0];
}

liquid.findPersistentEntities = function(properties) {
	// console.log("findEntities:");
	// console.log(properties);
	var persistentEntityIds = neo4j.findEntitiesIds(properties);
	// console.log(entityIds);
	var result = [];
	persistentEntityIds.forEach(function(persistentId) {
		result.push(liquid.getPersistentEntity(persistentId));
	}); 
	return result;
}

/**--------------------------------------------------------------
 *                Object persisting
 *----------------------------------------------------------------*/
// if (object._persistentId != null) {
// 	neo4j.createRelationTo(object._persistentId, relatedObject._persistentId, definition.qualifiedName);
// 	neo4j.setPropertyValue(object._persistentId, propertyDefinition.name, newValue);
// }

liquid.persist = function(object) {
	if (object._persistentId === null) {
		liquid.ensurePersisted(object);
	} 
	neo4j.setPropertyValue(object._persistentId, "_persistedDirectly", true);
};


liquid.ensurePersisted = function(object) {
	if (object._persistentId === null) {
		object._persistentId =  neo4j.createNode(liquidClass.tagName, className);

		object.forAllProperties(function (definition, instance) {
			if (typeof(instance.data) !== 'undefined') {
				neo4j.setPropertyValue(object._persistentId, "definition.name", instance.data); // TODO: Set multiple values at the same time!
			}
		});
		object.forAllOutgoingRelatedObjects(function(definition, instance, relatedObject){
			liquid.ensurePersisted(relatedObject);
			neo4j.createRelationTo(object._persistentId, relatedObject._persistentId, definition.qualifiedName);
		});
	}
};

liquid.unpersist = function(object) {
	if (object._persistedDirectly === true) {
		object._persistedDirectly == false;
		neo4j.setPropertyValue(object._persistentId, "_persistedDirectly", false);
		liquid.unpersistIfOrphined(object);
	}
};

liquid.hasDirectlyPersistedAncestor = function(object) {
	var visitedSet = {};
	var result = false;
	object.forAllIncomingRelations(function(relatedObject) { // TODO: consider change to "forAllStrongIncomingRelations" ?
		if (liquid.hasDirectlyPersistedAncestorLoopControl(relatedObject, visitedSet)) {
			result = true;
		}
	});
	return result;
};

liquid.hasDirectlyPersistedAncestorLoopControl = function(object, visitedSet) {
	if (typeof(visitedSet[object.id]) !== 'undefined') {
		return false;
	} else {
		visitedSet[object.id] = true;
		if (object._persistentId === null) {
			return false;
		}
		if (object._persistedDirectly) {
			return true;
		}
		var result = false;
		object.forAllIncomingRelations(function(relatedObject) { // TODO: consider change to "forAllStrongIncomingRelations" ?
			if (liquid.hasDirectlyPersistedAncestorLoopControl(relatedObject, visitedSet)) {
				result = true;
			}
		});
		return result;
	}
};

liquid.unpersistIfOrphined = function() {
	if (object._persistedDirectly === false && !liquid.hasDirectlyPersistedAncestor(object)) {
		neo4j.query("MATCH (n) WHERE n.id() = '" + object._persistentId + "' DETACH DELETE n");
		object._persistentId = null;
		object.forAllOutgoingRelatedObjects(function(definition, instance, relatedObject){
			liquid.unpersistIfOrphined(relatedObject);
		});
	}
}


/**--------------------------------------------------------------
*                Object creation 
*----------------------------------------------------------------*/

// liquid.setAllPropertiesToDefault = function(object) {
// 	for (propertyName in object._propertyDefinitions) {
// 		var definition = object._propertyDefinitions[propertyName];
// 		var defaultValue = definition.defaultValue;
// 		object[definition.setterName](defaultValue);
// 	}
// }

liquid.createPersistent = function(className, initData) {
	var object = liquid.create(className, initData);

	// Save to database
	object._persistedDirectly = true;
	var liquidClass = liquid.classRegistry[className];
	object._persistentId =  neo4j.createNode(liquidClass.tagName, className);
	neo4j.setPropertyValue(object._persistentId, "_persistedDirectly", true)
	liquid.persistentIdObjectMap[object._persistentId] = object;
	object._globalId = "1:" + object._persistentId;

	return object;
}


/**--------------------------------------------------------------
*                 Node retreival from id
*----------------------------------------------------------------*/


/**
* Get object
*/
liquid.getPersistentEntity = function(persistentId) {
	// console.log("getEntity");
	// console.log(persistentId);
	var stored = liquid.persistentIdObjectMap[persistentId];
	if (typeof(stored) !== 'undefined') {
		// console.log("Found a stored value!");
		return stored;
	} else {
		return liquid.loadNodeFromId(persistentId);
	}
}


/**
 * Node creation
 */	
liquid.loadNodeFromId = function(persistentId) {
	// console.log("loadNodeFromId:" + persistentId);
	var nodeData = neo4j.getNodeInfo(persistentId);
	var className = nodeData['className'];
	var object = liquid.createClassInstance(className);
	object._persistentId = persistentId;

	// Load all values for properties, or use default where no saved data present.
	if (typeof(nodeData) !== 'undefined') {
		for (var propertyName in object._propertyDefinitions) {
			var propertyInstance = object._propertyInstances[propertyName];
			if (typeof(nodeData[propertyName]) !== 'undefined') {
				propertyInstance.data = nodeData[propertyName];
			} else {
				var propertyDefinition = object._propertyDefinitions[propertyName];
				propertyInstance.data = propertyDefinition.defaultValue;
			}		
		}
	}	

	object._ = object.__(); // Debug field

	liquid.persistentIdObjectMap[object._persistentId] = object;
	return object;
}


/**--------------------------------------------------------------
*               Generic relation loading interface
*----------------------------------------------------------------*/

liquid.loadSingleRelation = function(object, definition, instance) {
	console.log("loadSingleRelation: " + object.__() + " -- [" + definition.name + "] --> ?");
	instance.data = null;
	var relationIds = neo4j.getRelationIds(object._persistentId, definition.qualifiedName);
	// console.log(relationIds);
	if (relationIds.length == 1) {
		var relatedObject = liquid.getPersistentEntity(relationIds[0]);
		instance.data = relatedObject;
		instance.isLoaded = true;
	} else if (relationIds.length > 1) {
		instance.isLoaded = false;
		throw new Exception("Getting a single relation, that has more than one relation defined in the database.");
	}
	//liquid.logData(instance.data);
	return instance.data;
};


liquid.ensureIncomingRelationsLoaded = function(object) {
	console.log("ensureIncomingRelationsLoaded: " + object.__() + " <--  ?");
	if (typeof(object._allIncomingRelationsLoaded) === 'undefined') {
		// console.log("run liquid version of ensureIncomingRelationLoaded");
		var incomingRelationAndIds = neo4j.getAllIncomingRelationsAndIds(object._persistentId); // This now contains potentially too many ids.
		// console.log("Load incoming relations id");
		// console.log(incomingRelationIds);
		if (incomingRelationIds.length > 0) {
			incomingRelationIds.forEach(function(relationAndId) {
				var incomingRelationQualifiedName = relationAndId.relationName;
				var incomingId = relationAndId.id;

				var relatedObject = liquid.getPersistentEntity(incomingId);

				// Call getter on the incoming relations to load them TODO: remove observer registration in this call!?
				var definition = relatedObject.getRelationDefinitionFromQualifiedName(incomingRelationQualifiedName);
				relatedObject[definition.getterName]();
			});
		}
	}
	object._allIncomingRelationsLoaded = true;
	object.forAllReverseRelations(function(definition, instance) {
		object.incomingRelationsComplete[definition.incomingRelationQualifiedName] = true; // Make a note all incoming relations loaded
	});
};


liquid.ensureIncomingRelationLoaded = function(object, incomingRelationQualifiedName) {
	console.log("ensureIncomingRelationLoaded: " + object.__() + " <-- [" + incomingRelationQualifiedName + "] -- ?");
	if (typeof(object.incomingRelationsComplete[incomingRelationQualifiedName]) === 'undefined') {
		// console.log("run liquid version of ensureIncomingRelationLoaded");
		var incomingRelationIds = neo4j.getReverseRelationIds(object._persistentId, incomingRelationQualifiedName); // This now contains potentially too many ids.
		// console.log("Load incoming relations id");
		// console.log(incomingRelationIds);
		if (incomingRelationIds.length > 0) {
			incomingRelationIds.forEach(function(incomingId) {
				var relatedObject = liquid.getPersistentEntity(incomingId);
				// Call getter on the incoming relations
				var definition = relatedObject.getRelationDefinitionFromQualifiedName(incomingRelationQualifiedName);
				relatedObject[definition.getterName]();
			});
		}
	}
	object.incomingRelationsComplete[incomingRelationQualifiedName] = true;
};

	
liquid.loadSetRelation = function(object, definition, instance) {
	// Load relation
	console.log("loadSetRelation: " + object.__() + " --[" + definition.name + "]--> ?");
	var set = [];
	var relationIds = neo4j.getRelationIds(object._persistentId, definition.qualifiedName);
	// console.log(relationIds);
	relationIds.forEach(function(objectId) {
		set.push(liquid.getPersistentEntity(objectId));
	});
	// console.log(set);
	set.forEach(function(relatedObject) {
		liquid.addIncomingRelation(relatedObject, definition.qualifiedName, object);
	});
	instance.data = set;
	instance.isLoaded = true;

	// Setup sorting
	liquid.setupRelationSorting(object, definition, instance);
	// liquid.logData(instance.data);
};


/*********************************************************************************************************
 *  Push/Serve/Receive from/to Downstream
 *
 *
 *
 *
 *
 *******************************************************************************************************/

/**--------------------------------------------------------------
*                 Connection management
*----------------------------------------------------------------*/

liquid.pagesMap = {};  
liquid.sessionsMap = {};

liquid.createPageObject = function(hardToGuessPageId, session) {
	var page = createPersistent('LiquidPage', { hardToGuessPageId: hardToGuessPageId, Session : session });
	page._socket = null;
	return page;
};

liquid.createSessionObject = function(hardToGuessSessionId) {
	return createPersistent('LiquidSession', {hardToGuessSessionId: hardToGuessSessionId});
};

liquid.generateUniqueKey = function(keysMap) {
	var newKey = null;
	while(newKey == null) {
		var newKey = Number.MAX_SAFE_INTEGER * Math.random();
		if (typeof(keysMap[newKey]) !== 'undefined') {			
			newKey = null;
		}
	}
	return newKey;
} 

liquid.pageRequest = function(req, res, operation) {
	var result;
	Fiber(function() {  // consider, remove fiber when not using rest api?
		// Setup session object (that we know is the same object identity on each page request)
		var hardToGuessSessionId = req.session.id;
		if (typeof(liquid.sessionsMap[hardToGuessSessionId]) === 'undefined') {
			liquid.sessionsMap[hardToGuessSessionId] = liquid.createSessionObject(hardToGuessSessionId);
		}
		var session = liquid.sessionsMap[hardToGuessSessionId];

		// Setup page object
		var hardToGuessPageId = liquid.generateUniqueKey(liquid.pagesMap);
		var page = liquid.createPageObject(hardToGuessPageId, session);
		liquid.clientPage = page;
		liquid.pagesMap[hardToGuessPageId] = page;

		var user = session.getUser(); // Can be null!

		// Measure query time and pageRequest time
		neo4j.resetStatistics();
		liquid.requestingPage = page;
		result = operation(user, session, page);
		liquid.requestingPage = null;
		
		// Display measures. 
		var statistics = neo4j.getStatistics();
		console.log("Page Request time: " + statistics.pageRequestTime + " milliseconds.");
		console.log("Page Request data queries: " + statistics.dataQueries);
		console.log("Page Request data query time: " + statistics.dataQueryTime + " milliseconds.");
	}).run();

	return result;
}

liquid.dataRequest = function(hardToGuessPageId, operation) {
	console.log("dataRequest: " + hardToGuessPageId);
	// console.log(liquid.pagesMap);
	var result;
	var page = liquid.pagesMap[hardToGuessPageId];
	liquid.clientPage = page;
	// console.log(page);
	Fiber(function() {  // consider, remove fiber when not using rest api?
		// Measure query time and pageRequest time
		neo4j.resetStatistics();
		liquid.requestingPage = page;
		result = operation(page.getActiveUser(), page.getSession(), page);
		liquid.requestingPage = null;
		
		// Display measures. 
		var statistics = neo4j.getStatistics();
		console.log("Data Request time: " + statistics.pageRequestTime + " milliseconds.");
		console.log("Data Request data queries: " + statistics.dataQueries);
		console.log("Data Request data query time: " + statistics.dataQueryTime + " milliseconds.");
	}).run();

	return result;
}


/**----------------------------------------------------------------
 *                       Push data downstream
 *-----------------------------------------------------------------*/

 liquid.pushDataDownstream = function() {

};
// if (liquid.activePulse.originator === liquid.clientPage) {


/**-------------------------------------------------------------
 *                 Receive from downstream
 ---------------------------------------------------------------*/

function receivePulseFromDownstream(originator, pulseData) {
	liquid.pulse(originator, function() {
		unserializeDownstreamPulse(pulseData);
	});
}


// Form for events:
//  {action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
//  {action: deletingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
//  {action: addingRelation, objectDownstreamId:45, relationName: 'Foobar', relatedObjectDownstreamId:45 }
//  {action: settingProperty, objectDownstreamId:45, propertyName: 'Foobar', propertyValue: 'Some string perhaps'}

function unserializeDownstreamPulse(pulseData) {
	var downstreamIdToSerializedObjectMap = pulseData.downstreamIdToSerializedObjectMap;
	var downstreamIdToObjectMap = {};
	
	function unserializeDownstreamReference(reference) {
		if (reference === null) {
			return null;
		}
		var fragments = reference.split(":");
		var className = fragments[0];
		var type = fragments[1];
		var id = parseInt(fragments[2]);
		if (type === 'downstreamId') {
			return ensureObjectUnserialized(null, id);
		} else {
			return liquid.getEntity(id);
		}
	}
	
	function ensureRelatedObjectsUnserialized(event) {
		function undefinedAsNull(value) {
			if (value === 'undefined') {
				return null;
			}
			return value;
		}

		ensureObjectUnserialized(undefinedAsNull(event.relatedObjectId), undefinedAsNull(event.relatedObjectDownstreamId));
	}

	function ensureObjectUnserialized(id, downstreamId) {
		if(id == null) {
			if (downstreamIdToObjectMap[downstreamId] === 'undefined') {
				var serializedObject = downstreamIdToSerializedObjectMap[downstreamId];
				return unserializeDownstreamObjectRecursivley(serializedObject);
			} else {
				return downstreamIdToObjectMap[downstreamId];
			}
		} else {
			return liquid.getEntity(id);
		}
	}
	
	function unserializeDownstreamObjectRecursivley(serializedObject) {
		var newObject = liquid.createClassInstance(serializedObject.className);

		newObject.forAllOutgoingRelations(function(definition, instance) {
			var data = serializedObject[definition.name];
			if (definition.isSet) {
				data = data.map(unserializeDownstreamReference);
			} else {
				data = unserializeDownstreamReference(data);
			}
			// liquid.withoutPushingToServer(function() { // TODO: without pushing to the originator page!
			newObject[definition.setterName](data);
			// });
		});

		for (propertyName in newObject._propertyDefinitions) {
			definition = newObject._propertyDefinitions[propertyName];
			var data = serializedObject[definition.name];
			liquid.withoutPushingToServer(function() {
				newObject[definition.setterName](data);
			});
		}
		newObject._ = newObject.__();
		downstreamIdToObjectMap[serializedObject.downstreamId] = newObject;
		
		return newObject;
	}
	
	pulseData.serializedEvents.forEach(function(event) {
		if (typeof(event.objectId) !== 'undefined' || typeof(downstreamIdToObjectMap[event.downstreamObjectId])) { // Filter out events that should not be visible to server TODO: Make client not send them?

			var object = typeof(event.objectId) !== 'undefined' ?  liquid.getEntity(action.objectId) : downstreamIdToObjectMap[event.downstreamObjectId];

			if (event.action === 'settingRelation' ||
				event.action === 'addingRelation' ||
				event.action === 'deletingRelation') {

				// This removes and replaces downstream id:s in the event!

				var relatedObject = ensureRelatedObjectsUnserialized(event, downstreamIdToSerializedObjectMap, downstreamIdToObjectMap);

				if (event.action === 'addingRelation') {
					var adderName = object._relationDefinitions[event.relationQualifiedName].adderName;
					object[adderName](relatedObject);
				} else if (event.action === 'deletingRelation'){
					var removerName = object._relationDefinitions[event.relationQualifiedName].removerName;
					object[removerName](relatedObject);
				}
			} else if (event.action === "settingProperty") {
				var setterName = object._propertyDefinitions[event.propertyName].setterName;
				object[setterName](action.newValue);
			}
		}
	});
}


//
// function ensureEmptyObjectExists(upstreamId, className) {
// 	if (typeof(liquid.upstreamIdObjectMap[upstreamId]) === 'undefined') {
// 		var newObject = liquid.createClassInstance(className);
// 		newObject._upstreamId = upstreamId;
// 		newObject.noDataLoaded = true;
// 		liquid.upstreamIdObjectMap[upstreamId] = newObject;
// 		newObject._ = newObject.__();
// 	}
// 	return liquid.upstreamIdObjectMap[upstreamId];
// }
// var pulse = {
// 	serializedEvents : serializedEvents,
// 	serializedObjects : []
// };
// liquid.upstreamSocket.emit("downstreamPulse", liquid.hardToGuessPageId, pulse);





/**--------------------------------------------------------------
*                 		Export
*----------------------------------------------------------------*/

/**
 * Export createEntity and registerClass
 */
module.exports.liquidPageRequest = liquid.pageRequest;
module.exports.liquidDataRequest = liquid.dataRequest;

module.exports.create = liquid.create;
module.exports.createPersistent = liquid.createPersistent;

module.exports.getEntity = liquid.getEntity;
module.exports.getPersistentEntity = liquid.getPersistentEntity;
module.exports.getUpstreamEntity = liquid.getUpstreamEntity;

module.exports.findEntity = liquid.findEntity;
module.exports.findEntities = liquid.findEntities;

module.exports.registerClass = liquid.registerClass;
module.exports.liquid = liquid;
