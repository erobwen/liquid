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
	} 
	
	/**--------------------------------------------------------------
	*                 The id object map
	*----------------------------------------------------------------*/
 
	/**
	 * Id to node map, in order to assure correct identity of node. 
	 */ 
	liquid.idObjectMap = {};
	liquid.restart = function() {
		liquid.idObjectMap = {};
	}
	
	liquid.canLoadDataAsynchronously = false; // true for server, false for client.
	
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
			var objectPrototype = liquid.createAugmentedClassInstance(liquidClassName);
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
	
	liquid.createPropertyStructure = function(propertyData) {
		liquid.normalizeProperty(propertyData);
		return propertyData;
	};
	
	liquid.normalizeProperty = function(property) {
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

	liquid.normalizeRelations = function(registerClass) {
		registerClass._relationDefinitions.forEach(function(relation) {
			liquid.normalizeRelation(relation);
		});
	};
	
	
	liquid.createRelation = function(relationData) {
		liquid.normalizeRelation(relationData);
		return relationData;
	};
	
	liquid.normalizeRelation = function(definition) {
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
				logArray.push("(" + child.className + "." + child.id + ")");
			});
			//console.log(logArray);
		} else if(typeof(data) === 'object'){
			//console.log("(" + data.className + "." + data.id + ")");
		} else {
			//console.log(data);			
		}
	};
		
	liquid.loadSingleRelation = function(object, definition, instance) {
		//console.log("loadSingleRelation: (" + object.className + "." + object.id + ") -- [" + definition.name + "] --> ?");
		throw new Exception("Not implemented!");
	};

	liquid.ensureIncomingRelationLoaded = function(object, incomingRelationName) {
		// console.log("ensureIncomingRelationLoaded: (" + object.className + "." + object.id + ") <-- [" + incomingRelationName + "] -- ?");
		throw new Exception("Not implemented!");
	};
		
	liquid.loadSetRelation = function(object, definition, instance) {
		// console.log("loadSetRelation: (" + object.className + "." + object.id + ") -- ["+ definition.qualifiedName + "] --> ?");
		throw new Exception("Not implemented!");
	};

	liquid.loadReverseSetRelation = function(object, definition, instance) {
		// Load relation
		//console.log("loadReverseSetRelation: (" + object.className + "." + object.id + ") <-- ["+ definition.incomingRelationQualifiedName + "] --?");
		liquid.ensureIncomingRelationLoaded(object, definition.incomingRelationQualifiedName);
		
		var set = [];
		// the reverse relations will be set here as a consequence of getting the incoming relations. 
		if (typeof(object.incomingRelations[definition.incomingRelationQualifiedName]) !== 'undefined') {
			var incomingRelationMap = object.incomingRelations[definition.incomingRelationQualifiedName];
			for (incomingId in incomingRelationMap) {
				set.push(incomingRelationMap[incomingId]);
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
		} 
		
		// console.log("setupRelationSorting: " + definition.name);
		if (typeof(definition.compareFunction) !== 'undefined') {
			// Setup sorting
			var previousSorting = null;
			var repeater = liquid.repeatOnChange(function() {
				instance.data.sort(definition.compareFunction);
				if (previousSorting == null || !objectArraysSame(previous, instance.data)) {
					liquid.notifyChangeInRelation(object, instance, instance.data);
				}
				previousSorting = copyArray(instance.data);
			});
			instance.sortRepeater = repeater;
		} else {
			// Just sort once. Ids will never change, so we do not repeat until element changed
			instance.data.sort(function(a, b) { return a.id - b.id }); // Default, sort by ID. 
		}
	};
	
	liquid.sortRelationOnElementChange = function(definition, instance) {
		if (typeof(instance.sortRepeater) !== 'undefined') {
			liquid.repeaterDirty(instance.sortRepeater);
		} else {
			// Just sort once. Ids will never change, so we do not repeat until element changed
			instance.data.sort(function(a, b) { return a.id - b.id }); // Default, sort by ID. 			
		}
	};
	

	/**--------------------------------------------------------------
	*                    Primary Observation
	*
	* Primary observation makes no distinction between relations 
	* and reverse relations, both relations get notifications upon 
	* modification. This is to be used for change propagation.
	*
	* Primary observation also gets a notification upon load events, 
	* that makes previous unavailable data available. 
	*----------------------------------------------------------------*/
	
	// var tracePrimaryObservation = true;
	
	liquid.notifyGettingRelation = function(object, definition, instance) {
		// console.log("notifyGettingRelation: " + object._ + "." + definition.name);
		liquid.setupObservation(object, instance);
	};
	 
	liquid.notifyChangeInRelation = function(object, definition, instance, value) {
		// console.log("notifyChangeInRelation: " + object._ + "." + definition.name);
		liquid.holdChangePropagation(function() {
			for (id in instance.observers) {
				liquid.repeaterDirty(instance.observers[id]);
			}			
		});
	};


	liquid.notifyGettingProperty = function(object, propertyDefinition, propertyInstance) {
		// console.log("notifyGettingProperty: " + object._ + "." + propertyDefinition.name);
		liquid.setupObservation(object, propertyInstance);
	};
	 
	liquid.notifyChangeInProperty = function(object, propertyDefinition, propertyInstance, value) {
		// console.log("notifyChangeInProperty: " + object._ + "." + propertyDefinition.name);
		liquid.holdChangePropagation(function() {
			for (id in propertyInstance.observers) {
				liquid.repeaterDirty(propertyInstance.observers[id]);
			}			
		});
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
	liquid.notifySettingRelation = function(object, definition, instance, value, previousValue) {
		throw new Exception("Not implemented!");
	};

	liquid.notifyAddingRelation = function(object, definition, instance, relatedObject){
		throw new Exception("Not implemented!");
	};

	liquid.notifyDeletingRelation = function(object, definition, instance, relatedObject) {
		throw new Exception("Not implemented!");
	};


	/***
	 * Properties
	 */
	liquid.notifySettingProperty = function(object, propertyDefinition, propertyInstance, newValue, oldValue) {
		throw new Exception("Not implemented!");
	};


	
	/**--------------------------------------------------------------
	*                 Object structure
	*----------------------------------------------------------------*/

	var nextUniqueSessionId = 1;
	
	// Creates a blank instance, without data or id! Just Interface. 
	liquid.createClassInstance = function(className) {
		var liquidClass = liquid.classRegistry[className];
		var object = Object.create(liquidClass.liquidObjectPrototype);
		liquid.cloneCommonInstanceFields(object, liquidClass.liquidObjectPrototype);
		object.__uniqueSessionId = nextUniqueSessionId++;
		return object;
	};
	
	
	liquid.createAugmentedClassInstance = function(className) {
		var liquidClass = liquid.classRegistry[className];
		var object = liquid.createCommonObjectStructure({
			id : null, 
			class : liquidClass,
			className : className,
		});	
		liquid.setupObject(object);
		object.__uniqueSessionId = nextUniqueSessionId++;
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
			_reverseRelations : {},  // qualifiedRelationName of incoming relation -> relation
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
		object.id = null;
		object.isSource = true; // When set to false, this objects exists in underlying system and has an object id known by underlying system. Underlying system is either server or database depending on objects whereabouts, 			
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
		object.id = null;
		object.isSource = true, // When set to false, this objects exists in underlying system and has an object id known by underlying system. Underlying system is either server or database depending on objects whereabouts, 			
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
	
	liquid.addIncomingRelationOnLoad = function(object, incomingRelationQualifiedName, referingObject) {
		// return;
		// console.log("addIncomingRelationOnLoad: (" + object.className + "." + object.id + ") <-- [" + incomingRelationQualifiedName + "]--(" + referingObject.className + "." + referingObject.id + ")");
		// Add in incoming relations, create a new map if necessary
		if (typeof(object.incomingRelations[incomingRelationQualifiedName]) === 'undefined') {
			object.incomingRelations[incomingRelationQualifiedName] = {};
		}
		object.incomingRelations[incomingRelationQualifiedName][referingObject.id] = referingObject;
		
		// Consider: do notify change here, if there are listeners to load events!!..
		
		// Consider: update any reverse relation that is not fully loaded. 
	};
	
		
	liquid.addIncomingRelationOnAdd = function(object, incomingRelationQualifiedName, referingObject) {
		// return;
		// console.log("addIncomingRelationOnAdd: (" + object.className + "." + object.id + ") <-- [" + incomingRelationQualifiedName + "]--(" + referingObject.className + "." + referingObject.id + ")");
		// Add in incoming relations, create a new map if necessary
		if (typeof(object.incomingRelations[incomingRelationQualifiedName]) === 'undefined') {
			object.incomingRelations[incomingRelationQualifiedName] = {};
		}
		object.incomingRelations[incomingRelationQualifiedName][referingObject.id] = referingObject;

		// Update data of any reverse relation
		if (typeof(object._reverseRelations[incomingRelationQualifiedName]) !== 'undefined') {
			var reverseDefinition = object._reverseRelations[incomingRelationQualifiedName];
			var reverseInstance = object._relationInstances[reverseDefinition.qualifiedName];
			if (typeof(reverseInstance.data) !== 'undefined') {
				if (reverseDefinition.isSet) {
					reverseInstance.data.push(referingObject);
					liquid.sortRelationOnElementChange(reverseDefinition, reverseInstance);									
				} else {
					reverseInstance.data = referingObject;
				}
				// delete object._reverseRelations[incomingRelationQualifiedName].data; // TODO: not just delete the data, update it!
				liquid.notifyChangeInRelation(object, reverseDefinition, reverseInstance);				
			}
		}
	};


	liquid.deleteIncomingRelationOnDelete = function(object, incomingRelationQualifiedName, referingObject) {
		// return;
		//console.log("deleteIncomingRelationOnDelete: (" + object.className + "." + object.id + ") <-X- [" + incomingRelationQualifiedName + "]--(" + referingObject.className + "." + referingObject.id + ")");
		delete object.incomingRelations[incomingRelationQualifiedName][referingObject.id]; // Note, this HAS to exist here. Every link should have a back link!	

		// Delete data of any reverse relation
		var reverseDefinition = object._reverseRelations[incomingRelationQualifiedName];
		var reverseInstance = object._relationInstances[reverseDefinition.qualifiedName];
		if (typeof(reverseInstance.data) !== 'undefined') {
			if (reverseDefinition.isSet) {
				removeFromArray(referingObject, reverseInstance.data);
			} else {
				reverseInstance.data = null
			}
			liquid.notifyChangeInRelation(object, reverseDefinition, reverseInstance);
		}
	};
	
	liquid.deleteIncomingRelationOnUnload = function(object, incomingRelationQualifiedName, referingObject) {
		// return;
		//console.log("deleteIncomingRelationOnUnload: (" + object.className + "." + object.id + ") <-X- [" + incomingRelationQualifiedName + "]--(" + referingObject.className + "." + referingObject.id + ")");
		delete object.incomingRelations[incomingRelationQualifiedName][referingObject.id]; // Note, this HAS to exist here. Every link should have a back link!	

		// Delete data of any reverse relation, important to really free up memory!
		if (typeof(object._reverseRelations[incomingRelationQualifiedName]) !== 'undefined') {
			delete object._reverseRelations[incomingRelationQualifiedName].data;
		}
	};
	
	liquid.addOutgoingRelationOnLoad = function(object, qualifiedName, relatedObject) {
		// console.log("addOutgoingRelationOnLoad: (" + object.className + "." + object.id + ") --[" + qualifiedName + "]--> (" + relatedObject.className + "." + relatedObject.id + ")");
		var outgoingDefinition = object._relationDefinitions[qualifiedName];
		var outgoingInstance = object._relationInstances[qualifiedName];
		if (!outgoingInstance.isLoaded) {
			object[outgoingDefinition.getterName](); // Set the data of the outgoing relation.  
			if (isArray(outgoingInstance.data)) {
				// A ordinary set array.						
				outgoingInstance.data.push(relatedObject);
				liquid.sortRelationOnElementChange(outgoingDefinition, outgoingInstance);
			} else if (typeof(outgoingInstance.data) === 'object') {
				if (typeof(outgoingInstance.data.id) !== 'undefined') {
					// A sparse array.						
					outgoingInstance.data = relatedObject;
				} else {
					// A sparse array.						
					if (typeof(outgoingInstance.extraCache) !== 'undefined') {
						outgoingInstance.extraCache = {};
					}
					outgoingInstance.extraCache[relatedObject.id] = relatedObject;
				}
			}
		}
	};
	
	/**--------------------------------------------------------------
	*                 		Object setup
	*----------------------------------------------------------------*/

	/**
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
			// Note: this is important, because in a repeatOnChange we can track what methods are overwritten on the server, so we know they can only be called on the server.
			if (methodName.indexOf("select") === 0) {
				var selectionName = methodName.substring(9);
				object[methodName] = function() {
					if (object.noDataLoaded) {
						// Notify not able to select
						// liquid.triedToSelect(object, );
					} else {
						// Add selection name!
						var selection = arguments[0];
						if (typeof(selection.selectionNames) === 'undefined') {
							selection.selectionNames = {};
						}
						selection[object.id].selectionNames[selectionName] = true;
					}
					method.apply(this, arguments);
				}.bind(this);
			}
			object[methodName] = method;
		};
		
		object.overrideMethod = function(methodName, method) {
			var parent = object[methodName];
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
		liquid.addGenericMethodRepeater(object);
		liquid.addClassMethods(object);
		delete object.addMethod;
		delete object.overrideMethod;
		
		object._ = "(object shell for " + object.className + ")";
		// Utilities ? 
		// liquid.setupStreaming(object);
		// liquid.setupIterators(object);
		// liquid.setupPartsAndContainerIterators(object);
		// liquid.setupVersionControl(object);
		// liquid.setupCopying(object);	
	}

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
			})
		);
	};

	liquid.addPropertyInfo = function(object, definition) {
		var instance = {observers : {}};
		object._propertyDefinitions[definition.name] = definition;
		object._propertyInstances[definition.name] = instance; // This is only used in object augmentation mode. 
		
		// Initialize getter
		object[definition.getterName] = function() {
			var instance = this._propertyInstances[definition.name];
			liquid.notifyGettingProperty(object, definition, instance);
			return instance.data;
		};
		
		// Initialize setter
		object[definition.setterName] = function(value) {
			var instance = this._propertyInstances[definition.name];
			var oldValue = instance.data;
			if (value != oldValue) {
				instance.data = value;
				liquid.notifySettingProperty(this, definition, instance, value, oldValue);
				liquid.notifyChangeInProperty(this, definition, instance);
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
		liquid.normalizeRelation(relationDefinition);
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
		if (typeof(object._relationDefinitions[definition.qualifiedName]) !== 'undefined') {
			throw new Exception("Cannot have two relations of the same name on one single object. Consider inherited relations of the same name, or relations in the same class that has the same name.");
		}
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
		liquid.normalizeRelation(relationDefinition);
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
				var instance = this._relationInstances[definition.qualifiedName];
				if (typeof(instance.data) === 'undefined') {
					// if (this.isSaved) {
					var relatedObject = liquid.loadSingleRelation(this, definition, instance);				
					if (relatedObject !== null) {
						liquid.addIncomingRelationOnLoad(relatedObject, definition.qualifiedName, this);
					}				
					instance.data = relatedObject;
				}
				liquid.notifyGettingRelation(this, definition, instance);
				return instance.data;	
			};
		} else {
			object[definition.getterName] = function() {
				var instance = this._relationInstances[definition.qualifiedName];
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
				liquid.notifyGettingRelation(this, definition, instance);
				return instance.data;	
			}
		}
				
		
		// Init setter
		if(!definition.isReverseRelation) {
			// delete object.allLoadedRelations;
			object[definition.setterName] = function(newValue) {
				var previousValue = this[definition.getterName]();
				if (previousValue != newValue) {				
					// Delete previous relation. 
					if (previousValue !== null) {
						liquid.deleteIncomingRelationOnDelete(previousValue, definition.qualifiedName, this);
					}
					
					// Set new relation.
					var instance = this._relationInstances[definition.qualifiedName];
					instance.data = newValue;
					if (newValue !== null) {
						liquid.addIncomingRelationOnAdd(newValue, definition.qualifiedName, this);
					}
					// Notify observers
					liquid.notifySettingRelation(this, definition, instance, newValue, previousValue);
					liquid.notifyChangeInRelation(this, definition, instance);
				}
			}
		} else {
			// Just relays to the setter and getter of incoming relation
			var incomingRelationQualifiedName = definition.incomingRelationQualifiedName;
			object[definition.setterName] = function(newValue) {
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
						newValue[incomingRemoverName](this);  // Note: no need to call liquid.notifyChangeInRelation(object, definition, instance); since this will be called by deleteIncomingRelationOnDelete
					}
				}
				
				if (newValue != null) {
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
				var instance = this._relationInstances[definition.qualifiedName];
				if (typeof(instance.data) === 'undefined') {
					liquid.loadSetRelation(this, definition, instance);
				}
				liquid.notifyGettingRelation(this, definition, instance);
				instance.data.forEach(function(child) {
					action(child);
				}.bind(this));
			};
			
			// Init getter
			object[definition.getterName] = function() {
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
				// console.log("Set relation adder");
				// console.log(relation);
				var instance = this._relationInstances[definition.qualifiedName];
				if (typeof(instance.data) === 'undefined') {
					liquid.loadSetRelation(this, definition, instance);
				}
				// TODO: Assert not already in array!
				liquid.addIncomingRelationOnAdd(added, definition.qualifiedName, this);

				instance.data.push(added); //TODO: Create copy of array here? 
				liquid.sortRelationOnElementChange(definition, instance);

				liquid.notifyAddingRelation(this, definition, instance, added);
				liquid.notifyChangeInRelation(this, definition, instance);
			};
			
			// Init remover
			object[definition.removerName] = function(removed) {
				// console.group(this._ + "." + definition.removerName + "(" + removed._ + ")");
				var instance = this._relationInstances[definition.qualifiedName];				
				if (typeof(instance.data) === 'undefined') {
					liquid.loadSetRelation(this, definition, instance);
				}
				liquid.deleteIncomingRelationOnDelete(removed, definition.qualifiedName, this);
				// console.log(instance.data.length);
				// console.log(removed);
				// console.log(instance.data);
				removeFromArray(removed, instance.data); //TODO: Create copy of array here? 
				// console.log(instance.data.length);

				liquid.notifyDeletingRelation(this, definition, instance, removed);
				liquid.notifyChangeInRelation(this, definition, instance);
				// console.groupEnd();
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
				var instance = this._relationInstances[definition.qualifiedName];
				if (typeof(instance.data) === 'undefined') {
					liquid.loadReverseSetRelation(this, definition, instance);
				}
				liquid.notifyGettingRelation(this, definition, instance);
				return instance.data;
			}

			// Init setter (uses adder and remover  no notification and no actual manipulation)
			object[definition.setterName] = function(newSet) {
				// console.log("Setter of mirror set relation");
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
				var incomingRelation = added._relationDefinitions[incomingRelationQualifiedName];
				if (incomingRelation.isSet) {
					added[incomingRelation.adderName](this);
				} else {
					added[incomingRelation.setterName](this);				
				}
			};
			
			// Init remover (just relays to incoming relation, no notification and no actual manipulation)
			object[definition.removerName] = function(removed) {
				var incomingRelation = removed._relationDefinitions[incomingRelationQualifiedName];
				if (incomingRelation.isSet) {
					removed[incomingRelation.removerName](this);
				} else {
					removed[incomingRelation.setterName](null);				
				}
			}
		}
	}
	
	liquid.serializeSelection = function(selection) {
		var visitedSet = {}
		var serialized = [];
		while (Object.keys(selection).length > 0) {
			var firstSelectedId = Object.keys(selection)[0];
			var firstEntity = liquid.getEntity(firstSelectedId);
			serialized.push(firstEntity.serializeReachableSelection(selection, visitedSet));
		}
		return serialized;
	};

	liquid.addCommonLiquidClasses = function() {
		registerClass({
			name: 'LiquidSession', _extends: 'Entity',
			
			addPropertiesAndRelations : function (object) {
				// Properties
				object.addProperty('hardToGuessSessionId', '', {readOnly: ['userSubject'],  readAndWrite:['administrator']});
				
				// Relations
				object.addRelation('Page', 'toMany', {readOnly: ['userSubject'], readAndWrite:['administrator'], order: function(a, b) { return -1; }});
				object.addRelation('User', 'toOne', {readOnly: [], readAndWrite:['administrator'], order: function(a, b) { return -1; }});
			},
			
			addMethods : function (object) {
				object.addMethod('encryptPassword', function(liquidPassword) {
					return liquidPassword + " [encrypted]";
				});
				
				object.addMethod('login', function(loginName, liquidPassword) {
					var user = liquid.find({loginName: loginName});
					if (this.encryptPassword(liquidPassword) == user.getEncryptedPassword()) {
						this.setUser(user);
						return true;
					} else {
						return false;
					}
				}, {requiresAnyOf: 'all',
					usesRoles: ['administrator'],
					addRolesOnServer: ['administrator']});
			}
		});	
		
		registerClass({
			name: 'LiquidPage', _extends: 'Entity',
			
			addPropertiesAndRelations : function(object) {
				// Properties
				object.addProperty('pageUniqueId', '', {readOnly: [],  readAndWrite:['administrator']});
				
				// Relations
				object.addReverseRelationTo('Session_Page', 'Session', 'toOne', {readOnly: [], readAndWrite:['administrator'], order: function(a, b) { return -1; }});
			},
			
			addMethods : function(object) {
				object.addMethod('encryptPassword', function(liquidPassword) {
					return liquidPassword + " [encrypted]";
				});
				
				object.addMethod('login', function(loginName, liquidPassword) {
					return this.getPage().login(loginName, liquidPassword);
				}, {requiresAnyOf: 'all',
					usesRoles: ['administrator'],
					addRolesOnServer: ['administrator']});
			}
		});	

		registerClass({
			name: 'LiquidUser', _extends: 'Entity',
			
			addPropertiesAndRelations : function (object) {
				// Properties
				object.addProperty('loginName', '');
				object.addProperty('alternativeLoginName', '');
				object.addProperty('encryptedPassword', '', {readOnly: [], readAndWrite:['administrator']});
				
				// Relations
				object.addReverseRelationTo('LiquidSession_User', 'Session', 'toOne');
			},
			
			addMethods : function (object) {}
		});	

		liquid.registerClass({
			name: 'Entity',
			addPropertiesAndRelations : function (object) {
				// Note: This information needs to match what is in the database definition (fields and their default values) and the model and its relations.
			},
			
			addMethods : function (object) {
				object.touchedByEntity = true;
				
				// TODO: Use define method functions instead!!!

				object.roles = function(liquidPage) {
					// Do something with: liquidPage.getUser();
					return [];
				};
				
				object.init = function(initData) {
					console.log("=== Init in entity ===");

					for(var property in initData) {
						console.log("property: " + property);
						setterName = 'set' + capitaliseFirstLetter(property);
						if (typeof(this[setterName]) !== 'undefined') {
							console.log("setting using standard constructor");
							this[setterName](initData[property]);
						} else {
							console.log("Setter not found: (" + this.id + ")" + setterName);
							console.log(this);
						}
					}
				};
				
				object.is = function(className) {
					return typeof(this.classNames[className]) !== 'undefined';
				}
				
				object.getObjectSignum = function() {
					return "(" + this.className + "." + this.id + ")";
				}
				
				
				object.selectAll = function(selection) {
					if (typeof(selection[this.id]) === 'undefined') {
						// console.log("Selecting " + this.className + ":" + this.id);
						selection[this.id] = true;
						this._relationDefinitions.forEach(function(definition) {
							if(definition.isSet) {
								this[definition.forAllName](function(related) {
									related.selectAll(selection)
								});
							} else {
								related = this[definition.getterName]();
								if (related !== null) {
									related.selectAll(selection);
								}							
							}
						});
					}
				};
							
				object.serializeReachableSelection = function(selection, visitedSet) {
					if (typeof(visitedSet) === 'undefined') {
						visitedSet = {};
					}
					if(typeof(visitedSet[this.id]) !== 'undefined') {
						return this.id;
					} else {
						visitedSet[this.id] = true;
						if(typeof(selection[this.id]) !== 'undefined') {
							// console.log("Serialize selected object: " + this.className + "." + this.id);
							var objectSelectionDetails = selection[this.id];
							delete selection[this.id];
							
							this._observingPages[liquid.requestingPage.id] = liquid.requestingPage;
							
							var serialized = { 
								id:this.id, 
								className: this.className, 
								noDataLoaded : false,
								_relations: {},
								_properties: {}
							};
							
							for (propertyName in this._propertyDefinitions) {
								// console.log("Adding property: " + propertyName);
								var propertyInstance = this._propertyInstances[propertyName];
								serialized._properties[propertyName] = propertyInstance.data;
							};
							
							for (var relationName in this._relationDefinitions) {
								if (objectSelectionDetails === true 
									|| (typeof(objectSelectionDetails) === 'object' && typeof(objectSelectionDetails['allOther']) === 'boolean' &&  objectSelectionDetails['allOther'] === true)
									|| (typeof(objectSelectionDetails) === 'object' && objectSelectionDetails[relationName] !== 'undefined')){
									// console.log("Serialize relation for " + this.className + "." + this.id +  "." + relationName);

									var definition = this._relationDefinitions[relationName];
									var relationSelectionDetails = (typeof(objectSelectionDetails) === 'object') ? objectSelectionDetails[relationName] : true;
									if(definition.isSet) {
										if (typeof(relationSelectionDetails) === 'object' && typeof(relationSelectionDetails.spans) !== 'undefined') {
											// Create a sparse array
											var relatedSet = {};
											var spans = relationSelectionDetails.spans
											var relatedObjects = this[definition.getterName]();
											var maxIndex = relatedObjects.length - 1;
											for (var start in spans) {
												var end = spans[start];
												start = Math.min(start, maxIndex);
												end = Math.min(end, maxIndex);
												if (start >= 0) {
													// console.log("Serializing span: " + start + ", " + end);
													var index = start;
													while(index <= end) {
														relatedSet[index] = relatedObjects[index].serializeReachableSelection(selection, visitedSet);
														index++;
													}
												}
											}
											serialized._relations[relationName] = relatedSet;
										} else {
											// Create an ordinary array
											var relatedSet = [];
											// console.log("Serialize relation for " + this.className + "." + this.id +  "." + relationName);
											this[definition.forAllName](function(related) {
												// console.log("looping through one!");
												var seralizedRelated = related.serializeReachableSelection(selection, visitedSet);
												// console.log("Looping for " + this.className + "."  + this.id +  "." + relationName);
												relatedSet.push(seralizedRelated);
											});
											// console.log("Finised with relation  " + this.className + "."  + this.id +  "." + relationName);
											serialized._relations[relationName] = relatedSet;
										}
									} else {
										var related = this[definition.getterName]();
										if (related !== null) {
											related = related.serializeReachableSelection(selection, visitedSet);
										}
										serialized._relations[relationName] = related;
									}
									
									// Add history information if required by relationSelectionDetails 
								}
							}
							
							// TODO: 						
							return serialized;
						} else {
							return { 
								id:this.id, 
								className: this.className, 
								noDataLoaded : true
							};
						}
					}
				};
			},
			
			addServerMethods : function(object) {
			},
			
			addClientMethods : function(object) {
				object.getSaver = function() {
					return cream.defaultSaver;
				};
				
				// object.callOnServer = function(method, postCallCallback) { // TODO: an arglist
					// cream.callOnServer(object, method, postCallCallback);
				// };
			}
		});

		liquid.registerClass({
			name: 'Index',
			addPropertiesAndRelations : function (object) {
				// Note: This information needs to match what is in the database definition (fields and their default values) and the model and its relations.
			},
			addMethods : function (object) {
				object.getObjectSignum = function() {
					return "[Index]";
				}
			}
		});
	};
}

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addCommonLiquidFunctionality = addCommonLiquidFunctionality;
} else {
	// global.addCommonLiquidFunctionality = addCommonLiquidFunctionality;
	
}
