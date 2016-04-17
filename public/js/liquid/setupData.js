var serialized = data.serialized;
delete data.serialized;
console.log("Serialized:");
console.log(serialized);
var hardToGuessPageId = data.hardToGuessPageId;

var start = new Date().getTime();
var unserialized = unserialize(serialized);
var end = new Date().getTime();
var time = (end - start);
console.log("Time to unserialize: " + time + " milliseconds.");
// console.log(liquid.idObjectMap);

for(objectName in data) {
	data[objectName] = getEntity(data[objectName]);
}
data.hardToGuessPageId = hardToGuessPageId;
liquid.hardToGuessPageId = hardToGuessPageId;
console.log("Data:");
console.log(data);
for (id in liquid.idObjectMap) {
	var object = liquid.idObjectMap[id];
	if (typeof(object.getName) !== 'undefined') {
		window[nameToVariable(object.getName())] = object;
	}
}
// window.georgism = find({name: 'Georgism'});
// window.politics = find({name: 'Politics'});
