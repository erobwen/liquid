/**--------------------------------------------------------------
*               Neo4J interface. 
* There are two purposes for this module:
*  
* package neo4j in a way more useful to liquid.
* Make it possible to switch between rest-api and java. 
*     Java - FAST
*     REST API - enables visual Neo4J browser open at the same time. 
*----------------------------------------------------------------*/

var useJavaInterface = false;
var useRestAPI = !useJavaInterface;
var trace = true;

/**--------------------------------
*               Basics 
*----------------------------------*/


var neo4j = {};

// console.log(neo4j.getNodeInfo(80));
// console.log(neo4j.getRelationIds(80, "Releases"));

// throw new Error("die");
neo4j.measureQueryTime = function(callback) {
	var start = new Date().getTime();
	callback();
	var end = new Date().getTime();
	var time = (end - start);
	neo4j.dataQueryTime += time;
	neo4j.dataQueries++;
};

neo4j.clearDatabase = function() {
	// Clear database
	var cypher = "START n = node(*) OPTIONAL MATCH (n)-[r]-() WHERE (ID(n)>0 AND ID(n)<10000) DELETE n, r"			
	neo4j.query(cypher);
	if (trace) {
		console.log("Removed all data in database!");
	}
};

neo4j.resetStatistics = function () {
	neo4j.dataQueryTime = 0;
	neo4j.dataQueries = 0;
	neo4j.startTime = new Date().getTime();	
}

neo4j.getStatistics = function() {
	var end = new Date().getTime();
	var time = (end - neo4j.startTime);
	return {
		requestTime: time, 
		dataQueries : neo4j.dataQueries,
		dataQueryTime :  neo4j.dataQueryTime
	}
}

/**--------------------------------
*             Common
*----------------------------------*/


neo4j.loadCache = {}; // TODO: Load cache should be cleanded for any action that modifies the database!


neo4j.findEntitiesIds = function(properties) {
	propertyFilter = "";
	var first = true;
	for (property in properties) {
		if (!first) {
			propertyFilter += " AND ";
		} else {
			first = false;
		}
		propertyFilter += "n." + property + " = '" + properties[property] + "'";
	}
	var query = "MATCH (n) WHERE " + propertyFilter + " RETURN id(n)";
	// console.log(query);
	var queryResult = neo4j.query(query);
	// console.log(queryResult);
	ids = [];
	queryResult.forEach(function(row) {
		ids.push(row['id(n)']);
	}); 
	return ids;
};


neo4j.setPropertyValue = function(id, propertyName, value) {
	console.log("neo4j.setPropertyValue:" + "(" + id + ")." + propertyName + " = " + value);
	neo4j.query("MATCH (n) WHERE id(n) = " + id + " SET n." + propertyName + " = '" + value + "'");
	// console.log(neo4j);
	// console.log(neo4j.loadCache);
	// console.log(id in neo4j.loadCache);
	// console.log(typeof(id));
	// console.log(Object.keys(neo4j.loadCache));
	// if (Object.keys(neo4j.loadCache.length > 0)) {
		// console.log(typeof(Object.keys(neo4j.loadCache)[0]));
	// }
	var loadCache = neo4j.loadCache;
	if (typeof(loadCache[id]) !== 'undefined') {	
		delete loadCache[id];
	}
	// console.log("neo4j.setPropertyValue finised...");
};


// neo4j.hasProperty = function(id, propertyName) {
// };

// neo4j.getProperty = function(id, propertyName) {
// };

// liquid.loadProperty = function(object, property) {
	// if (neo4j.query("MATCH (n) WHERE id(n) = " + object.id + " RETURN HAS(n." + property.name + ")")) {
		// return neo4j.query("MATCH (n) WHERE id(n) = " + object.id + " RETURN n." + property.name);				
	// } else {
		// return property.defaultValue;
	// }
// };
 
 
neo4j.deleteRelationTo = function(relationName, id) {
	neo4j.query("MATCH (object) -[relation:" + relationName + "]-> (relatedNode) WHERE id(object) = " + id + " DELETE relation"); 
};

neo4j.createRelationTo = function(fromId, toId, relationName) {
	neo4j.query("MATCH (object), (relatedNode) WHERE id(object) = " + fromId + " AND id(relatedNode) = " + toId + " CREATE (object) -[:" + relationName + "]-> (relatedNode)");
};

	
	
/**--------------------------------------------------------------
*               Database connection REST/CYPHER API
*----------------------------------------------------------------*/

