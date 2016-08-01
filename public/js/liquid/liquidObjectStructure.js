/**--------------------------------------------------------------
*                 Object structure
*----------------------------------------------------------------*/

var addLiquidObjectStructureFunctionality = function(liquid) { 

	// Local id will never change during the lifetime of an object.
	var nextLocalId = 1;
	
	// Creates a blank instance, without data or id! Just Interface. 
	liquid.createClassInstance = function(className) {
		var liquidClass = liquid.classRegistry[className];
		// console.log("============  asfasdf");
		// console.log(liquidClass);
		// console.log(liquidClass.liquidObjectPrototype);
		var object = Object.create(liquidClass.liquidObjectPrototype);
		// console.log(object);
		liquid.cloneCommonInstanceFields(object, liquidClass.liquidObjectPrototype);
		object.localId = nextLocalId++;
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
		object.localId = nextLocalId++;
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
		
		liquid.addPropertiesAndRelationsRecursivley(object.class);
		delete object.addProperty;
		delete object.addRelation;
		delete object.addReverseRelation;
		
		// Add methods and repeaters
		object.addMethod = function(methodName, method) {
			liquid.addMethod(object, methodName, method);
		};
		
		object.overrideMethod = function(methodName, method) {
			liquid.overrideMethod(object, methodName, method);
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

}



if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addLiquidObjectStructureFunctionality = addLiquidObjectStructureFunctionality;
}