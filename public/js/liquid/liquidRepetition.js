

var addLiquidRepetitionFunctionality = function(liquid) { 

	/*********************************
	* repeatOnChange (watch handling) 
	**********************************/
	
	var traceRepetition = false;
	liquid.repeatersBeeingRefreshed = [];
	var dirtyRepeaters = [];
	var allRepeaters = []; // Needed for debug only
	var repeaterId = 0;
	
	// Debugging
	liquid.dirtyRepeaters = dirtyRepeaters;
	liquid.allRepeters = allRepeaters;
	// liquid.repeatersBeeingRefreshed = repeatersBeeingRefreshed;
	
	liquid.uponChangeDo = function() { // description(optional), doFirst, doAfterChange
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
		
		var repeater = createRepeaterStructure({
			terminateOnDirty : true,
			afterTerminationAction : doAfterChange,
			description : description,
			action : doFirst,
		});
		
		allRepeaters.push(repeater);
		// if (allRepeaters.length == 10) {
			// debugger;
		// }
		// console.log("repeatOnChange activated: " + repeater.id + "." + description);
		liquid.refreshRepeater(repeater);
		return repeater;
	}
	
	
	liquid.repeatOnChange = function() { // description(optional), action
		// Arguments
		var repeaterAction;
		var description = null;
		if (arguments.length > 1) {
			description = arguments[0];
			repeaterAction = arguments[1];
		} else {
			repeaterAction = arguments[0];			
		}
			
		var repeater = createRepeaterStructure({
			terminateOnDirty : false,
			description : description,
			action : repeaterAction
		});

		if (liquid.repeatersBeeingRefreshed.length > 0) {
			var parentRepeater = lastOfArray(liquid.repeatersBeeingRefreshed);
			if (!parentRepeater.terminateOnDirty && !repeater.terminateOnDirty) {
				parentRepeater.childRepeaters.push(repeater);
			}
		};

		allRepeaters.push(repeater);
		// if (allRepeaters.length == 10) {
			// debugger;
		// }
		// console.log("repeatOnChange activated: " + repeater.id + "." + description);
		liquid.refreshRepeater(repeater);
		return repeater;
	};
	
	var createRepeaterStructure = function(values) {
		var defaultStructure = {
			id : repeaterId++,
			description : null,

			dirty : true,
			
			terminateOnDirty : false, 
			afterTerminationAction : null,
			
			sources : [],
			
			childRepeaters: [],
			
			returnValue : null
		};
		for (property in values) {
			defaultStructure[property] = values[property];
		}
		return defaultStructure;
	}
	
	liquid.noModeDirtyRepeatersCallback = [];
	liquid.addNoMoreDirtyRepeaterCallback = function(callback) {
		liquid.noModeDirtyRepeatersCallback.push(callback);
	}
	
	var holdingChangePropagation = 0;
	liquid.holdChangePropagation = function(action) {
		holdingChangePropagation++;
		action();
		holdingChangePropagation--;
		liquid.refreshAllDirtyRepeaters();
	};
		
	liquid.repeaterDirty = function(repeater) { // TODO: Add update block on this stage?
		if (!repeater.dirty) {
			if (traceRepetition) {
				console.log("Repeater dirty: " + repeater.id + "." + repeater.description);
			}			
			liquid.removeObservation(repeater); // Cannot be any more dirty than it already is!
			if (!repeater.terminateOnDirty) {
				repeater.dirty = true;
				dirtyRepeaters.push(repeater);
				liquid.tryToRefreshAllDirtyRepeaters();				
			} else {
				if (traceRepetition) {
					console.group("Terminating one-time repeater " + repeater.id + "." + repeater.description);
				}
				var doAfterTerminate = repeater.afterTerminationAction;
				liquid.removeRepeaterItself(repeater);
				doAfterTerminate(); 
				if (dirtyRepeaters.length == 0) {
					liquid.noModeDirtyRepeatersCallback.forEach(function(callback) { callback() });
				}
				// Do actual repetition
				// console.log("Before call");
				// repeater.returnValue = repeater.action();
				// console.log(repeater.returnValue);
				// liquid.removeOrphinedSubRepeaters(repeater);			
				// repeater.dirty = false;
				// if (startedToMeasureTime) {
					// var end = new Date().getTime();
					// var time = (end - start);
					// refreshAccumulatedTime += time;

					// console.log(allRepeaters);
					// debugger;
					// measuringTime = false;
				// }			
				if (traceRepetition) {
					console.log("Finished terminating one-time repeater " + repeater.id + "." + repeater.description + ". (total time spent on refresh so far:" + refreshAccumulatedTime + ")");
					console.groupEnd();
				}
			}
		}
	};
	
	liquid.tryToRefreshAllDirtyRepeaters = function() {
		if (holdingChangePropagation === 0) {
			liquid.refreshAllDirtyRepeaters();
		}
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
				liquid.noModeDirtyRepeatersCallback.forEach(function(callback) { callback() });
				refreshingAllDirtyRepeaters = false;
				if (traceRepetition) {
					console.log("Finished refresh of all dirty repeaters, current count of dirty:" + dirtyRepeaters.length + ", all current and refreshed repeaters:");
					console.log(allRepeaters);
					// console.log("==============");
				}
			}
		}
	};
	
	liquid.removeObservation = function(repeater) {
		// console.group("removeFromObservation: " + repeater.id + "." + repeater.description);
		if (repeater.id == 1)  {
			// debugger;
		}
		// Clear out previous observations
		repeater.sources.forEach(function(observerSet) { // From observed object
			// console.log("Removing a source");
			// console.log(observerSet[repeater.id]);
			delete observerSet[repeater.id];
		});
		clearArray(repeater.sources);  // From repeater itself.
		// console.groupEnd();
	};	
	
	liquid.removeSubRepeaters = function(repeater) {
		if (repeater.childRepeaters.length > 0) {
			repeater.childRepeaters.forEach(function(repeater) {
				liquid.removeRepeater(repeater);
			});
			repeater.childRepeaters = [];
		}
	};

	liquid.removeRepeaterItself = function(repeater) {
		// console.log("removeRepeaterItself: " + repeater.id + "." + repeater.description);
		// console.log(repeater);
		// if (repeater.childRepeaters.length > 0) {
			// repeater.childRepeaters.forEach(function(repeater) {
				// liquid.removeRepeater(repeater);
			// });
			// repeater.childRepeaters.length = 0;
		// }
		
		// liquid.removeObservation(repeater);   // We are already dirty at this stage, so we do not need to remove observation
		//removeFromArray(repeater, liquid.repeatersBeeingRefreshed);
		removeFromArray(repeater, dirtyRepeaters);
		removeFromArray(repeater, allRepeaters);		
	};
	
	liquid.removeRepeater = function(repeater) {
		// console.log("removeRepeater: " + repeater.id + "." + repeater.description);
		// console.log(repeater);
		if (repeater.childRepeaters.length > 0) {
			repeater.childRepeaters.forEach(function(repeater) {
				liquid.removeRepeater(repeater);
			});
			repeater.childRepeaters.length = 0;
		}
		
		liquid.removeObservation(repeater);
		//removeFromArray(repeater, liquid.repeatersBeeingRefreshed);
		removeFromArray(repeater, dirtyRepeaters);
		removeFromArray(repeater, allRepeaters);		
	};
	
	var refreshAccumulatedTime = 0;
	var measuringTime = false;
	liquid.refreshRepeater = function(repeater) {
		// var start = new Date().getTime();
		// var startedToMeasureTime = !measuringTime;
		// measuringTime = true;
		// var trace = repeater.childRepeaters.length > 0;
		
		// if (traceRepetition) {
			// console.group("Refreshing repeater " + repeater.id + "." + repeater.description);
		// }

		liquid.removeSubRepeaters(repeater);
		liquid.repeatersBeeingRefreshed.push(repeater);
		repeater.returnValue = repeater.action();
		repeater.dirty = false;		
		liquid.repeatersBeeingRefreshed.pop();

		// if (startedToMeasureTime) {
			// var end = new Date().getTime();
			// var time = (end - start);
			// refreshAccumulatedTime += time;

			// console.log(allRepeaters);
			// debugger;
			// measuringTime = false;
		// }			
		// if (traceRepetition) {
			// console.log("Finished refresing clocked repeater. Total time spent on refresh so far:" + refreshAccumulatedTime);
			// console.groupEnd();
		// }
	};
	
	liquid.setupObservation = function(object, propertyOrRelation) { // or repeater if observing its return value, object only needed for debugging. 
		if (liquid.repeatersBeeingRefreshed.length > 0) {
			if (traceRepetition) {
				console.log("setupObservation: " + object._ + "." + propertyOrRelation.name);
			}
			var repeaterBeeingRefreshed = liquid.repeatersBeeingRefreshed[liquid.repeatersBeeingRefreshed.length - 1];
			// console.log("Reading property " + object.entityId + "." + propertyOrRelation + " with repeater " + repeaterBeeingRefreshed.id);

			// Ensure observer structure in place (might be unecessary)
			if (typeof(propertyOrRelation.observers) === 'undefined') {
				// console.log("setting up observers...");
				propertyOrRelation.observers = {};
			}
			var observerSet = propertyOrRelation.observers;
			
			// Add repeater on object beeing observed, if not already added before
			var repeaterId = repeaterBeeingRefreshed.id;
			if (typeof(observerSet[repeaterId]) === 'undefined') {
				observerSet[repeaterId] = repeaterBeeingRefreshed;
				
				// Note dependency in repeater itself (for cleaning up)
				repeaterBeeingRefreshed.sources.push(observerSet);				
			}
			// console.group("Just set up observation");
			// console.log(repeaterBeeingRefreshed.description);
			// console.log(Object.keys(propertyOrRelation.observers));
			// console.log(propertyOrRelation);
			// console.groupEnd();
		}
	};
	
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
				hash += "{id=" + argument.__uniqueSessionId + "}";   // Note! Do not use id here as it can change when source is shifted.  
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

			console.log(this._ + '.[cachedCall]' +  methodName);
			
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

				// Never encountered these arguments before, make a new cache
				var methodCacheRepeater = uponChangeDo("(" + this.className + "." + this.id+ ")" + methodName, 
					function() {
						return this[methodName].apply(this, methodArguments);
					}.bind(this), 
					function() {
						console.log("Terminating cached method repeater: " + this._ + '.[cachedCall]' +  methodName);
						// liquid.holdChangePropagation(function() {
						var methodCaches = this.__cachedCalls[methodName];
						var methodCacheRepeater = methodCaches[argumentHash];
						var observers = methodCacheRepeater.observers;
						delete methodCaches[argumentHash];
						// console.log(methodCaches[argumentHash]);
						for (id in observers) {
							liquid.repeaterDirty(observers[id]);
						}
						// }.bind(this));
					}.bind(this));
				methodCaches[argumentHash] = methodCacheRepeater;
				liquid.setupObservation(this, methodCacheRepeater);
				return methodCacheRepeater.returnValue;
			} else {
				// Encountered these arguments before, reuse previous repeater
				console.log("Cached method seen before ...");
				// console.log("Repeater returning");
				// console.log(methodCache.returnValue);
				var methodCacheRepeater = methodCaches[argumentHash];
				if (methodCacheRepeater.dirty) {
					debugger;
				}
				liquid.setupObservation(this, methodCacheRepeater);
				return methodCacheRepeater.returnValue;
			}
		}
	}
	
	liquid.addGenericMethodRepeater = function(object, repeaterName, method) {
		// Consider: Should repeater instances be set on the object somehow?
		// if (typeof(object.parentRepeaters) === 'undefined') {
			// object.parentRepeaters = {}; // TODO: this should be removed before object usage!
		// }
		// object.parentRepeaters[repeaterName] = method;
		object[repeaterName] = function() {
			if (typeof(this["__" + repeaterName + "_instances"]) === 'undefined') {
				this["__" + repeaterName + "_instances"] = {};
			}
			var repeaterInstances = this["__" + repeaterName + "_instances"];
			// console.log("Calling cached method: " + object._ + "."+ repeaterName);
			var repeaterArguments = argumentsToArray(arguments);
			var argumentHash = makeArgumentHash(repeaterArguments);
			if (typeof(repeaterInstances[argumentHash]) === 'undefined') {
				// Never encountered these arguments before, make a new repeater
				// console.log("New arguments...");
				var repeaterRecord = {
					name: repeaterName + "(repeater)",
					repeater : null,
					previousReturnValue : null,
				};
				liquid.setupObservation(this, repeaterRecord.repeater);
				repeaterRecord.repeater = repeatOnChange("(" + this.className + "." + this.id+ ")" + repeaterName, function() {
					var returnValue = method.apply(this, repeaterArguments);
					// console.log("Evaluating repeater");
					// console.log(returnValue);

					return returnValue;
				}.bind(this));
				repeaterInstances[argumentHash] = repeaterRecord;
				// console.log("Repeater returning");
				// console.log(repeaterRecord.returnValue);
				return repeaterRecord.repeater.returnValue;
			} else {
				// Encountered these arguments before, reuse previous repeater
				// console.log("Seen before ...");
				// console.log(repeaterRecord.repeater.returnValue);
				var repeaterRecord = repeaterInstances[argumentHash];
				var repeater = repeaterRecord.repeater;
				liquid.setupObservation(this, repeaterRecord.repeater);
				if (repeater.dirty) {
					// console.log("Refreshing a sub repeater as a part of refreshing a repeater...");
					liquid.refreshRepeater(repeater);
				}
				// console.log("Repeater returning");
				// console.log(repeaterRecord.returnValue);
				return repeaterRecord.repeater.returnValue; // return method repeater. 
			}
		}
	} 
};

// TODO: handle consolidation of newly created objects into existing ones. 

// New syntax:

// var result = uponChangeDo(function() {	
	// return foo(;
// }, function() {
	// this.
// });

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addLiquidRepetitionFunctionality = addLiquidRepetitionFunctionality;
}