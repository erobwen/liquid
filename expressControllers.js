var Fiber = require('fibers');

function createControllerFromClassName(className) {
	return createControllerFromFunction(function(req) {
		return liquid.createPage(className, req);
	});
}

function createControllerFromFunction(controllerFunction) {
	// console.log("createControllerFromFunction");
	return function(req, res) {
		// console.log("in controller created by func");
		Fiber(function() {
			liquid.pulse('httpRequest', function() {  // consider, remove fiber when not using rest api?    // change to httpRequest pulse  ?
				// console.log("in controller created by func");
				// Setup session object (that we know is the same object identity on each page request)
				var page = controllerFunction(req)
				// var selection = {};
				// page.selectAll(selection);
	
				var data = {
					// serialized : liquid.serializeSelection(selection),
					pageUpstreamId : page._id,
					subscriptionInfo : liquid.getSubscriptionUpdate(page)
				};
				res.render('layout',{
					data: JSON.stringify(data)
				});
			});
		}).run();
	}
}

function createControllers(liquidControllers) {
	var controllers = {};
	for (url in liquidControllers) {
		var controllerDefinition = liquidControllers[url];
		if (typeof(controllerDefinition) === 'string') {
			// console.log("Create controller: " + url + " -> " + controllerDefinition);
			controllers[url] = createControllerFromClassName(controllerDefinition);
		} else {
			// console.log("Create controller: " + url + " -> [function]");
			controllers[url] = createControllerFromFunction(controllerDefinition);
		}
	}
	// console.log(controllers);
	controllers['foo'] = function(req, res) {  res.send('made it'); };
	return controllers;
}




function createPage(pageClassName, req) {
	var session = liquid.createOrGetSessionObject(req);
	
	// Setup page object TODO: persistent page object?
	return create(pageClassName, { hardToGuessPageId: liquid.getPageId(), Session : session });
}



module.exports = createControllers(liquid.liquidControllers);
if (typeof(module.exports['index']) === 'undefined') {
	module.exports['index'] = createControllerFromClassName('LiquidPage');
}


// console.log("HERE!!!");
// console.log(liquidController);
// for (definitionName in liquid.liquidController) {
// 	// console.log(definitionName);
// 	var liquidControllerFunction = liquid.liquidController[definitionName];
// 	module.exports[definitionName] = function (req, res) {
// 		var result = liquidPageRequest(req, res, liquidControllerFunction);
// 		if (isString(result)) {
// 			res.send(result);
// 		} else if (result !== null) {
// 			res.render('layout', result);
// 		}
// 	}
// }