if (useRestAPI) {
	var Fiber = require('fibers');
	var db = require("seraph")({
		server: "http://localhost:7474",
		user: 'neo4j',
		pass: 'liquid'
	});
	
	neo4j.initialize = function() {}

	/**
	* Database query
	*/
	neo4j.query = function(parametrizedCypher) { //parametrizedCypher, parameters
		var returnValue;
		neo4j.measureQueryTime(function() {	
			// Variable arglist
			// console.log("Cypher query: " + parametrizedCypher);
			//var parametrizedCypher = parametrizedCypher;
			var parameters = null;
			if (arguments.length > 1) {
				parameters = arguments[1];
			} else {
				parameters = {};
			}
				
			// Make query while still remembering current connection (if interrupted by another connection)
			var fiber = Fiber.current;
			var currentPage = liquid.page;
			if (trace) {
				console.log("Before query:" + parametrizedCypher);
			}
			db.query(parametrizedCypher, parameters, function(err, result) {
				if (err) {
					console.log("Finished query with error: " + err.message);
					throw err;	
				}
				if (result !== null && typeof(result) !== 'undefined') {
					// console.log(result);
					fiber.run(result);
				} else {
					fiber.run();
				}
			});
			returnValue = Fiber.yield();
			liquid.page = currentPage;
		});
		
		// Return value if any
		if (trace) {
			console.log("Finished query:" + returnValue);
			// if (typeof(returnValue[0]) !== 'undefined') {
				// console.log("Finished query sample:" + returnValue[0]);
				// for(prop in returnValue[0]) {
					// console.log(returnValue[0][prop]);
				// }
			// }
		}
		if (typeof(returnValue) !== 'undefined') {
			return returnValue;
		}
	}		
	
	neo4j.createNode = function(tagName, className) {
		if (trace) {
			console.log("Create node wit rest/api");
		}
		var result = neo4j.query("CREATE (object:" + tagName + " {className:'" + className + "'}) RETURN id(object)");
		// console.log(result);
		return result[0]['id(object)'];	
	};

	neo4j.getNodeInfo = function(id) {
		var result;
		if (typeof(neo4j.loadCache[id]) !== 'undefined') {
			result = neo4j.loadCache[id];
			delete neo4j.loadCache[id];
		} else {
			result = neo4j.query("MATCH (n) WHERE id(n) = " + id + " RETURN n")[0];
			// var result = neo4j.query("START n = node(" + nodeId + ") RETURN n"); using start instead?
		}				
		return result;	
	};

	neo4j.getRelationIds = function(id, relationName) {
		// console.log("getRelationIds");
		var result = [];
		var relationInfo = neo4j.query("MATCH (n)-[r:" + relationName + "]->(m) WHERE id(n) = " + id + " RETURN r, m, id(m) as id");
		// console.log(relationInfo);
		relationInfo.forEach(function(relationInfo) {
			var relatedNodeId = parseInt(relationInfo.m.id);
			// console.log(relationInfo.m);
			// console.log("Id:" + relatedNodeId)
			result.push(relatedNodeId);
			neo4j.loadCache[relatedNodeId] = relationInfo.m;
		});
		return result;	
	};

	neo4j.getReverseRelationIds = function(id, relationName) {
		var queryResult = [];
		var query = "MATCH (n)<-[r:" + relationName + "]-(m) WHERE id(n) = " + id + " RETURN r, m, id(m) as id";
		var queryResult = neo4j.query(query);
		// console.log(query);
		// console.log(queryResult);
		var result = [];
		queryResult.forEach(function(relationInfo) {
			// console.log(relationInfo);
			var relatedNodeId = parseInt(relationInfo.id);
			result.push(relatedNodeId);
			neo4j.loadCache[relatedNodeId] = relationInfo.m;
		});
		return result;
	};
}


/**--------------------------------------------------------------
*              Database Connection Java API
*----------------------------------------------------------------*/

