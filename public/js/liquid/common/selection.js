
var addLiquidSelectionFunctionality = function(liquid) {

	liquid.addToSelection = function(selection, object) {
		if (object !== null && typeof(selection[object._id]) === 'undefined' && liquid.allowRead(object)) {
			trace('selection', "Added: ", object);
			selection[object._id] = true;
			return true;
		} else {
			trace('selection', "Nothing to add!");
			// console.log("Nothing to add!");
			return false;
		}
	};
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addLiquidSelectionFunctionality = addLiquidSelectionFunctionality;
};