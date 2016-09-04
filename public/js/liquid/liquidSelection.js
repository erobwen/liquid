
var addLiquidSelectionFunctionality = function(liquid) {

	liquid.addToSelection = function(selection, object) {
		selection[object._id] = true;
	};
}

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
	module.exports.addLiquidSelectionFunctionality = addLiquidSelectionFunctionality;
}