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
	
	liquid.createPropertyStructure = function(propertyData, details) {
		liquid.normalizeProperty(propertyData, details);
		return propertyData;
	};
	
	liquid.normalizeProperty = function(property, details) {
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
		instance.data = null;
		//console.log("loadSingleRelation: (" + object.className + "." + object.id + ") -- [" + definition.name + "] --> ?");
		// throw new Exception("Not implemented!");
	};

	liquid.ensureIncomingRelationLoaded = function(object, incomingRelationName) {
		// console.log("ensureIncomingRelationLoaded: (" + object.className + "." + object.id + ") <-- [" + incomingRelationName + "] -- ?");
		// throw new Exception("Not implemented!");
	};
		
	liquid.loadSetRelation = function(object, definition, instance) {
		instance.data = [];
		// console.log("loadSetRelation: (" + object.className + "." + object.id + ") -- ["+ definition.qualifiedName + "] --> ?");
		// throw new Exception("Not implemented!");
	};

	liquid.loadReverseSetRelation = function(object, definition, instance) {
		// Load relation
		console.log("loadReverseSetRelation: (" + object.className + "." + object.id + ") <-- ["+ definition.incomingRelationQualifiedName + "] --?");
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
		} 
		
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
	*                   Detailed Observation
	*
	* Detailed observation ignores mirror relations. Therefore all 
	* Events in detailed obervation are unique, and can be used to 
	* Save data, transmitt changes to peers etc. 
	*----------------------------------------------------------------*/
		
	/***
	 * Relations
	 */
	liquid.notifyGettingRelation = function(object, definition, instance) {
		// console.log("notifyGettingRelation: " + object._ + "." + definition.name);
		liquid.setupObservation(object, instance);
	};

	liquid.notifySettingRelation = function(object, definition, instance, value, previousValue) {
		// console.log("notifySettingRelation: " + object._ + "." + definition.name);
		liquid.holdChangePropagation(function() {
			liquid.notifyDeletingRelation(object, definition, instance, previousValue);
			liquid.notifyAddingRelation(object, definition, instance, value);
		});
	};

	liquid.notifyAddingRelation = function(object, definition, instance, relatedObject){
		liquid.observersDirty(instance.observers);
	};

	liquid.notifyAddIncomingRelation = function(object, definition, instance, relatedObject) {
		liquid.observersDirty(instance.observers);
	};

	liquid.notifyDeletingRelation = function(object, definition, instance, relatedObject) {
		liquid.observersDirty(instance.observers);
	};

	liquid.notifyDeletingIncomingRelation = function(object, definition, instance, relatedObject) {
		liquid.observersDirty(instance.observers);
	};
	
	liquid.notifyRelationReordered = function(object, definition, instance, relationData) {
		liquid.observersDirty(instance.observers);
	};

	
	
	/***
	 * Properties
	 */
	liquid.notifyGettingProperty = function(object, definition, instance) {
		// console.log("notifyGettingProperty: " + object._ + "." + propertyDefinition.name);
		liquid.setupObservation(object, instance);
	};

	liquid.notifySettingProperty = function(object, definition, instance, newValue, oldValue) {
		liquid.observersDirty(instance.observers);
	};

	
	/**--------------------------------------------------------------
	*                 Object structure
	*----------------------------------------------------------------*/

	var nextUniqueSessionId = 1;
	
	// Creates a blank instance, without data or id! Just Interface. 
	liquid.createClassInstance = function(className) {
		var liquidClass = liquid.classRegistry[className];
		// console.log("============  asfasdf");
		// console.log(liquidClass);
		// console.log(liquidClass.liquidObjectPrototype);
		var object = Object.create(liquidClass.liquidObjectPrototype);
		// console.log(object);
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
		
	liquid.addIncomingRelation = function(object, incomingRelationQualifiedName, referingObject) {
		// return;
		// console.log("addIncomingRelation: (" + object.className + "." + object.id + ") <-- [" + incomingRelationQualifiedName + "]--(" + referingObject.className + "." + referingObject.id + ")");
		// Add in incoming relations, create a new map if necessary
		if (typeof(object.incomingRelations[incomingRelationQualifiedName]) === 'undefined') {
			object.incomingRelations[incomingRelationQualifiedName] = {};
		}
		object.incomingRelations[incomingRelationQualifiedName][referingObject.id] = referingObject;

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
			liquid.notifyAddIncomingRelation(object, reverseDefinition, reverseInstance);				
		}
	};


	liquid.deleteIncomingRelation = function(object, incomingRelationQualifiedName, referingObject) {
		// return;
		//console.log("deleteIncomingRelation: (" + object.className + "." + object.id + ") <-X- [" + incomingRelationQualifiedName + "]--(" + referingObject.className + "." + referingObject.id + ")");
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
			liquid.notifyDeletingIncomingRelation(object, reverseDefinition, reverseInstance);
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
			if (allowRead(this, liquid.page)) {
				var instance = this._propertyInstances[definition.name];
				liquid.notifyGettingProperty(object, definition, instance);
				return instance.data;
			} else {
				console.log("Access violation: " + this._ + "." + definition.getterName + "() not allowed by page/user");
				return clone(definition.defaultValue);
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
					console.log("Access violation: " + this._ + "." + definition.setterName + "(...) not allowed by page/user");
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
					console.log("Access violation: " + this._ + "." + definition.getterName + "() not allowed by page/user");
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
					// console.log("Access violation: " + this._ + "." + definition.getterName + "() not allowed by page/user");
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
						console.log("Access violation: " + this._ + "." + definition.setterName + "(...) not allowed by page/user");
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
					console.log("adding new value");
					console.log(newValue._relationDefinitions);
					console.log(incomingRelationQualifiedName);
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
						console.log("New value did not have the right outgoing relation!");
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
					console.log("Access violation: " + this._ + "." + definition.forAllName + "() not allowed by page/user");
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
					console.log("Access violation: " + this._ + "." + definition.forAllName + "() not allowed by page/user");
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
					console.log("Access violation: " + this._ + "." + definition.setterName + "(...) not allowed by page/user");
				}
			};
			
			// Init remover
			object[definition.removerName] = function(removed) {
				if (allowWrite(this, liquid.page)) {
					// console.group(this._ + "." + definition.removerName + "(" + removed._ + ")");
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
					console.log("Access violation: " + this._ + "." + definition.setterName + "(...) not allowed by page/user");
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
				console.log(incomingRelation);
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
			object._observingPages[liquid.requestingPage.id] = liquid.requestingPage;
		}
	};

	liquid.serializeSelection = function(selection) {
		var serialized = [];
		for (id in selection) {
			// console.log(liquid.idObjectMap);
			var object = liquid.idObjectMap[id];
			serialized.push(liquid.serializeObject(object));
		}
		return serialized;
	};

	
	
	liquid.serializeObject = function(object) {
		function serializedReference(object) {
			return object.className + ":" + object.id; 
		}
		
		serialized = {};
		serialized._ = object._;
		serialized.className = object.className;
		serialized.id = object.id;
		for (relationName in object._relationDefinitions) {
			var definition = object._relationDefinitions[relationName];
			if (!definition.isReverseRelation) {
				if (definition.isSet) {
					serialized[definition.name] = object[definition.getterName]().map(serializedReference);
				} else {
					serialized[definition.name] = serializedReference(this[definition.getterName]());
				}
			}
		}
		for (propertyName in object._propertyDefinitions) {
			definition = object._propertyDefinitions[propertyName];
			serialized[definition.name] = object[definition.getterName]();
		}
		return serialized;

		// id:this.id,
		// className: this.className,
		// noDataLoaded : true
	};

	liquid.addCommonLiquidClasses = function() {
		registerClass({
			name: 'LiquidSession', _extends: 'Entity',
			
			addPropertiesAndRelations : function (object) {
				// Properties
				object.addProperty('hardToGuessSessionId', '');
				
				// Relations
				object.addRelation('Page', 'toMany', {order: function(a, b) { return -1; }});
				object.addRelation('User', 'toOne', {order: function(a, b) { return -1; }});
			},
			
			addMethods : function (object) {
				object.addMethod('canReadAndWrite', function(user) { return liquid.isAdministrator; });
				object.addMethod('canRead', function(user) { return liquid.isAdministrator; });
				
				
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
				}, 'administrator');
			}
		});	
		
		registerClass({
			name: 'LiquidPage', _extends: 'Entity',
			
			addPropertiesAndRelations : function(object) {
				// Properties
				object.addProperty('hardToGuessPageId', '');
				
				// Relations
				object.addReverseRelationTo('LiquidSession_Page', 'Session', 'toOne', {order: function(a, b) { return -1; }}); //readOnly: [], readAndWrite:['administrator'],
			},
			
			addMethods : function(object) {
				object.addMethod('encryptPassword', function(liquidPassword) {
					return liquidPassword + " [encrypted]";
				});
				
				object.addMethod('getActiveUser', function(liquidPassword) {
					if (this.getSession() != null) {
						console.log(this.getSession());
						console.log(this.getSession().getUser);
						return this.getSession().getUser();
					}
					return null;
				});

				object.addMethod('login', function(loginName, liquidPassword) {
					return this.getPage().login(loginName, liquidPassword);
				}, 'administrator');
				
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
							console.log("setting using standard constructor:" + setterName);
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