if (useJavaInterface) {
	var java = require("java");
	var path = require('path');
	java.classpath.push(path.resolve(__dirname, "liquidNeo4JInterface.jar"));
	java.classpath.push("C:\\Program Files\\Neo4j CE 2.3.3\\bin\\neo4j-desktop-2.3.3.jar");
	// var fs = require('fs');
	// console.log(path.join(__dirname, "neo4jNeo4JInterface.jar"));
	// console.log('jar exists: ' + fs.existsSync(path.resolve(__dirname, "neo4jNeo4JInterface.jar")));
	
	neo4j.initialize = function() {
		java.callStaticMethodSync('liquid.LiquidNeo4JInterface', 'ensureInitialized');
		
		var warmpupId = neo4j.createNode("warmup", "warmup");
		neo4j.getNodeInfo(warmpupId);
		neo4j.query("MATCH n WHERE id(n) = " + warmpupId + " DELETE n");
		// project = neo4j.getEntity(0);
		// var selection = {};
		// project.selectAll(selection);
	}
	
	
	/**
	* Database query
	*/
	neo4j.query = function(cypherQuery) {
		console.log("query: " + cypherQuery);
		var queryResult = [];
		neo4j.measureQueryTime(function() {
			queryResult = java.callStaticMethodSync('liquid.LiquidNeo4JInterface', 'executeQuery', cypherQuery);
		});
		console.log(queryResult);
		var result = [];
		queryResult.toArraySync().forEach(function(row) {
			console.log(row);
			result.push(neo4j.javaMapToMap(row));
		});
		return result;
	};

	neo4j.createNode = function(tagName, className) {
		var result = null;
		neo4j.measureQueryTime(function() {
			result = java.callStaticMethodSync('liquid.LiquidNeo4JInterface', 'createNode', tagName, className);
		});
		
		return result;	
	};

	neo4j.getNodeInfo = function(id) {
		var result = null;
		if (typeof(neo4j.loadCache[id]) !== 'undefined') {
			result = neo4j.loadCache[id];
			delete neo4j.loadCache[id];
		} else {
			neo4j.measureQueryTime(function() {
				var javaNodeInfo = java.callStaticMethodSync('liquid.LiquidNeo4JInterface', 'getNode', id);
				result = neo4j.javaMapToMap(javaNodeInfo);
			});
		}
		return result;
	};

	neo4j.getRelationIds = function(id, relationName) {
		var result = {};
		// if (typeof(id) !== 'number') {
			// id = parseInt(id);
		// }
		neo4j.measureQueryTime(function() {
			// console.log("getRelationIds: " + id + "." + relationName);
			
			var relatedNodes = java.callStaticMethodSync('liquid.LiquidNeo4JInterface', 'getRelation', id, relationName, false);
			relatedNodes.toArraySync().forEach(function(javaNodeInfo) {
				// console.log("Got one!");
				var nodeInfo = neo4j.javaMapToMap(javaNodeInfo)
				result[nodeInfo.id] = true;  // Somehow we get duplicates here. TODO: Investigate into the java code..
				neo4j.loadCache[nodeInfo.id] = nodeInfo;
			});
			// console.log(result);
		});
		// console.log(Object.keys(result));
		var resultArray = [];
		Object.keys(result).forEach(function(id) {
			resultArray.push(parseInt(id));
		});
		return resultArray;
	};

	neo4j.getReverseRelationIds = function(id, relationName) {
		var result = [];
		neo4j.measureQueryTime(function() {
			var relatedNodes = java.callStaticMethodSync('liquid.LiquidNeo4JInterface', 'getRelation', id, relationName, true);
			relatedNodes.toArraySync().forEach(function(javaNodeInfo) {
				var nodeInfo = neo4j.javaMapToMap(javaNodeInfo)
				result.push(nodeInfo.id);
				neo4j.loadCache[nodeInfo.id] = nodeInfo.id;
			});
		});
		return result;
	};

	/**
	* Helpers
	*/
	neo4j.javaMapToMap = function(javaMap) {
		var result = {};	
		javaMap.keySetSync().toArraySync().forEach(function(key) {
			var value = javaMap.getSync(key);
			// console.log(value);
			if (typeof(value.longValue) !== 'undefined') {
				result[key] = parseInt(value.longValue);								
			} else {
				result[key] = value;				
			}
		});
		// if (typeof(result.id) !== 'undefined') {
			// result.id = parseInt(result.id.longValue);
		// }
		return result;
	};
}

 
 module.exports.query = neo4j.query;
 module.exports.clearDatabase = neo4j.clearDatabase;
 module.exports.resetStatistics = neo4j.resetStatistics;
 module.exports.getStatistics = neo4j.getStatistics;
 module.exports.initialize = neo4j.initialize;
 module.exports.createNode = neo4j.createNode;
 module.exports.getNodeInfo = neo4j.getNodeInfo;
 module.exports.getRelationIds = neo4j.getRelationIds;
 module.exports.getReverseRelationIds = neo4j.getReverseRelationIds;
 module.exports.findEntitiesIds = neo4j.findEntitiesIds;
 module.exports.setPropertyValue = neo4j.setPropertyValue;
 module.exports.deleteRelationTo = neo4j.deleteRelationTo;
 module.exports.createRelationTo = neo4j.createRelationTo;
 
 
	
