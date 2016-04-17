

module.exports = {
	init : function (req, res) {
		liquidPageRequest(req, res, function(user, session, page) {
			console.log("init");
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
			politics.addSubCategory(georgism);
			
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
		
	view : function (req, res) {
		console.log("view");
		// console.log(sails);
		liquidPageRequest(req, res, function(user, session, page) {
			// console.log("Page id;");
			// console.log(page.id);
			
			var somePerson = liquid.findEntity({className: 'User', name: "Some Person"});
			console.log("Get name")
			console.log(somePerson.getName());
			console.log("Get owned categories")
			console.log(somePerson.getOwnedCategories());
			console.log("fin");
			var politics = liquid.findEntity({name: "Politics"});
			console.log("Politics parents:");
			console.log(politics.getParents());			
			
			var georgism = liquid.findEntity({name: "Georgism"});
			console.log("Georgism parents:");
			console.log(politics.getParents());
			
			var selection = {};
			somePerson.selectAllCategories(selection)
			console.log("Selection:");
			console.log(selection);
			var data = {
				hardToGuessPageId : page.id,
				serialized : liquid.serializeSelection(selection),
				user: somePerson.id,
				favourite : liquid.findEntity({className:'Category', name: 'Favourite'}).id,
				politics : liquid.findEntity({className:'Category', name: 'Politics'}).id
			}
			console.log("Serialized data:");
			console.log(data);
			res.render('layout',{
				data: JSON.stringify(data)
			});
			//var message = "<pre>Nothing to display yet</pre>";
			//res.send(message);
		});
	}	
};