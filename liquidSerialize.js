liquid.addLiquidSerialize = function(liquid) {
	
	liquid.serialize = function(selection) {
		var serializedSelection = [];
		for (id in selection) {
			var object = selection[id];

			var serializedObject = {
				id: object.id, 
				className: object.className, 
				_relations: {},
				_properties: {}
			};

			for (propertyName in object._propertyDefinitions) {
				var propertyInstance = object._propertyInstances[propertyName];
				serializedObject._properties[propertyName] = propertyInstance.data;						
			}
			
			for (var relationName in object._relationDefinitions) {
				var definition = this._relationDefinitions[relationName];
				if (definition.isSet) {
					var relatedSetIds = [];
					object[definition.forAllName](function(related) {
						relatedSetIds.push(related.id);
					});
					serializedObject._relations[relationName] = relatedSetIds;
				} else {
					serializedObject._relations[relationName] = object[definition.getterName]();
				}			
			}
			
			serializedSelection.push(serializedObject);
		}
	}
}	

				
if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addLiquidSerialize = addLiquidSerialize;
}
