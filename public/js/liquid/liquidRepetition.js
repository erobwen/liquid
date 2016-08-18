

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

	// Recorders is a map from id => recorder
	liquid.recordersDirty = function(recorders) {
		liquid.pauseRepeaters(function() {
			for (id in recorders) {
				liquid.recorderDirty(recorders[id]);
			}
		});
	};


	liquid.recorderDirty = function(recorder) {
		if (traceRepetition) {
			console.log("Recorder noticed change: " + recorder.id + "." + recorder.description);
		}

		if (pausingRepeaters == 0) {
			liquid.pauseRepeaters(function() {
				liquid.removeObservation(recorder); // Cannot be any more dirty than it already is!
				recorder.uponChangeAction();
			});
		} else {
			liquid.removeObservation(recorder); // Cannot be any more dirty than it already is!
			recorder.uponChangeAction();
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


	var pausingRepeaters = 0;
	liquid.pauseRepeaters = function(action) {
		pausingRepeaters++;
		action();
		pausingRepeaters--;
		liquid.refreshAllDirtyRepeaters();
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
		liquid.tryToRefreshAllDirtyRepeaters();
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

	liquid.tryToRefreshAllDirtyRepeaters = function() {
		if (pausingRepeaters=== 0) {
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
						return this[methodName].apply(this, methodArguments);
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
	 *  Cached reevaluated methods
	 *
	 *  A cached reevaluated method call will not notify change to its caller directly upon change in data.
	 *  
	 *  Instead it will reevaluate the method upon data change, and only if 
	 *  the resulting return value changes, it will notify its caller. 
	 *  
	 *******************************************************************************************************/

	liquid.addGenericReevaluatedMethodRepeater = function(object, repeaterName, method) {
		object['cachedReevaluatedCall'] = function() {
			// Split arguments
			var argumentsArray = argumentsToArray(arguments);
			var methodName = argumentsArray.shift();
			var methodArguments = argumentsArray;

			// Establish method caches
			if (typeof(this["__cachedReevaluatedCalls"]) === 'undefined') {
				this["__cachedReevaluatedCalls"] = {};
			}
			var methodCaches = null;
			if (typeof(this.__cachedReevaluatedCalls[methodName]) === 'undefined') {
				methodCaches = {};
				this.__cachedReevaluatedCalls[methodName] = methodCaches;
			} else {
				methodCaches = this.__cachedReevaluatedCalls[methodName];
			}

			// Establish argument hash
			var argumentHash = makeArgumentHash(methodArguments);

			// console.log("Argument hash:" + argumentHash);
			if (typeof(methodCaches[argumentHash]) === 'undefined') {
				console.log("Cached method not seen before, or re-caching needed... ");
				var methodCache = {
					observers : {},
					returnValue : null
				};
				methodCaches[argumentHash] = methodCache;

				// Never encountered these arguments before, make a new cache
				methodCache.repeater = repeatOnChange(this.__() + "." + methodName,
					function() {
						console.log("Reevaluating cached method repeater: " + this.__() + '.[cachedCall]' +  methodName);
						var newReturnValue = this[methodName].apply(this, methodArguments);
						methodCache.returnValue = newReturnValue;

						// Recorders dirty
						if (newReturnValue !== methodCache.returnValue) {
							methodCache.returnValue = newReturnValue;
							liquid.recordersDirty(methodCacheRepeater.observers);
						}
					}.bind(this));

				liquid.setupObservation(this, methodCacheRepeater);
				return returnValue;
			} else {
				// Encountered these arguments before, reuse previous repeater
				console.log("Cached method seen before ...");
				var methodCacheRepeater = methodCaches[argumentHash];
				liquid.setupObservation(this, methodCacheRepeater);
				return methodCacheRepeater.returnValue;
			}
		}
	} 
};

// TODO: handle consolidation of newly created objects into existing ones. 


if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addLiquidRepetitionFunctionality = addLiquidRepetitionFunctionality;
}