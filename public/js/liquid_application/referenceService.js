console.log("Reference service!");

// Reference service
var defined = function(something) {
	return typeof(something) !== 'undefined';
}

var alphabeticSorter = function(getterName) {
	return function(a, b) {
		var aProperty = a[getterName]();
		var bProperty = b[getterName]();
		
	    if(aProperty < bProperty) return -1;
		if(aProperty > bProperty) return 1;
		return 0;		
	}
}

registerClass({
	name: 'User', _extends: 'LiquidUser',
	
	addPropertiesAndRelations : function (object) {
		// Properties
		object.addProperty('name', '');
		object.addProperty('email', '');
				
		// Relations
		object.addRelation('AddedReference', 'toMany'); // Dependent
		object.addRelation('OwnedCategory', 'toMany'); // Dependent
	},
	
	addMethods : function (object) {
		object.addMethod('selectAllCategories', function(selection) {
			liquid.mergeToSelection(this.id, true, selection);
			// console.log(this.getOwnedCategories());
			this.getOwnedCategories().forEach(function(category) {
				// console.log("Selecting");
				// liquid.mergeToSelection(category.id, true, selection);
				liquid.mergeToSelection(category.id, true, selection);
				// console.log(selection);
			});
		});
		
		object.addMethod('getRootCategories', function() {
			// console.log("In repeater code!");
			var result = [];
			this.getOwnedCategories().forEach(function(category) {
				if (category.getParents().length === 0) {
					result.push(category);
				}
			})
			// console.log("Result in repeater code");
			// console.log(result);
			return result;
		})
	},
	
	addRoles : function() {
		object.addRole('default', 
			{
				notAccessableOnClient: ['encryptedPassword'],
				notWriteableOnClient:  ['isAdmin', 'userName', 'fullName', 'email', 'AddedReference', 'OwnedCategory'],
				notExecutableOnClient: []
			}
		);
		object.addRole('userSelf', 
			{
				notAccessableOnClient: ['encryptedPassword'],
				notWriteableOnClient:  ['isAdmin', 'userName', 'email', 'AddedReference', 'OwnedCategory'],
				notExecutableOnClient: ['setAndVerifyUserName', 'setAndVerifyEmail']
			}
		);
		// object.addRole('administrator',    // Implicit!
			// {
				// notAccessableOnClient: [],
				// notWriteableOnClient:  [],
				// notExecutableOnClient: []
			// }
		// );
		// redefineRole() for sub classes!
	}
});	


registerClass({
	name: 'Category', _extends: 'Entity',
	
	addPropertiesAndRelations : function (object) {
		// Properties
		object.addProperty('name', '');
		object.addProperty('description', '');
			
		// Relations
		object.addRelation('SubCategory', 'toMany');
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
		
		object.overrideMethod('getObjectSignum', function(parent) {
			var unloadedOrName = this.noDataLoaded ? "[no data]" : this.getName();
			return "(" + this.className + "." + this.id + ":" + unloadedOrName + ")";
		});
		
		object.addMethod("isParentOf", function(category) {
			var result = false;
			category.getParents().forEach(function(parentCategory) {
				if (parentCategory === this) {
					result = true;
				}
			}); 
			return result;
		});
		
		object.addMethod("canAddAsSubCategory", function(category) {
			// console.log("canAddAsSubCategory: " + this._);
			var allTransitiveParents = this.getAllTransitiveParents();
			allTransitiveParents[this.id] = this; // Add this self
			
			var allTransitiveSubCategories = category.getAllTransitiveSubCategories();
			allTransitiveSubCategories[category.id] = category; // Add category
			
			// console.log(allTransitiveParents);
			// console.log(allTransitiveSubCategories);
			for (parentId in allTransitiveParents) {
				if (typeof(allTransitiveSubCategories[parentId]) !== 'undefined') {
					return false;
				}
			}
			// console.log("No cycle will be created");
			var isAlreadySubCategory = false;
			// console.log(this.getSubCategories());
			this.getSubCategories().forEach(function(subCategory) {
				// console.log("Comparing");
				// console.log(subCategory.id);
				// console.log(category.id);
				
				if (subCategory === category) {
					// console.log("Aha!");
					isAlreadySubCategory = true;
				}
			});
			// console.log("Already a direct sub category: " + isAlreadySubCategory);
			return !isAlreadySubCategory;
		});
		
		object.addMethod("getAllTransitiveSubCategories", function() {
			var categories = {};
			this.addAllTransitiveSubCategories(categories);
			return categories;
		});
		
		object.addMethod("addAllTransitiveSubCategories", function(categories) {
			if (typeof(categories[this.id]) === 'undefined') {
				this.getSubCategories().forEach(function(subCategory) {
					subCategory.addAllTransitiveSubCategories(categories);
					categories[subCategory.id] = subCategory;
				});
			}
		});
		
		object.addMethod("getAllTransitiveParents", function() {
			// console.log("getAllTransitiveParents: " + this._);
			var categories = {};
			this.addAllTransitiveParents(categories);
			return categories;
		});
		
		object.addMethod("addAllTransitiveParents", function(categories) {
			// console.log("addAllTransitiveParents:" + this._);
			if (typeof(categories[this.id]) === 'undefined') {
				this.getParents().forEach(function(parentCategory) {
					parentCategory.addAllTransitiveParents(categories);
					categories[parentCategory.id] = parentCategory;
				});
			} else {
				// console.log("Added already");
			}
		});
		
		object.addMethod("isParentOrGrandParentOf", function(category) {
			var result = false;
			category.getParents().forEach(function(directParent) {
				if (directParent === this || this.isParentOrGrandParentOf(directParent)) {
					result = true;
				}
			});
			return result;
		});
		
		object.addMethod("isChildOrGrandChildOf", function(category) {
			var result = false;
			category.getSubCategories().forEach(function(directChild) {
				if (directChild === this || this.isChildOrGrandChildOf(directChild)) {
					result = true;
				}
			});
			return result;
		});
	},
	
	addRoles : function() {
		object.addRole('default', 
			{
				notAccessableOnClient: [],
				notWriteableOnClient:  ['name', 'description', 'SubCategory', 'Reference', 'Owner', 'Parent'],
				notExecutableOnClient: []
			}
		);
		object.addRole('owner', 
			{
				notAccessableOnClient: [],
				notWriteableOnClient:  ['Owner'],
				notExecutableOnClient: []
			}
		);
		// redefineRole() for sub classes!
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
		object.addReverseRelationTo('User_AddedReference', 'AddedBy', 'toOne');
	},
	
	addMethods : function (object) {
		// console.log("Adding methods in Reference");
		object.overrideMethod('init', function(parent, initialData) {
			console.log("=== Initialize in Reference ===");
			parent(initialData);
			if (defined(initialData.user)) {
				this.setAddedBy(initialData.user);
			}
			if (defined(initialData.categories)) {
				console.log(this);
				this.setCategories(initialData.categories);
			}
			console.log(initialData);
			console.log(defined(initialData.category));
			if (defined(initialData.category)) {
				console.log(this);
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
