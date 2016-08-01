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
	
	// liquid.addClassPropertiesAndRelations = function(object) {
		// liquid.addPropertiesAndRelationsRecursivley(object.class, object);
	// };
	
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
	
