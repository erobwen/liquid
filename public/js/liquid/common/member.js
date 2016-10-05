

//definition.shape

var addLiquidObjectMemberFunctionality = function(liquid) {

    /*--------------------------------------
     *
     *             Properties
     *
     *---------------------------------------*/

    var addPropertyGetter = function(object, definition) {
        // Member: Property getter
        object[definition.getterName] = function() {
            // console.log("Getter!");
            trace('property', this, ".", definition.getterName, "()");

            // console.log("Get property: " + this._ + "." + definition.getterName + "()");
            if (liquid.allowRead(this)) {
                if (typeof(this._propertyInstances[definition.name].data) !== 'undefined') {
                    trace('property', 'A stored value exists.');
                    var instance = this._propertyInstances[definition.name];
                    liquid.registerObserverTo(this, definition, instance);
                    return instance.data;
                } else {
                    trace('property', 'Resort to default value');
                    // console.log(definition);
                    // return clone(definition.defaultValue);
                    return definition.defaultValue;
                }
            } else {
                trace('property', 'Access denied!');
            }
        };
    };


    var addPropertySetter = function(object, definition) {
        // Member: Property setter
        object[definition.setterName] = function(value) {
            trace('property', this, ".", definition.setterName, "(", value, ")");

            // console.log("Set property: " + this._ + "." + definition.setterName + "(" + value + ")");
            var instance = this._propertyInstances[definition.name];
            var oldValue = instance.data;
            if (liquid.allowWrite(this) && value != oldValue) {
                liquid.inPulseBlockUponChangeActions(function(pulse) {
                    instance.data = value;
                    pulse.add({redundant: false, action: 'settingProperty', object: this, definition: definition, instance: instance, newValue: value, oldValue: oldValue});
                    this._ = this.__(); // Update debug info upon every set property.
                }.bind(this));
                return true;
            } else {
                return false;
            }
        };
    };


    /*--------------------------------------
     *
     *        Outgoing relations
     *
     *---------------------------------------*/

    
    function addRelationShapeCheck(object, definition) {
        object[definition.shapeCheckerName] = function (relatedObject) {
            if (relatedObject === null) {
                return true;
            } else {
                return this.canRelateAccordingToShape(definition, relatedObject);
            }
        }
    }

    // Setter
    function addRelationGetter(object, definition) {
        // Member: Outgoing single getter
        object[definition.getterName] = function () {
            // console.log("Getting single relation: " + this.__() + "." + definition.name);
            trace('member', this, ".", definition.name);
            if (liquid.allowRead(this)) {
                var instance = this._relationInstances[definition.qualifiedName];
                liquid.registerObserverTo(this, definition, instance);
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
                return null;
            }
        };
    }

    // Member: Outgoing single setter
    function addRelationSetter(object, definition) {
        object[definition.setterName] = function (newValue) {
            // console.log("Set single relation: " + this.__() + "." + definition.name + " = " + nullOr__(newValue));
            trace('member', this, ".", definition.setterName, "(", newValue, ")");
            if (liquid.allowWrite(this) && this[definition.shapeCheckerName](newValue)) {
                var previousValue = this[definition.getterName]();
                if (previousValue != newValue) {
                    liquid.inPulseBlockUponChangeActions(function (pulse) {
                        var instance = this._relationInstances[definition.qualifiedName];
                        pulse.add({
                            redundant: true,
                            action: 'settingRelation',
                            object: this,
                            definition: definition,
                            instance: instance,
                            value: newValue,
                            previousValue: previousValue
                        });

                        // Delete previous relation.
                        if (previousValue !== null) {
                            pulse.add({
                                redundant: false,
                                action: 'deletingRelation',
                                object: this,
                                definition: definition,
                                instance: instance,
                                relatedObject: previousValue
                            });
                            liquid.deleteIncomingRelation(previousValue, definition.qualifiedName, this);
                        }
                        trace('member', previousValue);

                        // Set new relation.
                        var instance = this._relationInstances[definition.qualifiedName];
                        instance.data = newValue;

                        if (newValue !== null) {
                            pulse.add({
                                redundant: false,
                                action: 'addingRelation',
                                object: this,
                                definition: definition,
                                instance: instance,
                                relatedObject: newValue
                            });
                            liquid.addIncomingRelation(newValue, definition.qualifiedName, this);
                        }
                    }.bind(this));
                    return true;
                } else {
                    return true;
                }
            } else {
                // console.log("Access violation: " + this.__() + "." + definition.setterName + "(...) not allowed by page/user");
                return false;
            }
        }
    }

    // Member: Outgoing set iterator
    function addRelationPluralIterator(object, definition) {
        object[definition.forAllName] = function (action) {
            // console.log("Iterate set: " + this.__() + "." + definition.name);
            if (liquid.allowRead(this)) {
                var instance = this._relationInstances[definition.qualifiedName];
                if (typeof(instance.data) === 'undefined') {
                    liquid.loadSetRelation(this, definition, instance);
                }
                liquid.registerObserverTo(this, definition, instance);
                instance.data.forEach(function (child) {
                    action(child);
                }.bind(this));
            } else {
                return;
                // console.log("Access violation: " + this.__() + "." + definition.forAllName + "() not allowed by page/user");
            }
        };
    }

    // Member: Outgoing set getter
    function addRelationPluralGetter(object, definition) {
        object[definition.getterName] = function () {
            // console.log("Get set: " + this.__() + "." + definition.name);
            if (liquid.allowRead(this)) {
                // console.log("setRelationGetter");
                var instance = this._relationInstances[definition.qualifiedName];
                // console.log(instance);
                if (typeof(instance.data) === 'undefined') {
                    liquid.loadSetRelation(this, definition, instance);
                }
                // console.log("instance.data:");
                // console.log(instance.data);
                liquid.registerObserverTo(this, definition, instance);
                return instance.data;
            } else {
                // console.log("Access violation: " + this.__() + "." + definition.forAllName + "() not allowed by page/user");
                return [];
            }
        };
    }

    // Member: Outgoing set setter (just a relay function, uses adder and remover)
    function addRelationPluralSetter(object, definition) {
        object[definition.setterName] = function (newSet) {
            // console.log("Set set: " + this.__() + "." + definition.name);
            if (liquid.allowWrite(this)) {
                var instance = this._relationInstances[definition.qualifiedName];
                if (typeof(instance.data) === 'undefined') {
                    liquid.loadSetRelation(this, definition, instance);
                }
                var difference = arrayDifference(newSet, instance.data);
                if (difference.added.length > 0 || difference.removed.length > 0) {
                    liquid.inPulseBlockUponChangeActions(function (pulse) {
                        difference.added.forEach(function (added) {
                            this[definition.adderName](added);
                        }.bind(this));
                        difference.removed.forEach(function (removed) {
                            this[definition.removerName](removed);
                        }.bind(this));
                        pulse.add({
                            redundant: true,
                            action: 'settingRelation',
                            object: this,
                            definition: definition,
                            instance: null,
                            value: newSet,
                            previousValue: null
                        });
                    }.bind(this));
                    return true;
                } else {
                    return false;
                }
            }
            return false;
        };
    }

    // Member: Outgoing set adder
    function addRelationPluralAdder(object, definition) {
        object[definition.adderName] = function (added) {
            trace('member', this, ".", definition.adderName, "(", added, ")");
            // console.log("Add to set: " + this.__() + "." + definition.adderName + "(" + added.__() + ")");
            // console.log(definition.adderName + "(...)");
            if (liquid.allowWrite(this) && this[definition.shapeCheckerName](added)) {
                // console.log("Set relation adder");
                // console.log(relation);
                var instance = this._relationInstances[definition.qualifiedName];
                if (typeof(instance.data) === 'undefined') {
                    liquid.loadSetRelation(this, definition, instance);
                }

                if (!inArray(added, instance.data)) {
                    liquid.inPulseBlockUponChangeActions(function (pulse) {

                        liquid.addIncomingRelation(added, definition.qualifiedName, this);

                        instance.data.push(added); //TODO: Create copy of array here?
                        liquid.sortRelationOnElementChange(definition, instance);

                        pulse.add({
                            redundant: false,
                            action: 'addingRelation',
                            object: this,
                            definition: definition,
                            instance: instance,
                            relatedObject: added
                        });
                        pulse.add({
                            redundant: true,
                            action: 'relationReordered',
                            object: this,
                            definition: definition,
                            instance: instance,
                            relatedObject: added
                        });
                    }.bind(this));
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
                // console.log("Access violation: " + this.__() + "." + definition.setterName + "(...) not allowed by page/user");
            }
        };
    }

    // Member: Outgoing set remover
    function addRelationPluralRemover(object, definition) {
        object[definition.removerName] = function (removed) {
            // debugger;
            // console.log("Remove from set: " + this.__() + "." + definition.removerName + "(" + removed.__() + ")");
            if (liquid.allowWrite(this)) {
                // if (liquid.allowWrite(this, liquid.page)) {
                // console.group(this.__() + "." + definition.removerName + "(" + removed.__() + ")");
                var instance = this._relationInstances[definition.qualifiedName];
                if (typeof(instance.data) === 'undefined') {
                    liquid.loadSetRelation(this, definition, instance);
                }
                removed._tag = true;
                if (inArray(removed, instance.data)) {
                    liquid.inPulseBlockUponChangeActions(function (pulse) {
                        removeFromArray(removed, instance.data); //TODO: Create copy of array here?

                        liquid.deleteIncomingRelation(removed, definition.qualifiedName, this);

                        pulse.add({
                            redundant: false,
                            action: 'deletingRelation',
                            object: this,
                            definition: definition,
                            instance: instance,
                            relatedObject: removed
                        });
                        return true;
                    }.bind(this));
                } else {
                    return false;
                }
                // } else {
                // 	console.log("Access violation: " + this.__() + "." + definition.setterName + "(...) not allowed by page/user");
                // }
            }
            return false;
        };
    }



    /*--------------------------------------
     *
     *        Reverse relations
     *
     *---------------------------------------*/


    // Getter
    function addReverseRelationGetter(object, definition) {
        object[definition.getterName] = function () {
            // console.log("Getting single relation (reverse): " + this.__() + "." + definition.name);
            trace('member', this, ".", definition.name);
            if (liquid.allowRead(this)) {
                var instance = this._relationInstances[definition.qualifiedName];
                liquid.registerObserverTo(this, definition, instance);
                if (typeof(instance.data) === 'undefined') {
                    // if (this.isSaved) {
                    instance.data = null;
                    liquid.ensureIncomingRelationLoaded(this, definition.incomingRelationQualifiedName);

                    // Return the first one or null
                    var incomingRelationQualifiedName = definition.incomingRelationQualifiedName;
                    // console.log(incomingRelationQualifiedName);
                    if (typeof(this._incomingRelations[incomingRelationQualifiedName]) !== 'undefined') {
                        var incomingRelationMap = this._incomingRelations[incomingRelationQualifiedName];
                        // console.log(this._incomingRelations);
                        // console.log(incomingRelation);
                        incomingRelationIds = Object.keys(incomingRelationMap);
                        if (incomingRelationIds.length !== 0) {
                            instance.data = incomingRelationMap[incomingRelationIds[0]];
                        }
                    }
                }
                return instance.data;
            } else {
                // console.log("Access violation: " + this.__() + "." + definition.getterName + "() not allowed by page/user");
                return null;
            }
        }
    }


    // Member: Reverse single setter
    function addReverseRelationSetter(object, definition) {
        // Just relays to the setter and getter of incoming relation, no security check here!
        var incomingRelationQualifiedName = definition.incomingRelationQualifiedName;
        object[definition.setterName] = function (newValue) {
            // console.log("Set single relation (reverse): " + this.__() + "." + definition.name + " = " + newValue.__());
            trace('member', this, ".", definition.setterName, "(", newValue, ")");
            var previousValue = this[definition.getterName]();
            if (previousValue !== newValue) {  //liquid.allowWrite(this) &&
                liquid.inPulseBlockUponChangeActions(function (pulse) {
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
                }.bind(this));
                return true;
            } else {
                return false;
            }
        };
    }

    // Member: Incoming set iterator
    function addReverseRelationPluralIterator(object, definition) {
        object[definition.forAllName] = function (action) {
            // if (liquid.allowRead(this)) {
            // console.log("Iterate set: " + this.__() + "." + definition.name);
            var instance = this._relationInstances[definition.qualifiedName];
            if (typeof(instance.data) === 'undefined') {
                liquid.loadReverseSetRelation(this, definition, instance);
            }
            liquid.registerObserverTo(this, definition, instance);
            instance.data.forEach(function (child) {
                action(child);
            }.bind(this));
            // }
        };
    }

    // Member: Incoming set getter
    function addReverseRelationPluralGetter(object, definition) {
        object[definition.getterName] = function () {
            // if (liquid.allowRead(this)) {
            // console.log("Get set: " + this.__() + "." + definition.name);
            // console.log(definition.getterName + "(...)");
            var instance = this._relationInstances[definition.qualifiedName];
            if (typeof(instance.data) === 'undefined') {
                liquid.loadReverseSetRelation(this, definition, instance);
            }
            liquid.registerObserverTo(this, definition, instance);
            return instance.data;
            // }
            // return [];
        };
    }

    // Member: Incoming set setter // Init setter (uses adder and remover  no notification and no actual manipulation)
    function addReverseRelationPluralSetter(object, definition) {
        object[definition.setterName] = function (newSet) {
            // if (liquid.allowWrite(this)) {
            // console.log("Set set: " + this.__() + "." + definition.name);
            // console.log(definition.setterName + "(...)");
            var instance = this._relationInstances[definition.qualifiedName];
            if (typeof(instance.data) === 'undefined') {
                // console.log("Needs loading of relation");
                liquid.loadReverseSetRelation(this, definition, instance);
            }
            // console.log(instance.data);
            var difference = arrayDifference(newSet, instance.data);
            if (difference.added.length > 0 || difference.removed.length > 0) {
                liquid.blockUponChangeActions(function () {
                    difference.added.forEach(function (added) {
                        //console.log(definition.adderName);
                        //console.log(this);
                        this[definition.adderName](added);
                    }.bind(this));
                    difference.removed.forEach(function (removed) {
                        this[definition.removerName](removed);
                    }.bind(this));
                }.bind(this));
                return true;
            } else {
                return false;
            }
            // }
            // return false;
        };
    }

    // Member: Incoming set adder (just relays to incoming relation, no notification and no actual manipulation)
    function addReverseRelationPluralAdder(object, definition, incomingRelationQualifiedName) {
        object[definition.adderName] = function (added) { // TODO: Add to pulse? But how to know if the event was rejected? We have to just give a chance!
            // if (liquid.allowWrite(this)) {
            // console.log("Add to set (reverse): " + this.__() + "." + definition.adderName + "(" + added.__() + ")");
            liquid.inPulseBlockUponChangeActions(function (pulse) {
                var incomingDefinition = added._relationDefinitions[incomingRelationQualifiedName];
                var actuallyAdded      = false;
                if (incomingDefinition.isSet) {
                    actuallyAdded = added[incomingDefinition.adderName](this);
                } else {
                    actuallyAdded = added[incomingDefinition.setterName](this);
                }
                if (actuallyAdded) {
                    var incomingInstance = added._relationInstances[incomingRelationQualifiedName];
                    pulse.add({
                        redundant: true,
                        action: 'addingRelation',
                        object: this,
                        definition: incomingDefinition,
                        instance: incomingInstance,
                        relatedObject: added
                    });
                }
            }.bind(this));
            // }
            // return false;
        };
    }

    // Member: Incoming set remover (just relays to incoming relation, no notification and no actual manipulation)
    function addReverseRelationPluralRemover(object, definition, incomingRelationQualifiedName) {
        object[definition.removerName] = function (removed) {
            // if (liquid.allowWrite(this)) {
            // console.log("Remove from set (reverse): " + this.__() + "." + definition.removerName + "(" + removed.__() + ")");
            liquid.inPulseBlockUponChangeActions(function (pulse) {
                console.log(definition.removerName + "(...)");
                var incomingDefinition = removed._relationDefinitions[incomingRelationQualifiedName];
                var actuallyRemoved    = false;
                if (incomingDefinition.isSet) {
                    actuallyRemoved = removed[incomingDefinition.removerName](this);
                } else {
                    actuallyRemoved = removed[incomingDefinition.setterName](null);
                }
                if (actuallyRemoved) {
                    var incomingInstance = added._relationInstances[incomingRelationQualifiedName];
                    pulse.add({
                        redundant: true,
                        action: 'addingRelation',
                        object: this,
                        definition: incomingDefinition,
                        instance: incomingInstance,
                        relatedObject: added
                    });
                }
            }.bind(this));
            // }
            // return false;
        };
    }




    /*--------------------------------------
     *             Dispatch
     *---------------------------------------*/

    liquid.addPropertyInterface = function(object, definition) {
        if (liquid.onServer && definition.clientOnly) {
            return;
        }
        var instance = {observers : {}};
        object._propertyDefinitions[definition.name] = definition;
        object._propertyInstances[definition.name] = instance; // This is only used in object augmentation mode.
        addPropertyGetter(object, definition);
        addPropertySetter(object, definition);
    };

    liquid.addRelationInterface = function(object, relationDefinition) {
        if (!relationDefinition.isSet) {
            if (!relationDefinition.isReverseRelation) {
                addRelationShapeCheck(object, relationDefinition);
                addRelationGetter(object, relationDefinition);
                addRelationSetter(object, relationDefinition);
            } else {
                addReverseRelationGetter(object, relationDefinition);
                addReverseRelationSetter(object, relationDefinition);
            }
        } else {
            if (!relationDefinition.isReverseRelation) {
                addRelationShapeCheck(object, relationDefinition);
                addRelationPluralIterator(object, relationDefinition);
                addRelationPluralGetter(object, relationDefinition);
                addRelationPluralSetter(object, relationDefinition);
                addRelationPluralAdder(object, relationDefinition);
                addRelationPluralRemover(object, relationDefinition);
            } else {
                var incomingRelationQualifiedName = relationDefinition.incomingRelationQualifiedName;
                addReverseRelationPluralIterator(object, relationDefinition);
                addReverseRelationPluralGetter(object, relationDefinition);
                addReverseRelationPluralSetter(object, relationDefinition);
                addReverseRelationPluralAdder(object, relationDefinition, incomingRelationQualifiedName);
                addReverseRelationPluralRemover(object, relationDefinition, incomingRelationQualifiedName);
            }
        }
    };
};


if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
    module.exports.addLiquidObjectMemberFunctionality = addLiquidObjectMemberFunctionality;
} else {
    // global.addLiquidObjectMemberFunctionality = addLiquidObjectMemberFunctionality;
}