//http://krasimirtsonev.com/blog/article/deep-dive-into-client-side-routing-navigo-pushstate-hash

	// init : function (req, res) {
	// 	liquidPageRequest(req, res, function(user, session, page) {
	// 		console.log("Request page 'init'");
	// 		liquid.clearDatabase();
	//
	// 		// User
	// 		var user = createPersistent('User', {name: "Some Person", email: "some.person@gmail.com" });
	//
	//
	// 		// Create categories
	// 		var favourite = createPersistent('Category', {name: 'Favourite', description: '', user: user});
	//
	// 		var funny = createPersistent('Category', {name: 'Funny', description: '', user: user});
	//
	// 		var politics = createPersistent('Category', {name: 'Politics', description: '', user: user});
    //
	// 		var georgism = createPersistent('Category', {name: 'Georgism', description: '', user: user});
	// 		politics.addSubCategory(georgism);
	//
	// 		var myPolitics = createPersistent('Category', {name: 'MyPoliticalCommitments', description: '', user: user});
	// 		politics.addSubCategory(myPolitics);
	//
	// 		var directDemocracy = createPersistent('Category', {name: 'Direct Democracy', description: '', user: user});
	// 		politics.addSubCategory(directDemocracy);
	//
	// 		var liquidDemocracy = createPersistent('Category', {name: 'Liquid Democracy', description: '', user: user});
	// 		directDemocracy.addSubCategory(liquidDemocracy);
	//
	// 		var direktdemokraterna = createPersistent('Category', {name: 'Direktdemokraterna', description: '', user: user});
	// 		liquidDemocracy.addSubCategory(direktdemokraterna);
	// 		myPolitics.addSubCategory(direktdemokraterna);
	//
	// 		// Create References
	// 		var created = 0;
	// 		while (created++ < 3) {
	// 			var reference1 = createPersistent('Reference', {url : 'http://foo.com/' + created, user: user, category:georgism});
	// 		}
	// 		// created = 0;
	// 		// while (created++ < 10) {
	// 			// var reference2 = createPersistent('Reference', {url : 'http://fie.com/' + created, user: user, categories:[georgism, liquidDemocracy]});
	// 		// }
	// 		// created = 0;
	// 		// while (created++ < 10) {
	// 			// var reference3 = createPersistent('Reference', {url : 'http://fum.com/' + created, user: user, category: direktdemokraterna});
	// 		// }
	// 		// created = 0;
	// 		// while (created++ < 10) {
	// 			// var reference4 = createPersistent('Reference', {url : 'http://foobarkazong.com/'  + created, user: user, category: direktdemokraterna});
	// 		// }
	// 		res.send("Finished");
	// 		// console.log("====================");
	// 	});
	// },


	// test : function (req, res) {
	// 	console.log("Request page 'test'");
	// 	// console.log(sails);
	// 	liquidPageRequest(req, res, function(user, session, page) {
	// 		// console.log("Page id;");
	// 		// console.log(page._id);
	//
	// 		var politics = liquid.findEntity({className: 'Category', name: "Politics"});
	// 		console.log(politics.getSubCategories());
	// 		res.send("Test finished");
	// 	});
	// },


	// view : function (req, res) {
	// 	console.log("Request page 'view'");
	// 	// console.log(sails);
	// 	liquidPageRequest(req, res, function(user, session, page) {
    //
	// 		// console.log("Page id;");
	// 		// console.log(page._id);
	//
	// 		var somePerson = liquid.findPersistentEntity({className: 'User'});
	// 		// console.log("Get name")
	// 		// console.log(somePerson.getName());
	// 		// console.log("Get owned categories")
	// 		// console.log(somePerson.getOwnedCategories());
	// 		// console.log("fin");
	// 		// var politics = liquid.findEntity({name: "Politics"});
	// 		// console.log("Politics parents:");
	// 		// console.log(politics.getParents());
	//
	// 		// var georgism = liquid.findEntity({name: "Georgism"});
	// 		// console.log("Georgism parents:");
	// 		// console.log(politics.getParents());
	//
	// 		var selection = {};
	// 		somePerson.selectAllCategories(selection)
	// 		// console.log("Selection:");
	// 		// console.log(selection);
    //
	// 		// Subscribe to these objects.
	// 		console.log("Selection");
	// 		printSelection(selection);
	// 		console.log("idObjectMap:")
	// 		printIdMap(liquid.idObjectMap);
	// 		console.log("persistentIdObjectMap:")
	// 		printIdMap(liquid.persistentIdObjectMap);
	// 		function printSelection(selection) {
	// 			for (id in selection) {
	// 				console.log(id + " : " + liquid.getEntity(id).__());
	// 			}
	// 		}
	// 		function printIdMap(map) {
	// 			for(id in map) {
	// 				object = map[id];
	// 				console.log(id + " : " + object.__());
	// 			}
	// 		}
	//
	// 		for (id in selection) {
	// 			var object = liquid.getEntity(id);
	// 			object._observingPages[liquid.requestingPage._id] = liquid.requestingPage;
	// 		}
	//
	// 		selection[page._id] = true;
	// 		selection[session._id] = true;
    //
	// 		var data = {
	// 			hardToGuessPageId : page.getHardToGuessPageId(),
	// 			serialized : liquid.serializeSelection(selection),
	// 			user: somePerson._id,
	// 			session: session._id,
	// 			page: page._id,
	// 			// favourite : liquid.findEntity({className:'Category', name: 'Favourite'})._id,
	// 			// politics : liquid.findEntity({className:'Category', name: 'Politics'})._id
	// 		};
	// 		// console.log("Serialized data:");
	// 		// console.log(data);
	// 		res.render('layout',{
	// 			data: JSON.stringify(data)
	// 		});
	// 		//var message = "<pre>Nothing to display yet</pre>";
	// 		//res.send(message);
	// 	});
	// }
