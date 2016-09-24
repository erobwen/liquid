// Data
// console.log("");console.log("=== Data: ===");
// console.log(data);
trace('setup', "=== Data: ===");
console.log(data);

// Get serialized
trace('setup', "=== Serialized: ===");
console.log(data.subscriptionInfo.addedSerialized);

// Unserialize
traceGroup('setup', "=== Unserialize: ===");
var start = new Date().getTime();
liquid.pulse('upstream', function() {
	// console.log("serialize 0");
	unserializeFromUpstream(data.subscriptionInfo.addedSerialized);

	// console.log("serialize 1");
});
traceGroupEnd();
var end = new Date().getTime();
var time = (end - start);
// console.log("Time to unserialize: " + time + " milliseconds.");

traceGroup('setup', "=== Page: ===");
// Setup global variables for page and session objects
liquid.instancePage = liquid.getUpstreamEntity(data.pageUpstreamId);
window.page = liquid.instancePage;
liquid.instancePage.setReceivedSubscriptions(liquid.instancePage.getOrderedSubscriptions());
trace('setup', liquid.instancePage);
traceGroupEnd();

trace('setup', "=== Unserialized: ===");
console.log(liquid.idObjectMap);


// Setup global variables for each local entity
trace('setup', "=== Settup global variables: ===");

for (id in liquid.idObjectMap) {
	var object = liquid.idObjectMap[id];
	if (typeof(object.getName) !== 'undefined') {
		var name = object.getName();
		if (typeof(name) !== 'undefined') {
			var variableName = nameToVariable(name);
			window[variableName] = object;
			trace('setup', "window." + variableName + " = " + object.__());
		} else {
			// console.log("Got an undefined name for object: " + object.__());
		}
	}
}
// window.georgism = localFind({name: 'Georgism'});
// window.politics = localFind({name: 'Politics'});
