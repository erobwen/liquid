
var addSubscription = function(page, object, selector) {
	respondToPossibleChange(
		function() {
			var result;
			liquid.page = page;
			result = x[selector](); 
			liquid.page = null;
			return result;
		},
		function(lastReturnValue, newReturnValue) {
			var selectionDifference = selectionDifference(newReturnValue, lastReturnValue);
			var serializedDifference = liquid.seriailzeSelection();
			var data = {newObjects: serializedDifference, initiatingChange: liquid.getPendingChanges(page)};
			page.socket.emitt('sendSubscriptionData', serializedDifference);
		}
	}
} 

x.addMethod('selectForEdit', function(selection) {
	this.y.selectForEdit(selection);	
});


// Generic
x.selectForEdit(selection) {
	if (typeof(selection) !== 'undefined') {
		// Create as little data as possible
		x.addToSelectionForEdit(selection);
	} else {
		// 
		var result = x.cachedCallWithDirtyVerification('getSelectionForEdit');
		//x.uncacheCallWithDirtyVerification(); // Necessary to reclaim memory.
		mergeFromTo(result, selection);
	}
}


// User defined
x.addToSelectionForEdit(selection) {
	this.y.selectForEdit(selection);
}


// Helper
x.getSelectionForEdit() {
	var selection = {};
	this.addSelectionForEdit(selection);
	return selection;
}