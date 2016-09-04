// Data
console.log("");console.log("=== Data: ===");
console.log(data);

// Get serialized
console.log("");console.log("=== Serialized: ===");
console.log(data.subscriptionInfo.addedSerialized);

// Unserialize
console.log("");console.log("=== Unserialize: ===");
var start = new Date().getTime();
liquid.pulse('upstream', function() {
	console.log("serialize 0");
	unserializeFromUpstream(data.subscriptionInfo.addedSerialized);

	console.log("serialize 1");
});
var end = new Date().getTime();
var time = (end - start);
console.log("Time to unserialize: " + time + " milliseconds.");

console.log("");console.log("=== Page: ===");
// Setup global variables for page and session objects
liquid.instancePage = liquid.getUpstreamEntity(data.pageUpstreamId);
window.page = liquid.instancePage;
liquid.instancePage.setReceivedSubscriptions(liquid.instancePage.getOrderedSubscriptions());
console.log(liquid.instancePage);

console.log("");console.log("=== Unserialized: ===");
console.log(liquid.idObjectMap);


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
