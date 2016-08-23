// Get serialized
var serialized = data.serialized;
delete data.serialized;
console.log("");console.log("=== Serialized: ===");
console.log(serialized);

// Get page id
liquid.hardToGuessPageId = data.hardToGuessPageId;
delete data.hardToGuessPageId;
console.log("");console.log("=== Hard to guess page id: ===");
console.log(liquid.hardToGuessPageId);

// Unserialize
console.log("");console.log("=== Unserialize: ===");
var start = new Date().getTime();
unserializeFromUpstream(serialized);
var end = new Date().getTime();
var time = (end - start);
console.log("Time to unserialize: " + time + " milliseconds.");

// Get data entities
console.log("");console.log("=== Get data entities: ===");
for(objectName in data) {
	data[objectName] = getUpstreamEntity(data[objectName]);
}
console.log("Data:");
console.log(data);

// Setup global variables for each local entity
console.log("");console.log("=== Settup global variables: ===");
for (id in liquid.idObjectMap) {
	var object = liquid.idObjectMap[id];
	if (typeof(object.getName) !== 'undefined') {
		var name = object.getName();
		if (typeof(name) !== 'undefined') {
			var variableName = nameToVariable(name);
			window[variableName] = object;
			console.log("window." + variableName + " = " + object.__());
		} else {
			// console.log("Got an undefined name for object: " + object.__());
		}
	}
}
// window.georgism = localFind({name: 'Georgism'});
// window.politics = localFind({name: 'Politics'});

// Setup global variables for page and session objects
window.session = data.session;
window.page = data.page;
