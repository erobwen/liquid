/*--------------------------------------
* Common liquid functionality
*   (shared between server and client)
*---------------------------------------*/

var addCommonLiquidFunctionality = function(liquid) {	 
		
	/**--------------------------------------------------------------------------------
	*                 Initialize (do after all application classes has been added)
	*----------------------------------------------------------------------------------*/
 
	liquid.initialize = function() {
		//console.log("Initialize liquid!");
		liquid.addCommonLiquidClasses(liquid);
		// console.log(liquid.classRegistry);
		liquid.ensureClassRegistryLinked();
	};
	
	/**--------------------------------------------------------------
	*                 The id object maps
	*----------------------------------------------------------------*/
 
	/**
	 * Id to node maps, in order to assure correct identity of objects. 
	 */
	liquid.idObjectMap = {}; // Local id. TODO: Remove this one! This one prevents GC from functioning. Instead, all individual subscribers/pages should keep a map of their own, that is removed when page is removed. 
	liquid.upstreamIdObjectMap = {}; // Objects id at server. 
	liquid.persistentIdObjectMap = {}; // Database id.
	
	// Global identities, for URL:s etc. 
	liquid.globalIdObjectMap = {};
	liquid.canIssueGlobalIdentities = false; // True only for web servers in a cluster. False for localhost server and for client. 

	
	/**
	 * Get entity
	 */
	liquid.getEntity = function(entityId) {
		return liquid.idObjectMap[entityId];
	};


	/**
	 * Get entity
	 */
	liquid.getUpstreamEntity = function(entityId) {
		return liquid.upstreamIdObjectMap[entityId];
	};


	/**
	 * Get persistent entity (for instances with a database) 
	 */
	liquid.getPersistentEntity = function(entityId) {
		return liquid.persistentIdObjectMap[entityId];
	};

	
	
	/**
	 * Get entity
	 */
	liquid.getGlobalEntity = function(entityId) {
		return liquid.globalIdObjectMap[entityId];
	};


	/**--------------------------------------------------------------
	 *                 Liquid Pulse 
	 *----------------------------------------------------------------*/


	// Form for events:
// 	{redundant: true, action: 'addingReverseRelation', object: object, definition: definition, instance: instance, relatedObject: relatedObject}

	liquid.activePulse = null;
	liquid.pulse = function(originator, action) { // Changes origin: "downstream", "upstream", "local" (direct ui modifications), "httpRequest"
		Fiber(function() {
			// var originator = liquid.clientPage !== null ? liquid.clientPage : 'local'; // 'upstream'
			if (liquid.activePulse !== null) { 
				throw "Pulses cannot overlap in time!"; 
			}
	
			// Setup pulse data
			liquid.activePulse = {
				originator : originator, // 'upstream', 'local' or a Page object
				events : [],
				add : function(event) {
					if (liquid.isBlockingSideEffects()) {
						if (typeof(liquid.activeSideEffectBlocker().createdObjects[event.object.id]) === 'undefined' ) {
							console.low("Blocked sideffect");
							console.low(event);
							return;
						}
					}
					event.repeater = liquid.isRefreshingRepeater() ? liquid.activeRepeater() : null;
					event.isDirectEvent = event.repeater === null;
					events.push(event);
				}
			};

			// Measure query time and pageRequest time
			// neo4j.resetStatistics();

			// Pulse action that adds original events
			action();    // some repeater events might be here too, interleved with original events!!!

			// Display measures.
			// var statistics = neo4j.getStatistics();
			// console.log("Page Request time: " + statistics.pageRequestTime + " milliseconds.");
			// console.log("Page Request data queries: " + statistics.dataQueries);
			// console.log("Page Request data query time: " + statistics.dataQueryTime + " milliseconds.");

			liquid.blockSideEffects(function() { // TODO: Block writings to server.
				// Refresh user interface typically
				liquid.noModeDirtyRepeatersCallback.forEach(function(callback) { callback() }); // No events or repeaters can trigger here (except for local data inside call).
			});
	
			// Propagate changes, up down and sideways.
			liquid.pushDataDownstream(); // Do not send just the change to originator of pulse, but send if any selectoin has changed.
			liquid.pushDataUpstream();
			liquid.pushDataToPersistentStorage();
	
			liquid.activePulse = null;
		});
	};

	
	liquid.pushDataDownstream = function(){};
	liquid.pushDataUpstream = function(){};
	liquid.pushDataToPersistentStorage = function(){};

	liquid.startOrAddToPulse = function(event) {
		if (liquid.activePulse === null) {
			liquid.pulse('local', function() { // We assume it is a local pulse if not explicitly started. 
				liquid.activePulse.add(event);
			});// Here the pulse is finished.
			return;
		}
		liquid.activePulse.add(event);
	};


	/**
	 *  After repeaters callback. Typically user interface update hooks.
	 */
	liquid.noModeDirtyRepeatersCallback = [];
	liquid.addNoMoreDirtyRepeaterCallback = function(callback) {
		liquid.noModeDirtyRepeatersCallback.push(callback);
	};

	var lockModel = 0;  //Model = all liquid entites that are not created within call
	var createdEntitiesInCall = null;
	liquid.withoutChangingModel = function(action) {
		if (lockModel == 0) {
			createdEntitiesInCall = [];
		}
		lockModel++;
		action();
		lockModel--;
		if (lockModel == 0) {
			createdEntitiesInCall = null;
		}
	};



	/**--------------------------------------------------------------
	 *                   Detailed Observation
	 *
	 *    The core of change detection and property/relation observation
	 *----------------------------------------------------------------*/

	/***
	 * Relations
	 */
	liquid.notifyGettingRelation = function(object, definition, instance) {
		// Do not start pulse. Getters are completley safe. Only writing to the model should start a pulse!
		// console.log("notifyGettingRelation: " + object.__() + "." + definition.name);
		liquid.setupObservation(object, instance);
	};

	liquid.notifySettingRelation = function(object, definition, instance, value, previousValue) {
		liquid.pauseRepeaters(function() {
			// liquid.recordersDirty(instance.observers);
			// liquid.startOrAddToPulse({redundant: true,  action: 'settingRelation', object: object, definition: definition, instance: instance, value: value, previousValue: previousValue});
			liquid.notifyDeletingRelation(object, definition, instance, previousValue);
			liquid.notifyAddingRelation(object, definition, instance, value);
		});
	};

	liquid.notifyAddingRelation = function(object, definition, instance, relatedObject){
		liquid.recordersDirty(instance.observers);
		liquid.startOrAddToPulse({redundant: false, action: 'addingRelation', object: object, definition: definition, instance: instance, relatedObject: relatedObject});
	};

	liquid.notifyAddReverseRelation = function(object, definition, instance, relatedObject) {
		liquid.recordersDirty(instance.observers);
		// liquid.startOrAddToPulse({redundant: true, action: 'addingReverseRelation', object: object, definition: definition, instance: instance, relatedObject: relatedObject});
	};

	liquid.notifyDeletingRelation = function(object, definition, instance, relatedObject) {
		liquid.recordersDirty(instance.observers);
		liquid.startOrAddToPulse({redundant: false, action: 'deletingRelation', object: object, definition: definition, instance: instance, relatedObject: relatedObject});
	};

	liquid.notifyDeletingReverseRelation = function(object, definition, instance, relatedObject) {
		liquid.recordersDirty(instance.observers);
		// liquid.startOrAddToPulse({redundant: true, action: 'deletingReverseRelation', object: object, definition: definition, instance: instance, relatedObject: relatedObject});
	};

	liquid.notifyRelationReordered = function(object, definition, instance, relationData) {
		// console.log("notifySettingProperty: " + object.__() + "." + propertyDefinition.name + " = " + newValue);
		liquid.recordersDirty(instance.observers);
		// liquid.startOrAddToPulse({redundant: true, action: 'relationReordered', object: object, definition: definition, instance: instance, relatedObject: relatedObject});
	};



	/***
	 * Properties
	 */
	liquid.notifyGettingProperty = function(object, definition, instance) {
		// console.log("notifyGettingProperty: " + object.__() + "." + propertyDefinition.name);
		liquid.setupObservation(object, instance);
	};

	liquid.notifySettingProperty = function(object, definition, instance, newValue, oldValue) {
		liquid.recordersDirty(instance.observers);
		liquid.startOrAddToPulse({redundant: false, action: 'settingProperty', object: object, definition: definition, instance: instance, newValue: newValue, oldValue: oldValue});
	};




	/**--------------------------------------------------------------
	*                 Class handling
	*----------------------------------------------------------------*/
	/**
	 * Node schema registration
	 */	
	liquid.classRegistry = {};
	liquid.classRegistryLinked = false;

	liquid.registerClass = function (classDefinition) {
		liquid.classRegistry[classDefinition.name] = classDefinition; 
	};
	
	liquid.getTagName = function(liquidClass) {
		if (typeof(liquidClass._extends) !== 'undefined') {
			if (liquidClass._extends.name == 'Entity') {
				return liquidClass.name;
			} else {
				return liquid.getTagName(liquidClass._extends);
			}
		} else {
			return 'Entity';
		}
	};

	liquid.linkClasses = function() {
		// debugger;
		// console.log("Linking classes!");
		// console.log(liquid.classRegistry);
		// console.log(Object.keys(liquid.classRegistry));
		for(var liquidClassName in liquid.classRegistry) {
			// console.log(liquidClassName);
			var liquidClass = liquid.classRegistry[liquidClassName];
			// console.log(liquidClass);
			if (typeof(liquidClass._extends) !== 'undefined') {
				// console.log("setting _extends to");
				// console.log(liquid.classRegistry[liquidClass._extends]);
				liquidClass._extends = liquid.classRegistry[liquidClass._extends];
			}
		}
		
		// Set tag names
		for(var liquidClassName in liquid.classRegistry) {
			var liquidClass = liquid.classRegistry[liquidClassName];
			liquidClass.tagName = liquid.getTagName(liquidClass);
		}
	};
	
	liquid.createPrototypes = function() {
		// Create prototypes
		for(var liquidClassName in liquid.classRegistry) {
			var liquidClass = liquid.classRegistry[liquidClassName];
			// console.log("Creating prototype for " + liquidClassName);
			var objectPrototype = liquid.createAugmentedClassInstance(liquidClassName, true);
			liquidClass.liquidObjectPrototype = objectPrototype;
		}
	}
	
	liquid.ensureClassRegistryLinked = function() {
		if (!liquid.classRegistryLinked) {
			liquid.linkClasses();
			liquid.createPrototypes();
			liquid.classRegistryLinked = true;
		}
	};
	
	liquid.addMethodsRecursivley = function(liquidClass, object) {
		// console.log("add methods recursivley " + liquidClass.name);
		if (typeof(liquidClass._extends) !== 'undefined') {
			liquid.addMethodsRecursivley(liquidClass._extends, object);
		} 
		object.classNames[liquidClass.name] = true;
		liquidClass.addMethods(object);
	};

	liquid.addClassMethods = function(object) {
		if (typeof(object.classNames) === 'undefined') {
			object.classNames = {};
		}
		// console.log("add class methods " + object.className);
		liquid.addMethodsRecursivley(object.class, object);
	};
	
	liquid.addClassPropertiesAndRelations = function(object) {
		liquid.addPropertiesAndRelationsRecursivley(object.class, object);
	};
	
	liquid.addingPropertiesAndRelationsForClass = null;
	liquid.addPropertiesAndRelationsRecursivley = function(liquidClass, object) {
		// console.log(liquidClass);
		if (typeof(liquidClass._extends) !== 'undefined') {
			liquid.addPropertiesAndRelationsRecursivley(liquidClass._extends, object);
		}
		liquid.addingPropertiesAndRelationsForClass = liquidClass;
		liquidClass.addPropertiesAndRelations(object);
		liquid.addingPropertiesAndRelationsForClass = null;
	};

	liquid.normalizeProperties = function(registerClass) {
		registerClass._propertyDefinitions.forEach(function(property) {
			liquid.normalizeProperty(property);
		});
	};
	
	liquid.createPropertyStructure = function(propertyData, details) {
		liquid.normalizeProperty(propertyData, details);
		return propertyData;
	};
	
	liquid.normalizeProperty = function(property, details) {
		property.type = "property";
		// Security
		if (typeof(details) !== 'undefined' && (typeof(details.readOnly) !== 'undefined' || typeof(details.readAndWrite) !== 'undefined')) {
			property.securityInfo = true;
			property.readOnly = arrayToMap(details.readOnly);
			property.readAndWrite = arrayToMap(details.readAndWrite);
		} else {
			property.securityInfo = false;
		}
		
		// Interpret undefined as false
		if(typeof(property.type) == 'undefined') property.type = 'string';
		if(typeof(property.defaultValue) == 'undefined') property.defaultValue = '';
		var plural = camelCaseToPlural(property.name);
		// console.log(property.name + " > " + plural);
		if(typeof(property.plural) === 'undefined') property.plural = camelCaseToPlural(property.name);
		
		// Setup property names
		property.getterName = "get" + capitaliseFirstLetter(property.name);
		property.setterName = "set" + capitaliseFirstLetter(property.name);		
	};

	// liquid.normalizeRelations = function(registerClass) {
		// registerClass._relationDefinitions.forEach(function(relation) {
			// liquid.normalizeRelation(relation);
		// });
	// };
	
	
	// liquid.createRelation = function(relationData, details) {
		// liquid.normalizeRelation(relationData, details);
		// return relationData;
	// };
	
	liquid.normalizeRelation = function(definition, details) {
		property.type = "relation";
		// definition.isLoaded = false;
		// Interpret undefined as false
		if(typeof(definition.isSet) == 'undefined') definition.isSet = false;
		// if(typeof(definition.isBidirectional) == 'undefined') definition.isBidirectional = false;
		if(typeof(definition.incomingRelationQualifiedName) == 'undefined') {
			definition.incomingRelationQualifiedName = null;
			definition.incomingRelationClassName = null;
			definition.incomingRelationName = null;
			definition.isReverseRelation = false;
		} else {
			var splitted = definition.incomingRelationQualifiedName.split("_");
			definition.incomingRelationClassName = splitted[0];
			definition.incomingRelationName = splitted[1];
			definition.isReverseRelation = true;
		}

		// Security
		if (typeof(details) !== 'undefined' && (typeof(details.readOnly) !== 'undefined' || typeof(details.readAndWrite) !== 'undefined')) {
			if (!definition.isReverseRelation) {
				definition.securityInfo = true;
				definition.readOnly = arrayToMap(details.readOnly);
				definition.readAndWrite = arrayToMap(details.readAndWrite);
			} else {
				// console.log(definition);
				throw "Cannot have security settings for reverse relation!";
				definition.securityInfo = false;
			}
		} else {
			definition.securityInfo = false;
		}

		var plural = camelCaseToPlural(definition.name);
		// console.log(definition.name + " > " + plural);
		if(typeof(definition.plural) === 'undefined') definition.plural = camelCaseToPlural(definition.name);

		definition.qualifiedName = liquid.addingPropertiesAndRelationsForClass.name + '_' + definition.name;
		
		// Setup definition names
		if (!definition.isSet) {
			// definition.getterName = definition.name;
			definition.getterName = "get" + definition.name;
			definition.setterName = "set" + definition.name;
		} else {
			definition.getterName = "get" + definition.plural;
			definition.setterName = "set" + definition.plural;
			definition.adderName = 'add' + definition.name;
			definition.removerName = 'remove' + definition.name;
			definition.forAllName = 'forAll' + definition.plural;
		}
	};
	
	/**--------------------------------------------------------------
	*               Generic relation loading interface
	*----------------------------------------------------------------*/
		
	liquid.logData = function(data) {
		if (data === null) {
			//console.log("null");
		} else if (isArray(data)) {
			var logArray = [];
			data.forEach(function(child) {
				logArray.push(child.__());
			});
			//console.log(logArray);
		} else if(typeof(data) === 'object'){
			//console.log(data.__());
		} else {
			//console.log(data);			
		}
	};
		
	liquid.loadSingleRelation = function(object, definition, instance) {
		instance.data = null;
		//console.log("loadSingleRelation: " + object.__() + " -- [" + definition.name + "] --> ?");
		// throw new Exception("Not implemented!");
		return instance.data;
	};

	liquid.ensureIncomingRelationLoaded = function(object, incomingRelationName) {
		// console.log("ensureIncomingRelationLoaded: " + object.__() + " <-- [" + incomingRelationName + "] -- ?");
		// throw new Exception("Not implemented!");
	};
		
	liquid.loadSetRelation = function(object, definition, instance) {
		instance.data = [];
		// console.log("loadSetRelation: " + object.__() + " -- ["+ definition.qualifiedName + "] --> ?");
		// throw new Exception("Not implemented!");
	};

	liquid.loadReverseSetRelation = function(object, definition, instance) {
		// Load relation
		console.log("loadReverseSetRelation: " + object.__() + " <-- ["+ definition.incomingRelationQualifiedName + "] --?");
		liquid.ensureIncomingRelationLoaded(object, definition.incomingRelationQualifiedName);
		
		var set = [];
		// the reverse relations will be set here as a consequence of getting the incoming relations. 
		if (typeof(object.incomingRelations[definition.incomingRelationQualifiedName]) !== 'undefined') {
			var incomingRelationMap = object.incomingRelations[definition.incomingRelationQualifiedName];
			for (incomingId in incomingRelationMap) {
				var object = incomingRelationMap[incomingId];
				// if (allowRead(object, liquid.page)) {
				set.push(object);
				// }
			}
		}
		instance.data = set;
		// Setup sorting
		liquid.setupRelationSorting(object, definition, instance);
		liquid.logData(instance.data);
	};
		
	
	liquid.setupRelationSorting = function(object, definition, instance) {
		var objectArraysSame = function(firstArray, secondArray) {
			if (firstArray.length !== secondArray.length) {
				return false;
			}
			var index = 0;
			while(index < firstArray.length) {
				if (firstArray[index] !== secondArray[index]) {
					return false;
				}
				index++;
			}
			return true;
		};
		
		// console.log("setupRelationSorting: " + definition.name);
		if (typeof(definition.compareFunction) !== 'undefined') {
			// Setup sorting
			var previousSorting = null;
			var repeater = liquid.repeatOnChange(function() {
				instance.data.sort(definition.compareFunction);
				if (previousSorting == null || !objectArraysSame(previous, instance.data)) {
					liquid.notifyRelationReordered(object, instance, instance.data);
				}
				previousSorting = copyArray(instance.data);
			});
			instance.sortRepeater = repeater;
		} else {
			// Just sort once. Ids will never change, so we do not repeat until element changed
			instance.data.sort(function(a, b) { return a._id - b._id }); // Default, sort by ID. 
		}
	};
	
	liquid.sortRelationOnElementChange = function(definition, instance) {
		if (typeof(instance.sortRepeater) !== 'undefined') {
			liquid.repeaterDirty(instance.sortRepeater);
		} else {
			// Just sort once. Ids will never change, so we do not repeat until element changed
			instance.data.sort(function(a, b) { return a._id - b._id }); // Default, sort by ID. 			
		}
	};
	

	/**--------------------------------------------------------------
	*                 Object structure
	*----------------------------------------------------------------*/

	var nextLocalId = 1;

	/**
	 * Example usage:
	 *   create('Dog');
	 *   create('Dog', {name: 'Fido', owner: aPerson});  // implicit call to init. 
	 *   create('Dog', {name: 'Fido', owner: aPerson}, 'aPersonsDog'); // 'aPersonsDog' is a projection id. See info about projections. 
	 *   create('Dog', 'aPersonsDog', {name: 'Fido', owner: aPerson});
	 * @param className
     */
	liquid.create = function(className) { // optional: object initData  optional: string/integer projectionId
		// Get parameters		
		var projectionId = null;
		var initData = {};
		if (arguments.length > 1) {
			if (typeof(arguments[1]) === 'object') {
				initData = arguments[1];
			} else {
				projectionId = arguments[1];
			}
		}
		if (arguments.length > 2) {
			if (typeof(arguments[1]) === 'object') {
				initData = arguments[1];
			} else {
				projectionId = arguments[1];
			}
			if (typeof(arguments[2]) === 'object') {
				initData = arguments[2];
			} else {
				projectionId = arguments[2];
			}
		}
		
		// Create class instance
		var object = liquid.createClassInstance(className);
		
		// Setup projection id. 
		if (liquid.isProjecting()) {
			var projection = liquid.activeProjection();
			if (projectionId == null) {
				projectionId = "autogeneratedProjectionId: " + projection.nextAutogeneratedProjectionId++; 
			}
			object._projection = projection; 
			object._projectionId = projectionId;
			projection.temporaryProjectionIdToObjectMap[projectionId] = object;
		}
		
		// Init
		object.init(initData);

		// Set object signum for easy debug
		object._ = object.__();

		// Note that this object was created in a specific call
		if (liquid.isBlockingSideEffects()) {
			liquid.activeSideEffectBlocker().createdObjects[object._id] = true;
		}

		return object;
	};
	
	// Creates a blank instance, without data or id! Just Interface. 
	liquid.createClassInstance = function(className) {
		var liquidClass = liquid.classRegistry[className];
		// console.log("============  asfasdf");
		// console.log(liquidClass);
		// console.log(liquidClass.liquidObjectPrototype);
		var object = Object.create(liquidClass.liquidObjectPrototype);
		// console.log(object);
		liquid.cloneCommonInstanceFields(object, liquidClass.liquidObjectPrototype);
		object._id = nextLocalId++;
		object._ = object.__();
		
		liquid.idObjectMap[object._id] = object;
		return object;
	};
	
	
	liquid.createAugmentedClassInstance = function(className, invisible) {
		var liquidClass = liquid.classRegistry[className];
		var object = liquid.createCommonObjectStructure({
			_id : null, 
			class : liquidClass,
			className : className,
		});	
		liquid.setupObject(object);

		if (!invisible) {
			object._id = nextLocalId++;
			object._ = object.__();
			liquid.idObjectMap[object._id] = object;
		}
		return object;		
	};
	
	
	liquid.createCommonObjectStructure = function(values) {
		var object = {
			// General for class
			class : null,
			className : null,
			classNames : {},   // All class names, even inherited ones. 			
			_relationDefinitions : {},   // relationName (qualified?) -> relation
			_propertyDefinitions: {},   // propertyName -> property
			_reverseRelations : {}  // qualifiedRelationName of incoming relation -> relation
		};
		liquid.addCommonInstanceFields(object);
		for (property in values) {
			object[property] = values[property];
		}
		return object;
	};
	
	liquid.cloneCommonInstanceFields = function(object, prototypeObject) {
		// function cloneInstance(instance) {
		// }
		object._id = null;
		object._upstreamId = null;
		object._persistentId = null;
		object._globalId = null;
		object._persistedDirectly = false;
		
		object.incomingRelations = clone(prototypeObject.incomingRelations);   // A general store of all incoming relations. This way we always have back-references!!! (this is important for any kind of garbage collection, or freeing up of memory)
		// Note:  Clone will only work as long as instance data is empty!
		object._relationInstances = clone(prototypeObject._relationInstances);   // relationName (qualified?) -> relation
		object._propertyInstances = clone(prototypeObject._propertyInstances);   // propertyName -> property		

		// Client only
		object.noDataLoaded = false;  // Means, if any more information that entity id and class name has been loaded. Only used on client? 
		object.loadedSelections = {};  // Details the extent of loading. Only used on client? 

		// Server only
		object._observingPages = {};
		object.incomingRelationsComplete = {}; // Server only		
	};
	
	liquid.addCommonInstanceFields = function(object) {
		// Specific for object
		object._id = null;
		object._upstreamId = null;
		object._persistentId = null;
		object._globalId = null;
		object._persistedDirectly = false;

		object.incomingRelations = {};   // A general store of all incoming relations. This way we always have back-references!!! (this is important for any kind of garbage collection, or freeing up of memory)
		object._relationInstances = {};   // relationName (qualified?) -> relation
		object._propertyInstances = {};  // propertyName -> property		

		// Client only
		object.noDataLoaded = false;  // Means, if any more information that entity id and class name has been loaded. Only used on client? 
		object.loadedSelections = {};  // Details the extent of loading. Only used on client? 

		// Server only
		object._observingPages = {};
		object.incomingRelationsComplete = {}; // Server only
	};
		
	
	/**--------------------------------------------------------------
	*              Modification of incoming relations
	*----------------------------------------------------------------*/
		
	liquid.addIncomingRelation = function(object, incomingRelationQualifiedName, referingObject) {
		// console.log("addIncomingRelation: " + object.__() + " <-- [" + incomingRelationQualifiedName + "]-- " + referingObject.__());
		// Add in incoming relations, create a new map if necessary
		if (typeof(object.incomingRelations[incomingRelationQualifiedName]) === 'undefined') {
			object.incomingRelations[incomingRelationQualifiedName] = {};
		}
		object.incomingRelations[incomingRelationQualifiedName][referingObject._id] = referingObject;

		// Update data of any reverse relation
		if (typeof(object._reverseRelations[incomingRelationQualifiedName]) !== 'undefined') {
			var reverseDefinition = object._reverseRelations[incomingRelationQualifiedName];
			var reverseInstance = object._relationInstances[reverseDefinition.qualifiedName];
			if (reverseDefinition.isSet) {
				if (typeof(reverseInstance.data) === 'undefined') {
					reverseInstance.data = [];
				}
				reverseInstance.data.push(referingObject);
				liquid.sortRelationOnElementChange(reverseDefinition, reverseInstance);									
			} else {
				reverseInstance.data = referingObject;
			}
			// delete object._reverseRelations[incomingRelationQualifiedName].data; // TODO: not just delete the data, update it!
			liquid.notifyAddReverseRelation(object, reverseDefinition, reverseInstance);
		}
	};


	liquid.deleteIncomingRelation = function(object, incomingRelationQualifiedName, referingObject) {
		// return;
		// console.log("deleteIncomingRelation: " + object.__() + " <-X- [" + incomingRelationQualifiedName + "]--" + referingObject.__());
		delete object.incomingRelations[incomingRelationQualifiedName][referingObject._id]; // Note, this HAS to exist here. Every link should have a back link!	

		// Delete data of any reverse relation
		var reverseDefinition = object._reverseRelations[incomingRelationQualifiedName];
		var reverseInstance = object._relationInstances[reverseDefinition.qualifiedName];
		if (typeof(reverseInstance.data) !== 'undefined') {
			if (reverseDefinition.isSet) {
				removeFromArray(referingObject, reverseInstance.data);
			} else {
				reverseInstance.data = null
			}
			liquid.notifyDeletingReverseRelation(object, reverseDefinition, reverseInstance);
		}
	};
	
	
	
	/**--------------------------------------------------------------
	*                 Object Augmentation
	*----------------------------------------------------------------*/

	/*
	 * Setup object
	 */	
	liquid.setupObject = function(object) {
		// Add properties and relations
		object.addProperty = function(name, defaultValue, details) {
			liquid.addProperty(object, name, defaultValue, details);
		};
		
		object.addRelation = function(name, cardinality, details) {
			liquid.addRelation(object, name, cardinality, details);
		};

		object.addReverseRelationTo = function(baseRelation, name, cardinality, details) {
			liquid.addReverseRelationTo(object, baseRelation, name, cardinality, details);
		};
		
		liquid.addClassPropertiesAndRelations(object);
		delete object.addProperty;
		delete object.addRelation;
		delete object.addReverseRelation;
		
		// Add methods and repeaters
		object.addMethod = function(methodName, method) {
			var methodWithPossibleSecurity = method;
			if (arguments.length > 2 && liquid.onServer) {
				var methodRoleOnServer = arguments[2];
				methodWithPossibleSecurity = function() {
					method.apply(this, argumentsToArray(argumentList));
				};
			}
			
			object[methodName] = methodWithPossibleSecurity;
		};
		
		object.overrideMethod = function(methodName, method) {
			var parent = object[methodName];
			if (arguments.length > 2 && liquid.onServer) {
				throw "Error: Cannot change method role on inherited function!"
			}

			// Note: this is important, because in a repeatOnChange we can track what methods are overwritten on the server, so we know they can only be called on the server. 
			object[methodName] = function() {
				// console.log("In overridden function");
				var argumentList = argumentsToArray(arguments);
				argumentList.unshift(parent.bind(this));
				return method.apply(this, argumentList);
			}
		};
		
		
		// Add methods, direct, cached and repeated.
		liquid.addGenericMethodCacher(object);
		liquid.addGenericProjection(object);
		liquid.addGenericRelationBrowsing(object);
		liquid.addClassMethods(object);
		delete object.addMethod;
		delete object.overrideMethod;
		
		// Utilities ? 
		// liquid.setupStreaming(object);
		// liquid.setupIterators(object);
		// liquid.setupPartsAndContainerIterators(object);
		// liquid.setupVersionControl(object);
		// liquid.setupCopying(object);	
	};

	liquid.addGenericRelationBrowsing = function(object) {
		object['forAllRelations'] = function(callback) {
			for (relationQualifiedName in this._relationDefinitions) {
				var definition = this._relationDefinitions[relationQualifiedName];
				var instance = this._relationInstances[relationQualifiedName];
				callback(definition, instance);
			} 
		};

		object['forAllOutgoingRelatedObjects'] = function(callback) {
			for (relationQualifiedName in this._relationDefinitions) {
				var definition = this._relationDefinitions[relationQualifiedName];
				if (!definition.isReverseRelation) {
					var instance = this._relationInstances[relationQualifiedName];
					if (definition.isSet) {
						instance.data.forEach(function(relatedObject) {
							callback(definition, instance, relatedObject);
						});
					} else {
						callback(instance.data);
					}
				}
			}
		};

		object['forAllIncomingRelations'] = function (callback) {
			//TODO
		};
		
		object['forAllOutgoingRelations'] = function (callback) {
			for (relationQualifiedName in object._relationDefinitions) {
				var definition = object._relationDefinitions[relationQualifiedName];
				if (!definition.isReverseRelation) {
					var instance = object._relationInstances[relationQualifiedName];
					callback(definition, instance);
				}
			}
		};
		
		object['forAllProperties'] = function(callback) {
			for (definitionName in object._propertyDefinitions) {
				var definition = object._propertyDefinitions[definitionName]; 
				var instance = object._propertyInstances[definitionName];
				callback(definition, instance);
			}
		};
	};
	
	/*-------------------
	*     Properties
	*--------------------*/

	/**
	 * Properties
	 */	
	liquid.addProperty = function(object, name, defaultValue, details) {
		liquid.addPropertyInfo(
			object, 
			liquid.createPropertyStructure({
				name : name,
				type : 'this is not used?',
				defaultValue : defaultValue, 
			}, details)
		);
	};

		
	var allowRead = function(object, definition) {
		return true;
		var user = page.getUser();
		return object.cachedCall('allowRead', user) || object.cachedCall('allowReadAndWrite', user);
	};

	
	var allowWrite = function(object, page) {
		return true;
		return object.cachedCall('allowReadAndWrite', page.getUser());
	};


	
	liquid.addPropertyInfo = function(object, definition) {
		var instance = {observers : {}};
		object._propertyDefinitions[definition.name] = definition;
		object._propertyInstances[definition.name] = instance; // This is only used in object augmentation mode. 
		
		// Initialize getter
		object[definition.getterName] = function() {
			if (typeof(instance.data) !== 'undefined') {
				var instance = this._propertyInstances[definition.name];
				liquid.notifyGettingProperty(object, definition, instance);
				return instance.data;
			} else {
				// return clone(definition.defaultValue);
				return definition.defaultValue;
			}
		};
		
		// Initialize setter
		object[definition.setterName] = function(value) {
			var instance = this._propertyInstances[definition.name];
			var oldValue = instance.data;
			if (value != oldValue) {
				if (allowWrite(this, liquid.page)) {
					instance.data = value;
					liquid.notifySettingProperty(this, definition, instance, value, oldValue);
				} else {
					console.log("Access violation: " + this.__() + "." + definition.setterName + "(...) not allowed by page/user");
				}
			}
		};
	};


	/*------------------
	*     Relations
	*-------------------*/

	liquid.addRelation = function(object, name, cardinality, details) {
		// Convert to old style relation convention. 
		var relationDefinition = {
			name: name,
			isSet: cardinality === 'toMany',
			details: details,
			orderProperty: null, // TODO: remove
			orderDirection: null // TODO: remove
			// data: data has to be undefined when not loaded, as null could mean a null relationship 
			// observers: {}
		};
		var relationInstance = {  // Not used if object is a prototype
			observers: {}
		}
		liquid.normalizeRelation(relationDefinition, details);
		liquid.registerRelation(object, relationDefinition, relationInstance);
		
		// Init explorative calls
		// liquid.addGettersAndSetters(object, relation); //???
		if (!relationDefinition.isSet) {
			liquid.addSingleRelationInfo(object, relationDefinition);
		} else {
			liquid.addSetRelationInfo(object, relationDefinition);		
		}
	};

	liquid.registerRelation = function(object, definition, instance) {
		// console.log("registerRelation: " + definition.name);
		// if (typeof(object._relationDefinitions[definition.qualifiedName]) !== 'undefined') {
		// 	throw new Exception("Cannot have two relations of the same name on one single object. Consider inherited relations of the same name, or relations in the same class that has the same name.");
		// }
		object._relationDefinitions[definition.qualifiedName] = definition;
		object._relationInstances[definition.qualifiedName] = instance;  // Only used in object augmentation mode

		if (definition.isReverseRelation) {
			object._reverseRelations[definition.incomingRelationQualifiedName] = definition; // To instance also?
		}
	}
	
	liquid.addReverseRelationTo = function(object, otherRelationQualifiedName, name, cardinality, details) {
		// var isReverseRelationOfParts = isReverseRelationOf.split('.');
		// Convert to old style relation convention. 
		var relationDefinition = {
			incomingRelationQualifiedName: otherRelationQualifiedName,
			name: name,
			isSet: cardinality === 'toMany',
			details: details,
			orderBy: null
		};
		var relationInstance = { // Not used if object is a prototype
			observers: {}
		};
		liquid.normalizeRelation(relationDefinition, details);
		liquid.registerRelation(object, relationDefinition, relationInstance);
		
		// Init explorative calls
		if (!relationDefinition.isSet) {
			liquid.addSingleRelationInfo(object, relationDefinition);
		} else {
			liquid.addSetRelationInfo(object, relationDefinition);		
		}
	};

	
	// Access funcitons setters and setters. 
	liquid.addSingleRelationInfo = function(object, definition) {
		// Init getter
		if(!definition.isReverseRelation) {
			object[definition.getterName] = function() {
				if (allowRead(this, liquid.page)) {
					var instance = this._relationInstances[definition.qualifiedName];
					liquid.notifyGettingRelation(this, definition, instance);
					if (typeof(instance.data) === 'undefined') {
						// if (this.isSaved) {
						var relatedObject = liquid.loadSingleRelation(this, definition, instance);
						if (relatedObject !== null) {
							liquid.addIncomingRelation(relatedObject, definition.qualifiedName, this);
						}
						instance.data = relatedObject;
					}
					return instance.data;
				} else {
					console.log("Access violation: " + this.__() + "." + definition.getterName + "() not allowed by page/user");
					return clone(definition.defaultValue);
				}
			};
		} else {
			object[definition.getterName] = function() {
				// if (allowRead(this, definition)) {
				var instance = this._relationInstances[definition.qualifiedName];
				liquid.notifyGettingRelation(this, definition, instance);
				if (typeof(instance.data) === 'undefined') {
					// if (this.isSaved) {
					instance.data = null;
					liquid.ensureIncomingRelationLoaded(this, definition.incomingRelationName);

					// Return the first one or null
					var incomingRelationQualifiedName = definition.incomingRelationQualifiedName;
					// console.log(incomingRelationQualifiedName);
					if (typeof(this.incomingRelations[incomingRelationQualifiedName]) !== 'undefined') {
						var incomingRelationMap = this.incomingRelations[incomingRelationQualifiedName];
						// console.log(this.incomingRelations);
						// console.log(incomingRelation);
						incomingRelationIds = Object.keys(incomingRelationMap);
						if (incomingRelationIds.length !== 0) {
							instance.data = incomingRelationMap[incomingRelationIds[0]];
						}
					}
				}
				return instance.data;
				// } else {
					// console.log("Access violation: " + this.__() + "." + definition.getterName + "() not allowed by page/user");
					// return clone(definition.defaultValue);
				// }
			}
		}
				
		
		// Init setter
		if(!definition.isReverseRelation) {
			// delete object.allLoadedRelations;
			object[definition.setterName] = function(newValue) {
				var previousValue = this[definition.getterName]();
				if (previousValue != newValue) {
					if (allowWrite(this, liquid.page)) {
						// Delete previous relation.
						if (previousValue !== null) {
							liquid.deleteIncomingRelation(previousValue, definition.qualifiedName, this);
						}

						// Set new relation.
						var instance = this._relationInstances[definition.qualifiedName];
						instance.data = newValue;
						if (newValue !== null) {
							liquid.addIncomingRelation(newValue, definition.qualifiedName, this);
						}
						liquid.notifySettingRelation(this, definition, instance, newValue, previousValue);
					} else {
						console.log("Access violation: " + this.__() + "." + definition.setterName + "(...) not allowed by page/user");
					}
				}
			}
		} else {
			// Just relays to the setter and getter of incoming relation, no security check here!
			var incomingRelationQualifiedName = definition.incomingRelationQualifiedName;
			object[definition.setterName] = function(newValue) {
				console.log(definition.setterName + "(...)");
				var previousValue = this[definition.getterName]();

				if (previousValue != null) {
					var incomingRelation = previousValue._relationDefinitions[incomingRelationQualifiedName];
					if (!incomingRelation.isSet) {
						// Relay to setter of incoming relation, to set to null
						var incomingSetterName = incomingRelation.setterName;
						newValue[incomingSetterName](null);
					} else {
						// Relay to remover of incoming relation
						var incomingRemoverName = incomingRelation.removerName;
						newValue[incomingRemoverName](this);  // Note: no need to call liquid.notifyDeleteIncomingRelationOnDelete(object, definition, instance); since this will be called by deleteIncomingRelation
					}
				}
				
				if (newValue != null) {
					// console.log("adding new value");
					// console.log(newValue._relationDefinitions);
					// console.log(incomingRelationQualifiedName);
					if (typeof(newValue._relationDefinitions[incomingRelationQualifiedName]) !== 'undefined') {
						var incomingRelation = newValue._relationDefinitions[incomingRelationQualifiedName];
						if (!incomingRelation.isSet) {
							// Relay to setter of incoming relation
							var incomingSetterName = incomingRelation.setterName;
							newValue[incomingSetterName](this);
						} else {
							// Relay to adder of incoming relation
							var incomingAdderName = incomingRelation.adderName;
							newValue[incomingAdderName](this);
						}
					} else {
						console.log("Error: New value did not have the right outgoing relation!");
						// Trying to set a reverse relation to a object that does not have the relation that the reverse relation is reverse to!
					}
				}
			}
		}
	};

	liquid.addSetRelationInfo = function(object, definition) { // data neo4j
		if(!definition.isReverseRelation) {
			// Init iterator
			object[definition.forAllName] = function(action) {
				if (allowRead(this, liquid.page)) {
					var instance = this._relationInstances[definition.qualifiedName];
					if (typeof(instance.data) === 'undefined') {
						liquid.loadSetRelation(this, definition, instance);
					}
					liquid.notifyGettingRelation(this, definition, instance);
					instance.data.forEach(function(child) {
						action(child);
					}.bind(this));
				} else {
					console.log("Access violation: " + this.__() + "." + definition.forAllName + "() not allowed by page/user");
				}
			};
			
			// Init getter
			object[definition.getterName] = function() {
				if (allowRead(this, liquid.page)) {
					// console.log("setRelationGetter");
					var instance = this._relationInstances[definition.qualifiedName];
					// console.log(instance);
					if (typeof(instance.data) === 'undefined') {
						liquid.loadSetRelation(this, definition, instance);
					}
					// console.log("instance.data:");
					// console.log(instance.data);
					liquid.notifyGettingRelation(this, definition, instance);
					return instance.data;
				} else {
					console.log("Access violation: " + this.__() + "." + definition.forAllName + "() not allowed by page/user");
					return [];
				}
			};

			// Init setter (just a relay function, uses adder and remover)
			object[definition.setterName] = function(newSet) {
				var instance = this._relationInstances[definition.qualifiedName];
				if (typeof(instance.data) === 'undefined') {
					liquid.loadSetRelation(this, definition, instance);
				}
				var difference = arrayDifference(newSet, instance.data);
				difference.added.forEach(function(added) {
					this[definition.adderName](added);
				}.bind(this));
				difference.removed.forEach(function(removed) {
					this[definition.removerName](removed);
				}.bind(this));
			};
			
			// Init adder
			object[definition.adderName] = function(added) {
				console.log(definition.adderName + "(...)");
				if (allowWrite(this, liquid.page)) {
					// console.log("Set relation adder");
					// console.log(relation);
					var instance = this._relationInstances[definition.qualifiedName];
					if (typeof(instance.data) === 'undefined') {
						liquid.loadSetRelation(this, definition, instance);
					}
					// TODO: Assert not already in array!
					liquid.addIncomingRelation(added, definition.qualifiedName, this);

					instance.data.push(added); //TODO: Create copy of array here?
					liquid.sortRelationOnElementChange(definition, instance);

					liquid.notifyAddingRelation(this, definition, instance, added);
				} else {
					console.log("Access violation: " + this.__() + "." + definition.setterName + "(...) not allowed by page/user");
				}
			};
			
			// Init remover
			object[definition.removerName] = function(removed) {
				if (allowWrite(this, liquid.page)) {
					// console.group(this.__() + "." + definition.removerName + "(" + removed.__() + ")");
					var instance = this._relationInstances[definition.qualifiedName];
					if (typeof(instance.data) === 'undefined') {
						liquid.loadSetRelation(this, definition, instance);
					}
					liquid.deleteIncomingRelation(removed, definition.qualifiedName, this);
					// console.log(instance.data.length);
					// console.log(removed);
					// console.log(instance.data);
					removeFromArray(removed, instance.data); //TODO: Create copy of array here?
					// console.log(instance.data.length);

					liquid.notifyDeletingRelation(this, definition, instance, removed);
					// console.groupEnd();
				} else {
					console.log("Access violation: " + this.__() + "." + definition.setterName + "(...) not allowed by page/user");
				}
			}
		} else {
			var incomingRelationQualifiedName = definition.incomingRelationQualifiedName;
			
			// Init iterator
			object[definition.forAllName] = function(action) {
				var instance = this._relationInstances[definition.qualifiedName];		
				if (typeof(instance.data) === 'undefined') {
					liquid.loadReverseSetRelation(this, definition, instance);
				}
				liquid.notifyGettingRelation(this, definition, instance);
				instance.data.forEach(function(child) {
					action(child);
				}.bind(this));
			}
			
			// Init getter
			object[definition.getterName] = function() {
				// console.log(definition.getterName + "(...)");
				var instance = this._relationInstances[definition.qualifiedName];
				if (typeof(instance.data) === 'undefined') {
					liquid.loadReverseSetRelation(this, definition, instance);
				}
				liquid.notifyGettingRelation(this, definition, instance);
				// TODO filter out non accessable objects, if not administrator.
				return instance.data;
			}

			// Init setter (uses adder and remover  no notification and no actual manipulation)
			object[definition.setterName] = function(newSet) {
				// console.log(definition.setterName + "(...)");
				var instance = this._relationInstances[definition.qualifiedName];				
				if (typeof(instance.data) === 'undefined') {
					// console.log("Needs loading of relation");
					liquid.loadReverseSetRelation(this, definition, instance);
				}
				// console.log(instance.data);
				var difference = arrayDifference(newSet, instance.data);
				difference.added.forEach(function(added) {
					//console.log(definition.adderName);
					//console.log(this);
					this[definition.adderName](added);
				}.bind(this));
				difference.removed.forEach(function(removed) {
					this[definition.removerName](removed);
				}.bind(this));
			}
			
			// Init adder (just relays to incoming relation, no notification and no actual manipulation)
			object[definition.adderName] = function(added) {
				console.log(definition.adderName + "(...)");
				var incomingRelation = added._relationDefinitions[incomingRelationQualifiedName];
				// console.log(incomingRelation);
				if (incomingRelation.isSet) {
					added[incomingRelation.adderName](this);
				} else {
					added[incomingRelation.setterName](this);				
				}
			};
			
			// Init remover (just relays to incoming relation, no notification and no actual manipulation)
			object[definition.removerName] = function(removed) {
				console.log(definition.removerName + "(...)");
				var incomingRelation = removed._relationDefinitions[incomingRelationQualifiedName];
				if (incomingRelation.isSet) {
					removed[incomingRelation.removerName](this);
				} else {
					removed[incomingRelation.setterName](null);				
				}
			}
		}
	};

	liquid.subscribeToSelection = function(selection) {
		for (id in selection) {
			var object = selection[id];
			object._observingPages[liquid.requestingPage._id] = liquid.requestingPage;
		}
	};

	liquid.serializeSelection = function(selection) {
		var serialized = [];
		for (id in selection) {
			var object = liquid.idObjectMap[id];
			serialized.push(liquid.serializeObject(object, false));
		}
		return serialized;
	};

	
	liquid.serializeObject = function(object, forUpstream = false) {
		function serializedReference(object) {
			if (object !== null) {
				if (forUpstream) {
					if (object._upstreamId !== null) {
						return object.className + ":id:" + object._upstreamId;
					} else {
						return object.className + ":downstreamId:" + object._id;
					}
				} else {
					return object.className + ":" + object._id;
				}
			} else {
				return null;
			}
		};
		
		serialized = {};
		serialized._ = object.__();
		serialized.className = object.className;
		if (forUpstream) {
			if (object._upstreamId !== null) {
				serialized.id = object._upstreamId;
			} else {
				serialized.downstreamId = object._id;
			}
		} else {
			serialized.id = object._id;
		}
		for (relationQualifiedName in object._relationDefinitions) {
			var definition = object._relationDefinitions[relationQualifiedName];
			if (!definition.isReverseRelation) {
				if (definition.isSet) {
					serialized[definition.name] = object[definition.getterName]().map(serializedReference);
				} else {
					serialized[definition.name] = serializedReference(object[definition.getterName]());
				}
			}
		}
		for (propertyName in object._propertyDefinitions) {
			definition = object._propertyDefinitions[propertyName];
			serialized[definition.name] = object[definition.getterName]();
		}
		return serialized;
	};
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addCommonLiquidFunctionality = addCommonLiquidFunctionality;
} else {
	// global.addCommonLiquidFunctionality = addCommonLiquidFunctionality;
	
}
