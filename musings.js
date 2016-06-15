
var addSubscription = function(page, object) { //selector
	respondToPossibleChange(
		function() {
			liquid.page = page; // Selection influenced by page.getUser();
			var selection = {};
			page.getSelectors().forEach(function(selector) {
				object['select' + selector.getName()](selection); 
			});
			liquid.page = null;
			return selection;
		},
		function(lastReturnValue, newReturnValue) {
			var selectionDifference = selectionDifference(newReturnValue, lastReturnValue);
			var serializedDifference = liquid.seriailzeSelection(selectionDifference);
			// Filter out non vieweable objects
			var data = {newObjects: serializedDifference, initiatingChange: liquid.getPendingChanges(page)};
			page.socket.emitt('sendSubscriptionData', serializedDifference);
		}
	}
}

var dataStructure = {
	object: <page>,
	selector: 'forEdit'	
	parent: <selector>
}


liquid.allowRead(object, page);


In User:
object.addMethod('canRead', object, selector)
object.addMethod('canWrite', object, selector)

object.cachedCall('allowRead', user)

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



object.addSelector("forEdit", {Parent : 'forView', Owner: 'forView', SubCategory: 'forEdit', Reference: 'forView'});
object.addSelector("forView", {parentSelector: 'forEdit'}, {Parent : 'forView', Owner: 'forView', SubCategory: 'forEdit', Reference: 'forView'});


