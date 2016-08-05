var liquidController = require('./liquidController.js');

module.exports = {
	init : function (req, res) {
		liquidPageRequest(req, res, function(user, session, page) {
			console.log("Request page 'init'");
			liquid.clearDatabase();
		
			// User
			var user = createEntity('User', {name: "Some Person", email: "some.person@gmail.com" });
			
			
			// Create categories
			var favourite = createEntity('Category', {name: 'Favourite', description: '', user: user});
			
			var funny = createEntity('Category', {name: 'Funny', description: '', user: user});		
			
			var politics = createEntity('Category', {name: 'Politics', description: '', user: user});

			var georgism = createEntity('Category', {name: 'Georgism', description: '', user: user});
			politics.addSubCategory(georgism);
			
			var myPolitics = createEntity('Category', {name: 'MyPoliticalCommitments', description: '', user: user});
			politics.addSubCategory(myPolitics);
			
			var directDemocracy = createEntity('Category', {name: 'Direct Democracy', description: '', user: user});
			politics.addSubCategory(directDemocracy);
			
			var liquidDemocracy = createEntity('Category', {name: 'Liquid Democracy', description: '', user: user});
			directDemocracy.addSubCategory(liquidDemocracy);
			
			var direktdemokraterna = createEntity('Category', {name: 'Direktdemokraterna', description: '', user: user});
			liquidDemocracy.addSubCategory(direktdemokraterna);
			myPolitics.addSubCategory(direktdemokraterna);
			
			// Create References
			var created = 0;
			while (created++ < 3) {
				var reference1 = createEntity('Reference', {url : 'http://foo.com/' + created, user: user, category:georgism});
			}
			// created = 0;
			// while (created++ < 10) {
				// var reference2 = createEntity('Reference', {url : 'http://fie.com/' + created, user: user, categories:[georgism, liquidDemocracy]});
			// }
			// created = 0;
			// while (created++ < 10) {
				// var reference3 = createEntity('Reference', {url : 'http://fum.com/' + created, user: user, category: direktdemokraterna});
			// }
			// created = 0;
			// while (created++ < 10) {
				// var reference4 = createEntity('Reference', {url : 'http://foobarkazong.com/'  + created, user: user, category: direktdemokraterna});
			// }
			res.send("Finished");
			// console.log("====================");
		});
	},
	
	test : function (req, res) {
		console.log("Request page 'test'");
		// console.log(sails);
		liquidPageRequest(req, res, function(user, session, page) {
			// console.log("Page id;");
			// console.log(page.id);
			
			var politics = liquid.findEntity({className: 'Category', name: "Politics"});
			console.log(politics.getSubCategories());
			res.send("Test finished");
		});
	},	
	view : function (req, res) {
		console.log("Request page 'view'");
		// console.log(sails);
		liquidPageRequest(req, res, function(user, session, page) {
			// console.log("Page id;");
			// console.log(page.id);
			
			var somePerson = liquid.findEntity({className: 'User'});
			// console.log("Get name")
			// console.log(somePerson.getName());
			// console.log("Get owned categories")
			// console.log(somePerson.getOwnedCategories());
			// console.log("fin");
			// var politics = liquid.findEntity({name: "Politics"});
			// console.log("Politics parents:");
			// console.log(politics.getParents());			
			
			// var georgism = liquid.findEntity({name: "Georgism"});
			// console.log("Georgism parents:");
			// console.log(politics.getParents());
			
			var selection = {};
			somePerson.selectAllCategories(selection)
			// console.log("Selection:");
			// console.log(selection);

			// Subscribe to these objects. 
			for (id in selection) {
				var object = liquid.getEntity(id);
				object._observingPages[liquid.requestingPage.id] = liquid.requestingPage;
			}

			var data = {
				hardToGuessPageId : page.id,
				serialized : liquid.serializeSelection(selection),
				user: somePerson.id,
				// favourite : liquid.findEntity({className:'Category', name: 'Favourite'}).id,
				// politics : liquid.findEntity({className:'Category', name: 'Politics'}).id
			}
			// console.log("Serialized data:");
			// console.log(data);
			res.render('layout',{
				data: JSON.stringify(data)
			});
			//var message = "<pre>Nothing to display yet</pre>";
			//res.send(message);
		});
	}	
};

console.log("HERE!!!");
console.log(liquidController);
for (definitionName in liquidController) {
	console.log(definitionName);
	var liquidControllerFunction = liquidController[definitionName];
	module.exports[definitionName] = function (req, res) {
		var result = liquidPageRequest(req, res, liquidControllerFunction);
		if (isString(result)) {
			res.send(result);
		} else if (result !== null) {
			res.render('layout', result);
		}
	}
}
