// Reference service
var defined = function(something) {
	return typeof(something) !== 'undefined';
};

var alphabeticSorter = function(getterName) {
	return function(a, b) {
		var aProperty = a[getterName]();
		var bProperty = b[getterName]();
		
	    if(aProperty < bProperty) return -1;
		if(aProperty > bProperty) return 1;
		return 0;		
	}
};

registerClass({
	name: 'User', _extends: 'LiquidUser',
	
	addPropertiesAndRelations : function (object) {
		// Properties
		object.addProperty('name', '');
		object.addProperty('email', '');
				
		// Relations
		object.addRelation('AddedReference', 'toMany');
		object.addRelation('OwnedCategory', 'toMany');
	},
	
	addMethods : function (object) {
		object.addMethod('selectAllCategories', function(selection) {
			liquid.addToSelection(selection, this);
			this.getOwnedCategories().forEach(function(category) {
				liquid.addToSelection(selection, category);
			});
		});
		
		object.addMethod('getRootCategories', function() {
			var result = [];
			this.getOwnedCategories().forEach(function(category) {
				if (category.getParents().length === 0) {
					result.push(category);
				}
			});
			return result;
		})
	}
});	


registerClass({
	name: 'Category', _extends: 'Entity',
	
	addPropertiesAndRelations : function (object) {
		// Properties
		object.addProperty('name', '');
		object.addProperty('description', '');
			
		// Relations
		object.addRelation('SubCategory', 'toMany', {shape: 'acyclic'});
		object.addRelation('Reference', 'toMany');
		object.addReverseRelationTo('User_OwnedCategory', 'Owner', 'toOne');
		object.addReverseRelationTo('Category_SubCategory', 'Parent', 'toMany');
	},
	
	addMethods : function (object) {
		object.overrideMethod('init', function(parent, initialData) {
			parent(initialData);
			if (typeof(initialData.user) !== 'undefined') {
				this.setOwner(initialData.user);
			}
		});
		
		object.overrideMethod('__', function(parent) {
			// Old:
			// return "(" + this.className + "." + this._idString() + ":" + unloadedOrName + ")";

			// New: TODO: Create a without observation syntax?
			var unloadedOrName = this._propertyInstances['name'].data; //this.getName(); //+ liquid.onClient && !liquid. ?;
			return "(" + this.className + "." + this._idString() + ":" + unloadedOrName + ")";
		});

		object.overrideMethod('accessLevel', function(parent, page) {  // Return values, "noAccess", "readOnly", "readAndWrite".
			trace('security', "Considering security: ", page, " access level to ",  this);
			var pageUserIsOwner = this.getOwner() === page.getActiveUser();
			if (pageUserIsOwner)  {
				return "readAndWrite";
			} else {
				return startsWith("X", this.getName()) ? "noAccess" : "readOnly";
			}
		});

	}
});


registerClass({
	name: 'Reference', _extends: 'Entity',
	
	addPropertiesAndRelations : function (object) {
		// Properties
		object.addProperty('url', '');
		object.addProperty('pageExtractedTitle', '');
		object.addProperty('pageExtractedSummary', '');
		object.addProperty('pageExtractedImageUrl', '');
				
		// Relations
		object.addReverseRelationTo('Category_Reference', 'Category', 'toMany');
		object.addReverseRelationTo('User_AddedReference', 'Owner', 'toOne');
	},
	
	addMethods : function (object) {
		// console.log("Adding methods in Reference");
		object.overrideMethod('init', function(parent, initialData) {
			// console.log("=== Initialize in Reference ===");
			parent(initialData);
			if (defined(initialData.user)) {
				this.setOwner(initialData.user);
			}
			if (defined(initialData.categories)) {
				// console.log(this);
				this.setCategories(initialData.categories);
			}
			// console.log(initialData);
			// console.log(defined(initialData.category));
			if (defined(initialData.category)) {
				// console.log(this);
				this.setCategories([initialData.category]);
			}
		});
	}
});	


registerClass({
	name: 'Comment', _extends: 'Entity',
	
	addPropertiesAndRelations : function (object) {
		// Properties
		object.addProperty('url', '');
		
		// Relations
		object.addRelation('AddedBy', 'toMany');
	},
	
	addMethods : function (object) {}
});	

registerClass({
	name: 'Title', _extends: 'Comment',
	
	addPropertiesAndRelations : function (object) {
		// Properties
		object.addProperty('value', '');
	},
	
	addMethods : function (object) {}
});	

registerClass({
	name: 'PlainTextComment', _extends: 'Comment',
	
	addPropertiesAndRelations : function (object) {
		// Properties
		object.addProperty('text', '');
	},
	
	addMethods : function (object) {}
});	

registerClass({
	name: 'TitledPlainTextComment', _extends: 'Comment',
	
	addPropertiesAndRelations : function (object) {
		// Properties
		object.addProperty('text', '');
		object.addProperty('title', '');
	},
	
	addMethods : function (object) {}
});	
