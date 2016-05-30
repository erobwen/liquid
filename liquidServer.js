var Fiber = require('fibers');

var liquidCommon = require('./public/js/liquid/liquidCommon.js');
var liquidSelection = require('./public/js/liquid/liquidSelection.js');
var liquidRepetition = require('./public/js/liquid/liquidRepetition.js');
var neo4j = require('./liquidneo4jInterface.js');
include('./public/js/liquid/liquidUtility.js'); ///..  // Note: path relative to the include service!
require( 'console-group' ).install();

/**
 * The liquid with common functionality
 */ 
var liquid = {};
liquid.onServer = true;
liquidCommon.addCommonLiquidFunctionality(liquid);
liquidSelection.addLiquidSelectionFunctionality(liquid);
liquidRepetition.addLiquidRepetitionFunctionality(liquid);

var commonInitialize = liquid.initialize;
liquid.initialize = function() {
	neo4j.initialize();
	commonInitialize();
} 

liquid.clearDatabase = function() {
	neo4j.clearDatabase();
}
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

/**--------------------------------------------------------------
*                Object finding 
*----------------------------------------------------------------*/

liquid.findEntity = function(properties) {
	return liquid.findEntities(properties)[0];
}

liquid.findEntities = function(properties) {
	// console.log("findEntities:");
	// console.log(properties);
	var entityIds = neo4j.findEntitiesIds(properties);
	// console.log(entityIds);
	var result = [];
	entityIds.forEach(function(id) {
		result.push(liquid.getEntity(id));
	}); 
	return result;
}

/**--------------------------------------------------------------
*                Object creation 
*----------------------------------------------------------------*/
	
liquid.createEntity = function(className, initData) {	
	var object = liquid.createClassInstance(className);	
    var liquidClass = liquid.classRegistry[className];
	object.id =  neo4j.createNode(liquidClass.tagName, className);
	// console.log("Created an object");
	// console.log(object);
	
	// Setup default values and save to database. 
	// console.log("----------- setting default values -------------")
	for (propertyName in object._propertyDefinitions) {
		// console.log("propertyName: " + propertyName)
		var instance = object._propertyInstances[propertyName];
		var definition = object._propertyDefinitions[propertyName];
		var defaultValue = definition.defaultValue;
		instance.data = defaultValue;
		liquid.notifySettingProperty(object, definition, instance, defaultValue, null);
		// liquid.notifyChangeInProperty(object, property); // Do not!
	}
	
	// console.log("init: (" + object.className + "." + object.id + ")");
	object.init(initData);
	
	// Set object signum for easy debug
	object._ = object.getObjectSignum();
	
	// console.log("Finish setup object ...");
	//console.log("Created object: " + className + " id:" + object.id);
	
	liquid.idObjectMap[object.id] = object;
	return object;
}


/**--------------------------------------------------------------
*                 Node retreival from id
*----------------------------------------------------------------*/


/**
* Get object
*/
liquid.getEntity = function(id) {
	// console.log("getEntity");
	// console.log(id);
	var stored = liquid.idObjectMap[id];
	if (typeof(stored) !== 'undefined') {
		// console.log("Found a stored value!");
		return stored;
	} else {
		return liquid.loadNodeFromId(id);
	}
}


/**
 * Node creation
 */	
liquid.loadNodeFromId = function(objectId) {
	// console.log("Load object from id:" + objectId);
	var nodeData = neo4j.getNodeInfo(objectId);			
	// console.log("loadNodeFromId, nodeData");
	// console.log(nodeData);
	var className = nodeData['className'];
	var object = liquid.createClassInstance(className);
	// console.log(objectId);
	// console.log("Created instance:");
	// console.log(object);
	// console.log("Set id");
	// console.log(object.id);
	object.id = objectId;
	object.isSource = false;
	// console.log(object.id);
		
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
	
	// console.log("Initialized instance:");
	// console.log(object);
	object._ = object.getObjectSignum();

	liquid.idObjectMap[object.id] = object;
	return object;
}


/**--------------------------------------------------------------
*               Generic relation loading interface
*----------------------------------------------------------------*/

liquid.loadSingleRelation = function(object, definition, instance) {
	// console.log("loadSingleRelation: (" + object.className + "." + object.id + ") -- [" + definition.name + "] --> ?");
	instance.data = null;
	var relationIds = neo4j.getRelationIds(object.id, definition.qualifiedName);
	if (relationIds.length == 1) {
		var relatedObject = liquid.getEntity(relationIds[0]);
		instance.data = relatedObject;
		instance.isLoaded = true;
	} else if (relationIds.length > 1) {
		instance.isLoaded = false;
		throw new Exception("Getting a single relation, that has more than one relation defined in the database.");
	}
	liquid.logData(instance.data);
};

liquid.ensureIncomingRelationLoaded = function(object, incomingRelationQualifiedName) {
	// console.log("ensureIncomingRelationLoaded: (" + object.className + "." + object.id + ") <-- [" + incomingRelationQualifiedName + "] -- ?");
	if (typeof(object.incomingRelationsComplete[incomingRelationQualifiedName]) === 'undefined') {
		// console.log("run liquid version of ensureIncomingRelationLoaded");
		var incomingRelationIds = neo4j.getReverseRelationIds(object.id, incomingRelationQualifiedName); // This now contains potentially too many ids. 
		// console.log("Load incoming relations id");
		// console.log(incomingRelationIds);
		if (incomingRelationIds.length > 0) {
			incomingRelationIds.forEach(function(incomingId) {
				var relatedObject = liquid.getEntity(incomingId);
				// Call getter on the incoming relations
				relatedObject[relatedObject._relationDefinitions[incomingRelationQualifiedName].getterName]();
			});
		}
	}
	object.incomingRelationsComplete[incomingRelationQualifiedName] = true;
};

	
liquid.loadSetRelation = function(object, definition, instance) {
	// Load relation
	// console.log("loadSetRelation: (" + object.className + "." + object.id + ") --[" + definition.name + "]--> ?");
	var set = [];
	var relationIds = neo4j.getRelationIds(object.id, definition.qualifiedName);
	// console.log(relationIds);
	relationIds.forEach(function(objectId) {
		set.push(liquid.getEntity(objectId));			
	});
	// console.log(set);
	set.forEach(function(relatedObject) {
		liquid.addIncomingRelationOnLoad(relatedObject, definition.qualifiedName, object);
	});
	instance.data = set;
	instance.isLoaded = true;

	// Setup sorting
	liquid.setupRelationSorting(object, definition, instance);
	// liquid.logData(instance.data);
};



