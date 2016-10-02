/*--------------------------------------
 * Liquid shape analysis functionality
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
         *     Relation browsing
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
         *   Parent and child
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

        /*---------------------------------------------------------------
         *
         *     Shape analysis
         *   (without observation)
         *   TODO: Consider, do we need observation posibilities?
         *---------------------------------------------------------------*/

        object['canRelateAccordingToShape'] = function(shape, definition, relatedObject) {
            // shape can be 'non-recursive', 'tree', 'acyclic', 'graph'
            if (shape == 'non-recursive') {
                return relatedObject.outgoingRelatedObjects(definition.qualifiedName).length == 0;
            } else if (shape == 'tree') {
                var allTransitiveOutgoing = relatedObject.getAllTransitiveOutgoing(definition.qualifiedName);
                allTransitiveOutgoing[relatedObject._id] = true;
                return typeof((allTransitiveOutgoing[this._id]) === 'undefined') && (relatedObject.incomingRelatedObjects(definition.qualifiedName).length == 0);
            } else if (shape == 'acyclic') {
                var allTransitiveOutgoing = this.getAllTransitiveOutgoing(definition.qualifiedName);
                return typeof(allTransitiveOutgoing[this._id]) === 'undefined';
            } else if (shape == 'graph') {
                return true;
            }
        };


        object["getAllTransitiveOutgoing"] = function(qualifiedRelationName) {
            var objects = {};
            this.addAllTransitiveOutgoing(qualifiedRelationName, objects);
            return objects;
        };

        object["addAllTransitiveOutgoing"] = function(qualifiedRelationName, addedObjects) {
            if (typeof(addedObjects[this._id]) === 'undefined') {
                addedObjects[this._id] = true;
                this.forAllOutgoingRelatedObjects(qualifiedRelationName, function(relatedObject) {
                    relatedObject.addAllTransitiveOutgoing(qualifiedRelationName, addedObjects);
                });
            }
        }
    };


};


if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
    module.exports.addLiquidShapeFunctionality = addLiquidShapeFunctionality;
} else {
    // global.addLiquidShapeFunctionality = addLiquidShapeFunctionality;
}