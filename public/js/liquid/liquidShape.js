/*--------------------------------------
 * Liquid shape analysis functionality
 * 
 *---------------------------------------*/

var addLiquidShapeFunctionality = function(liquid) {
    liquid.addingWouldConfineToShape(object, definition, relatedObject, shape) {
        // shape can be 'non-recursive', 'tree', 'acyclic', 'graph'

    }


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
                    if (typeof(instance.data) !== 'undefined') {
                        if (definition.isSet) {
                            instance.data.forEach(function(relatedObject) {
                                callback(definition, instance, relatedObject);
                            });
                        } else if (instance.data !== null) {
                            callback(definition, instance, instance.data);
                        }
                    }
                }
            }
        };

        // object['forAllIncomingRelations'] = function (callback) {
        //     //TODO
        // };

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


};


if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
    module.exports.addLiquidShapeFunctionality = addLiquidShapeFunctionality;
} else {
    // global.addLiquidShapeFunctionality = addLiquidShapeFunctionality;
}
