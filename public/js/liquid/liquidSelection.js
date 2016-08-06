
var addLiquidSelectionFunctionality = function(liquid) {

	liquid.mergeToSelection = function(id, objectSelection, destination) {
		destination[id] = true;
	};
}

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addLiquidSelectionFunctionality = addLiquidSelectionFunctionality;
}