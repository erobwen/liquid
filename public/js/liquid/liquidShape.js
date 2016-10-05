/*--------------------------------------
 * Liquid data structure shape 
 * analysis functionality
 * 
 *---------------------------------------*/

var addLiquidShapeFunctionality = function(liquid) {
    liquid.addGenericRelationBrowsing = function(object) {
        /*---------------------------------------------------------------
         *
         *     Relation browsing
         *  (using members, trigger observer, trigger autoload)
         *---------------------------------------------------------------*/

        object['outgoingRelatedObjects'] = function(qualifiedRelationName) {
            var result = [];
            this.forAllOutgoingRelatedObjects(qualifiedRelationName, function(object) {
                result.push(object);
            });
            return result;
        };

        object['forAllOutgoingRelatedObjects'] = function(qualifiedRelationName, callback) {
            var definition = this._relationDefinitions[qualifiedRelationName];
            if (!definition.isReverseRelation) {
                if (definition.isSet) {
                    this[definition.getterName].forEach(function(relatedObject) {
                        callback(relatedObject);
                    })
                } else {
                    callback(this[definition.getterName]);
                }
            }
        };

        object['incomingRelatedObjects'] = function(qualifiedRelationName) {
            var result = [];
            this.forAllIncomingRelatedObjects(qualifiedRelationName, function(object) {
                result.push(object);
            });
            return result;
        };

        // Note: ignores reverse relations, they are not needed here at all. However, observation is triggered.
        object['forAllIncomingRelatedObjects'] = function(qualifiedRelationName, callback) {
            liquid.ensureIncomingRelationLoaded(this, qualifiedRelationName);
            if (typeof(this._incomingRelations[qualifiedRelationName]) !== 'undefined') {
                var incomingRelationMap = this._incomingRelations[qualifiedRelationName];
                for (incomingId in incomingRelationMap) {
                    var object = incomingRelationMap[incomingId];
                    callback(object);
                }
            }
        };

        /*---------------------------------------------------------------
         *
         *     Shape analysis
         *   
         *---------------------------------------------------------------*/

        object['canRelateAccordingToShape'] = function(definition, relatedObject) {
            // Allowed shape names:
            // 'graph', 'non-recursive', 'non-shared', 'tree', 'acyclic', 'spiral'

            // All shape checks are a combination of the following checks:
            // non-shared (single parent only)
            // non-cyclic (no loops)
            // non-recursive (child cannot be parent)

            var shape = definition.shape;
            if (shape === 'graph') { // Default value. No checks!
                // shared recursive cyclic
                return true;
            } else {

                // Can only analyze shape if related object accessible
                if (liquid.onClient) {
                    if (relatedObject.isPlaceholderObject() || !relatedObject.readable()) {
                        return false;
                    }
                    // TODO: consider how to handle incomingRelatedObjects on client? Should we demand they are all loaded?
                }

                try {
                    if (shape === 'non-recursive') {
                        // non-shared recursive non-cyclic
                        return (relatedObject.outgoingRelatedObjects(definition.qualifiedName).length == 0)
                            && (this.incomingRelatedObjects(definition.qualifiedName).length == 0);

                    } else if (shape === 'non-shared' || shape === 'non-shared-non-recursive') { // & non recursive
                        // TODO: return false on client since we cannot guarantee non-shared?
                        // non-shared non-recursive non-cyclic
                        return (relatedObject.outgoingRelatedObjects(definition.qualifiedName).length == 0)
                            && (this.incomingRelatedObjects(definition.qualifiedName).length == 0)
                            && (relatedObject.incomingRelatedObjects(definition.qualifiedName).length == 0);

                    } else if (shape === 'tree') {
                        // TODO: return false on client since we cannot guarantee non-shared?
                        // non-shared recursive non-cyclic
                        let allTransitiveOutgoing = relatedObject.getAllTransitiveOutgoing(definition.qualifiedName);
                        allTransitiveOutgoing[relatedObject._id] = true;
                        return typeof((allTransitiveOutgoing[this._id]) === 'undefined')
                            && (relatedObject.incomingRelatedObjects(definition.qualifiedName).length == 0);

                    } else if (shape === 'acyclic') {
                        // shared recursive non-cyclic
                        let allTransitiveOutgoing = relatedObject.getAllTransitiveOutgoing(definition.qualifiedName);
                        return typeof(allTransitiveOutgoing[this._id]) === 'undefined';

                    } else if (shape === 'spiral') {
                        // TODO: return false on client since we cannot guarantee non-shared?
                        // non-shared recursive cyclic
                        return (relatedObject.incomingRelatedObjects(definition.qualifiedName).length == 0);
                    }
                } catch(exception) { // discovering unloaded data recursivley will result in exception.
                    return false;
                }
            }
        };


        object["getAllTransitiveOutgoing"] = function(qualifiedRelationName) {
            var objects = {};
            this.addAllTransitiveOutgoing(qualifiedRelationName, objects);
            return objects;
        };

        object["addAllTransitiveOutgoing"] = function(qualifiedRelationName, addedObjects) {
            if (typeof(addedObjects[this._id]) === 'undefined') {
                if (liquid.onClient && this.isPlaceholderObject() || !this.readable()) {
                    throw "Data not accessable for shape analysis!";
                }

                addedObjects[this._id] = true;
                this.forAllOutgoingRelatedObjects(qualifiedRelationName, function(relatedObject) {
                    relatedObject.addAllTransitiveOutgoing(qualifiedRelationName, addedObjects);
                });
            }
        };

        /*---------------------------------------------------------------
         *
         *     Relation browsing OBS RAW!!!
         *  (without members, no observation, no auto loading)
         *---------------------------------------------------------------*/

        object['forAllRelations'] = function(callback) {
            for (relationQualifiedName in this._relationDefinitions) {
                var definition = this._relationDefinitions[relationQualifiedName];
                var instance = this._relationInstances[relationQualifiedName];
                callback(definition, instance);
            }
        };

        object['forAllRelatedObjects'] = function(qualifiedRelationName, callback) {
            var definition = this._relationDefinitions[qualifiedRelationName];
            var instance = this._relationInstances[qualifiedRelationName];
            if (typeof(instance.data) !== 'undefined') {
                if (definition.isSet) {
                    instance.data.forEach(function(relatedObject) {
                        callback(definition, instance, relatedObject);
                    });
                } else if (instance.data !== null) {
                    callback(instance.data);
                }
            }
        };

        object['forAllOutgoingRelationsAndObjects'] = function(callback) {
            // Callback with definition, instance and object
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


        /*---------------------------------------------------------------
         *   Parent and child  OBS RAW!!!
         *
         *   (without members, autoloading.)
         *---------------------------------------------------------------*/

        // Essetially, is child of
        object["hasIncomingRelationFrom"] =  function(relatedObject, qualifiedRelationName) {
            if (typeof(object._relationDefinitions[qualifiedRelationName]) !== 'undefined') {
                var result = false;
                object.forAllRelatedObjects(qualifiedRelationName, function(outgoingRelatedObject) {
                    if (outgoingRelatedObject === this) {
                        result = true;
                    }
                });
                return result;
            } else {
                return false;
            }
        };

        // Essetially, is parent to
        object["hasOutgoingRelationTo"] = function(qualifiedRelationName, relatedObject) {
            if (typeof(object._relationDefinitions[qualifiedRelationName]) !== 'undefined') {
                var result = false;
                this.forAllRelatedObjects(qualifiedRelationName, function(outgoingRelatedObject) {
                    if (outgoingRelatedObject === relatedObject) {
                        result = true;
                    }
                });
                return result;
            } else {
                return false;
            }
        };
    };
};


if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
    module.exports.addLiquidShapeFunctionality = addLiquidShapeFunctionality;
} else {
    // global.addLiquidShapeFunctionality = addLiquidShapeFunctionality;
}