/**--------------------------------------------------------------
*                   Detailed Observation
*
* Detailed observation ignores mirror relations. Therefore all 
* Events in detailed obervation are unique, and can be used to 
* Save data, transmitt to peers etc. 
*----------------------------------------------------------------*/

/***
 * Relations
 */
liquid.notifySettingRelation = function(object, definition, instance, value, previousValue) {
	liquid.notifyDeletingRelation(object, definition, instance, previousValue);
	liquid.notifyAddingRelation(object, definition, instance, value);
};

liquid.notifyAddingRelation = function(object, definition, instance, relatedObject){
	for (id in object._observingPages) { // TODO: Notify observing pages for related object as well!!!
		if (object._observingPages[id] !== liquid.requestingPage && object._observingPages[id].socket !==  null) {
			// TODO: only notify those who has read write to both objects.
			// 
			object._observingPages[id].socket.emit("addingRelation", object.id, definition.qualifiedName, relatedObject.id);	

			// TODO: check if the related object has a reverse relation, in that case
		}
	}
	neo4j.createRelationTo(object.id, relatedObject.id, definition.qualifiedName);
};

liquid.notifyDeletingRelation = function(object, definition, instance, relatedObject) {
	for (id in object._observingPages) {// TODO: Notify observing pages for related object as well!!!
		if (object._observingPages[id] !== liquid.requestingPage && object._observingPages[id].socket !==  null) {
			// TODO: only notify those who has read write to both objects.
			object._observingPages[id].socket.emit("deletingRelation", object.id, definition.qualifiedName, relatedObject.id);				
		}
	}
	neo4j.deleteRelationTo(definition.qualifiedName, object.id);
};


/***
 * Properties
 */
liquid.notifySettingProperty = function(object, propertyDefinition, propertyInstance, newValue, oldValue) {
	console.log("notifySettingProperty: " + propertyDefinition.name + " = " + newValue);
	for (id in object._observingPages) {
		if (object._observingPages[id] !== liquid.requestingPage && object._observingPages[id].socket !==  null) {
			object._observingPages[id].socket.emit("settingProperty", object.id, propertyDefinition.name, newValue);				
		}
	}
	neo4j.setPropertyValue(object.id, propertyDefinition.name, newValue);
}





/**--------------------------------------------------------------
*                 Connection management
*----------------------------------------------------------------*/

liquid.pagesMap = {};  
liquid.sessionsMap = {};

liquid.createPageObject = function(id, session) {
	return {
		id: id,
		session : session,
		socket : null
	};
};

liquid.createSessionObject = function(id) {
	return {
		id : id,
		pages : [],
		user : null
	};
}

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
	// console.log(req.session);
	// var connection = res.socket
	// global.currentLiquidConnection = connection;
	// global.currentSession = liquid.createSession(connection);
	// console.log(currentLiquidConnection);
	// console.log(currentLiquidConnection.sessionid);
	// liquidSocket.emit('welcome', {message: "Hi i'm Laurent and i write shitty articles on my blog"});

	// Setup session object (that we know is the same object identity on each page request)
	if (typeof(liquid.sessionsMap[req.session.id]) === 'undefined') {
		liquid.sessionsMap[req.session.id] = liquid.createSessionObject(req.session.id);		
	}
	var session = liquid.sessionsMap[req.session.id];

	// Setup page object
	var hardToGuessPageId = liquid.generateUniqueKey(liquid.pagesMap);
	var page = liquid.createPageObject(hardToGuessPageId, session);
	liquid.page = page;
	liquid.pagesMap[hardToGuessPageId] = page;
	
	var user = session.user;

	var result;
	Fiber(function() {  // consider, remove fiber when not using rest api?
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
	var result;
	var page = liquid.pagesMap[hardToGuessPageId];
	liquid.page = page;
	Fiber(function() {  // consider, remove fiber when not using rest api?
		// Measure query time and pageRequest time
		neo4j.resetStatistics();
		liquid.requestingPage = page;
		result = operation(page.session.user, page.session, page);
		liquid.requestingPage = null;
		
		// Display measures. 
		var statistics = neo4j.getStatistics();
		console.log("Data Request time: " + statistics.pageRequestTime + " milliseconds.");
		console.log("Data Request data queries: " + statistics.dataQueries);
		console.log("Data Request data query time: " + statistics.dataQueryTime + " milliseconds.");
	}).run();

	return result;
}



/**--------------------------------------------------------------
*                 		Export
*----------------------------------------------------------------*/

/**
 * Export createEntity and registerClass
 */
module.exports.liquidPageRequest = liquid.pageRequest;
module.exports.liquidDataRequest = liquid.dataRequest;

module.exports.createEntity = liquid.createEntity;
module.exports.getEntity = liquid.getEntity;
module.exports.findEntity = liquid.findEntity;
module.exports.findEntities = liquid.findEntities;

module.exports.registerClass = liquid.registerClass;
module.exports.liquid = liquid;
