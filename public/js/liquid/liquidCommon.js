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
	*                       Basic security 
	*----------------------------------------------------------------*/
 
	liquid.administratorAccessRights = 0; //>0 means yes.
	
	
	
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

	liquid.notifyAddIncomingRelationOnAdd = function(object, definition, instance) {
		liquid.observersDirty(instance.observers);
	};

	liquid.notifyDeletingRelation = function(object, definition, instance, relatedObject) {
		liquid.observersDirty(instance.observers);
	};

	liquid.notifyDeleteIncomingRelationOnDelete = function(object, definition, instance) {
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
	*                 		Object setup
	*----------------------------------------------------------------*/

	
	


if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addCommonLiquidFunctionality = addCommonLiquidFunctionality;
} else {
	// global.addCommonLiquidFunctionality = addCommonLiquidFunctionality;
	
}
