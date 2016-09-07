
var addLiquidSelectionFunctionality = function(liquid) {

	liquid.addToSelection = function(selection, object) {
		if (object !== null) {
			console.log("Added: " + object._);
			selection[object._id] = true;
		} else {
			console.log("Nothing to add!");
		}
	};
}

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addLiquidSelectionFunctionality = addLiquidSelectionFunctionality;
}