

var addLiquidRepetitionFunctionality = function(liquid) {

	/**********************************
	 *  Dependency recording
	 *
	 *  Upon change do
	 **********************************/

	// Debug
	var traceRepetition = true;

	// Recorder stack
	liquid.activeRecorders = [];

	var recorderId = 0;
	liquid.uponChangeDo = function() { // description(optional), doFirst, doAfterChange. doAfterChange cannot modify model, if needed, use a repeater instead. (for guaranteed consistency)
		// Arguments
		var doFirst;
		var doAfterChange;
		var description = null;
		if (arguments.length > 2) {
			description = arguments[0];
			doFirst = arguments[1];
			doAfterChange = arguments[2];
		} else {
			doFirst = arguments[0];
			doAfterChange = arguments[1];
		}

		var recorder = {
			id : recorderId++,
			description : description,
			sources : [],
			uponChangeAction : doAfterChange
		};

		liquid.activeRecorders.push(recorder);
		var returnValue = doFirst();
		liquid.activeRecorders.pop();

		return returnValue;
	};

	liquid.setupObservation = function(object, propertyOrRelation) { // or repeater if observing its return value, object only needed for debugging.
		if (liquid.activeRecorders.length > 0) {
			if (traceRepetition) {
				console.log("setupObservation: " + object._ + "." + propertyOrRelation.name);
			}
			var activeRecorder = liquid.activeRecorders[liquid.activeRecorders.length - 1];
			// console.log("Reading property " + object.__() + "." + propertyOrRelation + " with repeater " + activeRecorder.id);

			// Ensure observer structure in place (might be unecessary)
			if (typeof(propertyOrRelation.observers) === 'undefined') {
				// console.log("setting up observers...");
				propertyOrRelation.observers = {};
			}
			var observerSet = propertyOrRelation.observers;

			// Add repeater on object beeing observed, if not already added before
			var recorderId = activeRecorder.id;
			if (typeof(observerSet[recorderId]) === 'undefined') {
				observerSet[recorderId] = activeRecorder;

				// Note dependency in repeater itself (for cleaning up)
				activeRecorder.sources.push(observerSet);
			}
			// console.group("Just set up observation");
			// console.log(activeRecorder.description);
			// console.log(Object.keys(propertyOrRelation.observers));
			// console.log(propertyOrRelation);
			// console.groupEnd();
		}
	};

	var dirtyRecorders = [];

	var observationBlocked = 0;
	liquid.blockObservation = function(callback) {
		observationBlocked++;
		callback();
		observationBlocked--;
		if (observationBlocked == 0) {
			while (dirtyRecorders.length > 0) {
				var recorder = dirtyRecorders.shift()
				blockSideEffects(function() {
					recorder.uponChangeAction();
				});
			}
		}
	};


	// Recorders is a map from id => recorder
	liquid.recordersDirty = function(recorders) {
		for (id in recorders) {
			liquid.recorderDirty(recorders[id]);
		}
	};


	liquid.recorderDirty = function(recorder) {
		if (traceRepetition) {
			console.log("Recorder noticed change: " + recorder.id + "." + recorder.description);
		}

		liquid.removeObservation(recorder); // Cannot be any more dirty than it already is!
		if (observationBlocked > 0) {
			dirtyRecorders.push(recorder);
		} else {
			blockSideEffects(function() {
				recorder.uponChangeAction();
			});
		}

		if (traceRepetition) {
			console.log("... recorder finished upon change action: " + recorder.id + "." + recorder.description);
		}
	};
	

	liquid.removeObservation = function(recorder) {
		// console.group("removeFromObservation: " + recorder.id + "." + recorder.description);
		if (recorder.id == 1)  {
			// debugger;
		}
		// Clear out previous observations
		recorder.sources.forEach(function(observerSet) { // From observed object
			// console.log("Removing a source");
			// console.log(observerSet[recorder.id]);
			delete observerSet[recorder.id];
		});
		clearArray(recorder.sources);  // From repeater itself.
		// console.groupEnd();
	};


	/**********************************
	 *
	 *   Repetition
	 *
	 **********************************/

	liquid.isRefreshingRepeater = function() {
		return liquid.activeRepeaters.length > 0;
	};

	
	liquid.activeRepeater = function() {
		return lastOfArray(liquid.activeRepeaters);
	};


	// Debugging
	var dirtyRepeaters = [];
	var allRepeaters = [];

	// Repeater stack
	liquid.activeRepeaters = [];
	repeaterId = 0;
	liquid.repeatOnChange = function() { // description(optional), action
		// Arguments
		var repeaterAction;
		var description = '';
		if (arguments.length > 1) {
			description = arguments[0];
			repeaterAction = arguments[1];
		} else {
			repeaterAction = arguments[0];
		}

		var repeater = {
			id : repeaterId++,
			description : description,
			childRepeaters: [],
			removed : false,
			action : repeaterAction
		};

		// Attatch to parent repeater.
		if (liquid.activeRepeaters.length > 0) {
			var parentRepeater = lastOfArray(liquid.activeRepeaters);
			parentRepeater.childRepeaters.push(repeater);
		};

		// Debug
		// allRepeaters.push(repeater);
		// if (allRepeaters.length == 10) {
			// debugger;
		// }
		// console.log("repeatOnChange activated: " + repeater.id + "." + description);
		liquid.refreshRepeater(repeater);
		return repeater;
	};

	liquid.refreshRepeater = function(repeater) {
		liquid.activeRepeaters.push(repeater);
		repeater.removed = false;
		repeater.returnValue = liquid.uponChangeDo(
			repeater.action,
			function() {
				if (traceRepetition) {
					console.log("Repeater's recorder notified change: " + repeater.id + "." + repeater.description);
				}
				if (!repeater.removed) {
					liquid.repeaterDirty(repeater);
				}
			}
		);
		liquid.activeRepeaters.pop();
	};

	liquid.repeaterDirty = function(repeater) { // TODO: Add update block on this stage?
		if (traceRepetition) {
			console.log("Repeater dirty: " + repeater.id + "." + repeater.description);
		}
		liquid.removeSubRepeaters(repeater);
		dirtyRepeaters.push(repeater);
		liquid.refreshAllDirtyRepeaters();
	};

	liquid.removeSubRepeaters = function(repeater) {
		if (repeater.childRepeaters.length > 0) {
			repeater.childRepeaters.forEach(function(repeater) {
				liquid.removeRepeater(repeater);
			});
			repeater.childRepeaters = [];
		}
	};

	liquid.removeRepeater = function(repeater) {
		// console.log("removeRepeater: " + repeater.id + "." + repeater.description);
		repeater.removed = true; // In order to block any lingering recorder that triggers change
		if (repeater.childRepeaters.length > 0) {
			repeater.childRepeaters.forEach(function(repeater) {
				liquid.removeRepeater(repeater);
			});
			repeater.childRepeaters.length = 0;
		}

		//removeFromArray(repeater, liquid.activeRecorders);
		removeFromArray(repeater, dirtyRepeaters);
		removeFromArray(repeater, allRepeaters);
	};


	var refreshingAllDirtyRepeaters = false;
	liquid.refreshAllDirtyRepeaters = function() {
		if (!refreshingAllDirtyRepeaters) {
			if (dirtyRepeaters.length > 0) {
				if (traceRepetition) {
					console.log("Starting refresh of all dirty repeaters, current count of dirty:" + dirtyRepeaters.length);
				}
				refreshingAllDirtyRepeaters = true;
				while(dirtyRepeaters.length > 0) {
					var repeater = dirtyRepeaters.shift();
					liquid.refreshRepeater(repeater);
				}

				refreshingAllDirtyRepeaters = false;
				if (traceRepetition) {
					console.log("Finished refresh of all dirty repeaters, current count of dirty:" + dirtyRepeaters.length + ", all current and refreshed repeaters:");
					console.log(allRepeaters);
					// console.log("==============");
				}
			}
		}
	};


	/************************************************************************
	 *  Cached methods
	 *
	 * A cached method will not reevaluate for the same arguments, unless
	 * some of the data it has read for such a call has changed. If there 
	 * is a parent cached method, it will be notified upon change. 
	 * (even if the parent does not actually use/read any return value)
	 ************************************************************************/

	function makeArgumentHash(argumentList) {
		var hash =  "";
		var first = true;
		argumentList.forEach(function(argument) {
			if (!first) {
				hash += ";";
			}
			if (isArray(argument)) {
				hash += "[" + makeArgumentHash(argument) + "]";
			} else if (typeof(argument) === 'object') {
				hash += "{id=" + argument._id + "}";   // Note! Do not use id here as it can change when source is shifted.  
			} else {
				hash += argument;
			}
		});
		return hash;
	};

	liquid.addGenericMethodCacher = function(object) {
		object['cachedCall'] = function() {
			// Split arguments 
			var argumentsArray = argumentsToArray(arguments);
			var methodName = argumentsArray.shift();
			var methodArguments = argumentsArray;

			console.log(this.__() + '.[cachedCall]' +  methodName);
			
			// Establish method caches
			if (typeof(this["__cachedCalls"]) === 'undefined') {
				this["__cachedCalls"] = {};
			}
			var methodCaches = null;
			if (typeof(this.__cachedCalls[methodName]) === 'undefined') {
				methodCaches = {};
				this.__cachedCalls[methodName] = methodCaches;				
			} else {
				methodCaches = this.__cachedCalls[methodName];
			}
			
			// Establish argument hash
			var argumentHash = makeArgumentHash(methodArguments);
			// console.log("Argument hash:" + argumentHash);
			if (typeof(methodCaches[argumentHash]) === 'undefined') {
				console.log("Cached method not seen before, or re-caching needed... ");
				var methodCache = {
					observers : {},
					returnValue : returnValue
				};
				methodCaches[argumentHash] = methodCache;

				// Never encountered these arguments before, make a new cache
				var returnValue = uponChangeDo(this.__() + "." + methodName,
					function() {
						var returnValue;
						liquid.blockSideEffects(function() {
							returnValue = this[methodName].apply(this, methodArguments);
						});
						return returnValue;
					}.bind(this), 
					function() {
						console.log("Terminating cached method repeater: " + this.__() + '.[cachedCall]' +  methodName);
						// Get and delete method cache
						var methodCaches = this.__cachedCalls[methodName];
						var methodCache = methodCaches[argumentHash];
						delete methodCaches[argumentHash];

						// Recorders dirty
						liquid.recordersDirty(methodCache.observers);
					}.bind(this));
				methodCache.returnValue = returnValue;
				liquid.setupObservation(this, methodCache);
				return returnValue;
			} else {
				// Encountered these arguments before, reuse previous repeater
				console.log("Cached method seen before ...");
				var methodCache = methodCaches[argumentHash];
				liquid.setupObservation(this, methodCache);
				return methodCache.returnValue;
			}
		}
	};


	/*********************************************************************************************************
	 *  Projections
	 *
	 *  A projection will maintain the identite(s) of it output ojbects. When something changes, the projection
	 *  will re-evaluate, and the result will be merged into the output data structure that was created in the
	 *  first run.
	 *
	 *  Observers that read a projection will only be notified of change if there is an actual change in return-value (the idetitiy of a returned object)
	 *  Observers that read a projected data structure will only be notified of change if they read parts of
	 *  the projected data structure that has new merged data as the projection is updated.
	 *******************************************************************************************************/


	liquid.activeProjections = [];

	liquid.isProjecting = function() {
		return liquid.activeProjections.length > 0;
	};


	liquid.activeProjection = function() {
		return lastOfArray(liquid.activeProjections);
	};

	liquid.addGenericProjection = function(object) {
		object['project'] = function() {
			// Split arguments
			var argumentsArray = argumentsToArray(arguments);
			var methodName = argumentsArray.shift();
			var methodArguments = argumentsArray;

			// Establish method caches
			if (typeof(this["__cachedProjections"]) === 'undefined') {
				this["__cachedProjections"] = {};
			}
			var projections = null;
			if (typeof(this.__cachedProjections[methodName]) === 'undefined') {
				projections = {};
				this.__cachedProjections[methodName] = projections;
			} else {
				projections = this.__cachedProjections[methodName];
			}

			// Establish argument hash
			var argumentHash = makeArgumentHash(methodArguments);

			// console.log("Argument hash:" + argumentHash);
			if (typeof(projections[argumentHash]) === 'undefined') {
				console.log("Cached method not seen before, or re-caching needed... ");
				var projection = {
					returnValueObservers : {},
					establishedReturnValue : null,
					nextAutogeneratedProjectionId : 1,

					temporaryProjectionIdToObjectMap : {},
					establishedProjectionIdToObjectMap : {}
				};
				projections[argumentHash] = projection;

				// Never encountered these arguments before, make a new cache
				projection.repeater = repeatOnChange(this.__() + "." + methodName,
					function() {
						console.log("Reevaluating projection: " + this.__() + '.[cachedCall]' +  methodName);
						projection.temporaryProjectionIdToObjectMap = {};

						liquid.activeProjections.push(projection);
						// Run the projection code
						var newReturnValue;
						liquid.blockSideEffects(function() {
							newReturnValue = this[methodName].apply(this, methodArguments);
						});

						liquid.activeProjections.pop();

						// Build a final projectionId to object map that contains all objects present in the final projection.
						var projectionIdToObjectMap : {};
						for (projectionId in projection.temporaryProjectionIdToObjectMap) {
							if (typeof(projection.establishedProjectionIdToObjectMap[projectionId]) !== 'undefined') {
								// An established object exists, merge state.
								projectionIdToObjectMap[projectionId] = projection.establishedProjectionIdToObjectMap[projectionId];
							} else {
								// No established object exists. Need to re-map all outgoing references nevertheless.
								projectionIdToObjectMap[projectionId] = projection.temporaryProjectionIdToObjectMap[projectionId];
							}
						}

						// Find projection objects that needs termination.
						var objectsToTerminate = [];
						for (projectionId in projection.establishedProjectionIdToObjectMap) {
							if (typeof(projectionIdToObjectMap[projectionId]) === 'undefined') {
								objectsToTerminate.push(projection.establishedProjectionIdToObjectMap[projectionId]);
							}
						}


						// Merge state to established objects, and change references to established objects.
						for (projectionId in projection.temporaryProjectionIdToObjectMap) {
							function mapLiquidObjectsDeep(data, mapFunction) {
								if (data === null) {
									return null;
								} else if (isArray(data)) {
									newData = [];
									data.forEach(function(element) {
										newData.push(mapLiquidObjectsDeep(element, mapFunction));
									});
									replaceArrayContents(newData, data);
									return data;
								} else if (typeof(data) == 'object') {
									if (typeof(data._id) !== 'undefined' && typeof(data._upstreamId) !== 'undefined') {
										// Liquid object for sure!
										return mapFunction(data);
									} else {
										for (property in data) {
											data[property] = mapLiquidObjectsDeep(data[property], mapFunction);
										}
										return data;
									}
								} else {
									return data;
								}
							}
							function replaceReference(relatedObject) {
								if (relatedObject === null) {
									return null;
								} else if (typeof(relatedObject.projection) !== 'undefined' && relatedObject.projection === projection) {
									return projectionIdToObjectMap[relatedObject.projectionId];
								} else {
									return relatedObject;
								}
							}
							if (typeof(projection.establishedProjectionIdToObjectMap[projectionId]) !== 'undefined') {
								// Merge into established object
								var establishedObject = projection.establishedProjectionIdToObjectMap[projectionId];
								var temporaryObject = projection.temporaryProjectionIdToObjectMap[projectionId];

								// Merge relations into established object
								temporaryObject.forAllOutgoingRelations(function(definition, instance) {
									var newData;
									if (definition.isSet) {
										var newData = [];
										var temporaryData = instance.data;
										temporaryData.forEach(function(relatedObject) {
											newData.push(replaceReference(relatedObject));
										});
										establishedObject[definition.setter](newData)
									} else {
										var temporaryData = instance.data;
										var newData = replaceReference(relatedObject);
									}
									establishedObject[definition.setter](newData);
								});

								// Merge properties into established object (Note: only actual changes will trigger change)
								var temporaryObject = projection.temporaryProjectionIdToObjectMap[projectionId];
								establishedObject.forAllProperties(function(definition, instance) {
									// Transfer data
									establishedObject[definition.setterName](temporaryObject[definition.getterName]());
								});
							} else {
								// Merge relations into established object
								temporaryObject.forAllOutgoingRelations(function(definition, instance) {
									var newData;
									if (definition.isSet) {
										var newData = [];
										var temporaryData = instance.data;
										temporaryData.forEach(function(relatedObject) {
											newData.push(replaceReference(relatedObject));
										});
										establishedObject[definition.setter](newData)
									} else {
										var temporaryData = instance.data;
										var newData = replaceReference(relatedObject);
									}
									temporaryObject[definition.setter](newData);
								});
							}
						}

						// Clear out removed objects TODO: Consider if we should remove all references to them also, and let them truly die!? Should it be possible to revive them again sometime?
						objectsToTerminate.forEach(function(object) {
							object.forAllOutgoingRelations(function(definition, instance) {
								if (definition.isSet) {
									object[definition.setterName]([]);
								} else {
									object[definition.setterName](null);
								}
							});
							object.forAllProperties(function(definition, instance) {
								object[definition.setterName](definition.defaultValue);
							});
						});

						// Set the new established projection id to object map.
						projection.establishedProjectionIdToObjectMap = projectionIdToObjectMap;

						// Notify return value observers
						newReturnValue = mapLiquidObjectsDeep(newReturnValue, function(liquidObject) {replaceReference(liquidObject);});
						if (newReturnValue !== projection.establishedReturnValue) {
							projection.establishedReturnValue = newReturnValue;
							liquid.recordersDirty(projectionRepeater.returnValueObservers);
						}
					}.bind(this));

				liquid.setupObservation(this, projectionRepeater);
				return projection.establishedReturnValue;
			} else {
				// Encountered these arguments before, reuse previous repeater
				console.log("Cached method seen before ...");
				var projectionRepeater = projections[argumentHash];
				liquid.setupObservation(this, projectionRepeater);
				return projectionRepeater.returnValue;
			}
		}
	}




	/*********************************************************************************************************
	 *  Block side effects
	 *******************************************************************************************************/

	liquid.activeSideEffectBlockers = [];

	liquid.isBlockingSideEffects = function() {
		return liquid.activeSideEffectBlockers.length > 0 && liquid.activeSideEffectBlocker() !== 'unlocked';
	};

	liquid.activeSideEffectBlocker = function() {
		return lastOfArray(liquid.activeSideEffectBlockers);
	};

	liquid.unlockSideEffects = function(callback, repeater) {  // Should only be used by repeater!
		liquid.activeSideEffectBlockers.push('unlocked');
		callback();
		liquid.activeSideEffectBlockers.pop();
	};
	
	liquid.blockSideEffects = function(callback) {
		liquid.activeSideEffectBlockers.push({
			createdObjects: {}  // id ->    It is ok to modify objects that have been created in this call, so we need to keep track of them 
		});
		callback();
		liquid.activeSideEffectBlockers.pop();
	};
};






if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addLiquidRepetitionFunctionality = addLiquidRepetitionFunctionality;
}


