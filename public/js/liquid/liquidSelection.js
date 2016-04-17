
var addLiquidSelectionFunctionality = function(liquid) {
	liquid.addUniversialRelationSelection = function(selection) {
		if (typeof(selection) === 'object') {
			selection.spans = {0: 'max'};
		}
		return selection;
	}

	liquid.mergeRelationSelection = function(source, destination, universialSelectorSiblingToDestination) {
		if (typeof(destination) === 'undefined') {
			if (universialSelectorSiblingToDestination) {
				return addUniversialRelationSelection(source);
			} else {
				return source;
			}
		} else {
			if (source === true) {
				if (typeof(destination) === 'object') {
					if (typeof(destination.history) !== 'undefined') {
						destination.spans = {0: 'max'};
						return destination;
					} 
				}
				return true;
			}
			if (destination === true) {
				if (typeof(source) === 'object') {
					if (typeof(source.history) !== 'undefined') {
						source.spans = {0: 'max'};
						return source;
					} 
				}
				return true;
			}
			if (typeof(source.history) !== null) {
				destination.history = true;			
			}
			if (typeof(source.spans) !== null) {
				if (typeof(destination.spans) === 'undefined') {
					destination.spans = source.spans
				} else {
					destination.spans = mergeSpans(source.spans, destination.spans)
				}
			}
			return destination;
		}
	}

	liquid.mergeObjectSelections = function(source, destination) {
		// Source is never undefined.
		if (typeof(destination) === 'undefined') {
			return source;
		} else {
			var destinationHasUniversialSelector = typeof(destination['allOther']) !== 'undefined';				
			for (selected in source) {
				destination[selected] = mergeRelationSelection(source[selected], destination[selected], destinationHasUniversialSelector);
			}

			var sourceHasUniversialSelector = typeof(source['allOther']) !== 'undefined';
			for (selected in destination) {
				if (typeof(source[selected]) === 'undefined') {
					destination[selected] = addUniversialRelationSelection(destination[selected]);
				}
			}
			return destination;
		}
	}

	liquid.mergeSelections = function(source, destination) {
		for (selected in source) {
			destination[selected] = liquid.mergeObjectSelections(source[selected], destination[selected]);
		}
	}

	liquid.mergeToSelection = function(id, objectSelection, destination) {
		destination[id] = liquid.mergeObjectSelections(objectSelection, destination[id]);
		// console.log(destination);
	}

	liquid.spanMax = function(a, b) {
		if (a === 'max' || b === 'max') {
			return 'max';
		} else {
			return Math.max(a, b);
		}	
	}

	liquid.mergeSpans = function(source, destination) {
		if (typeof(destination) === 'undefined') {
			return source;
		} else {
			for(var start in source) {
				var end = source[start];
				if (typeof(destination[start]) !== 'undefined') {
					var destinationEnd = destination[start];
					destination[start] = spanMax(destinationEnd, end); 
				}
			}
			var lastStart = -1;
			var lastEnd = -1;
			for(var destinationStart in destination) {
				var destinationEnd = destination[destinationStart];
				if (destinationStart <= lastEnd) {
					delete destination[destinationStart];
					destination[lastStart] = spanMax(destinationEnd, lastEnd);
					lastEnd = destinationEnd;
				} else {
					lastStart = destinationStart;
					lastEnd = destinationEnd;
				}
			}
			return destination;
		}
	}
	// console.log("Debugging selection");
	var selection = {};

	// mergeToSelection(4, {all:true, Foobar: { spans: {0: 'maxIndex'}, history: true}}, selection);
	/**
		for (var destinationStart in destination) {
			destinationEnd = destination[destinationStart];
			if (destinationStart <= end && end <= destinationEnd) {
				if (start < destinationStart) {
					delete destination[destinationStart];
					destination[start] = destinationEnd; // Extend existing span
				} else {
					// source span contained in destination span
				}
			}

			if (destinationStart <= start && start <= destinationEnd) {
				if (end > destinationEnd) {
					destination[destinationStart] = end; // Extend existing span
				} else {
					// source span contained in destination span						
				}
			}				
		}
	*/
	// mergeToSelection(1, true, selection);
	// mergeToSelection(2, true, selection);
	// mergeToSelection(3, true, selection);
	// liquid.mergeToSelection(4, {allOther : true}, selection);
	// liquid.mergeToSelection(4, {allOther : true, Foobar: { spans: {1: 4, 10: 6}, history:true }}, selection);
	// liquid.mergeToSelection(4, {allOther : true, Foobar: { spans: {0: 'max'}}}, selection);
}

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addLiquidSelectionFunctionality = addLiquidSelectionFunctionality;
}