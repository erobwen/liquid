
	liquid.addIncomingRelationGetter = function(object) {
		object.get = fu
	}

	
	liquid.loadReverseSetRelation = function(object, definition, instance) {
		// Load relation
		//console.log("loadReverseSetRelation: (" + object.className + "." + object.id + ") <-- ["+ definition.incomingRelationQualifiedName + "] --?");
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
			liquid.addSingleRelation(object, relationDefinition);
		} else {
			liquid.addSetRelation(object, relationDefinition);		
		}
	};

	
	// Access funcitons setters and setters. 
	liquid.addSingleRelation = function(object, definition) {
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
							liquid.addIncomingRelationOnLoad(relatedObject, definition.qualifiedName, this);
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
					liquid.roleStack.push('administrator');
					liquid.ensureIncomingRelationLoaded(this, definition.incomingRelationName);
					liquid.roleStack.pop();

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
							liquid.deleteIncomingRelationOnDelete(previousValue, definition.qualifiedName, this);
						}

						// Set new relation.
						var instance = this._relationInstances[definition.qualifiedName];
						instance.data = newValue;
						if (newValue !== null) {
							liquid.addIncomingRelationOnAdd(newValue, definition.qualifiedName, this);
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
						newValue[incomingRemoverName](this);  // Note: no need to call liquid.notifyDeleteIncomingRelationOnDelete(object, definition, instance); since this will be called by deleteIncomingRelationOnDelete
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

	liquid.addSetRelation = function(object, definition) { // data neo4j
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
				if (allowWrite(this, liquid.page)) {
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
					liquid.deleteIncomingRelationOnDelete(removed, definition.qualifiedName, this);
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
}

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
				liquid.notifyAddIncomingRelationOnAdd(object, reverseDefinition, reverseInstance);				
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
			liquid.notifyDeleteIncomingRelationOnDelete(object, reverseDefinition, reverseInstance);
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
			// Outgoing instance is not loaded, still we need to keep an outgoing reference in order to garbage collect etc. 
			if (typeof(outgoingInstance.referingObjectsWhenUnloaded) === 'undefined') {
				outgoingInstance.outgoingReferencesWhenUnloaded = {};
			}
			outgoingInstance.referingObjectsWhenUnloaded[relatedObject.id] = relatedObject;
		}
	};
