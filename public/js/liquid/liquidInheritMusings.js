


// function Entity(id, className) {
// 	this.id = id;
// 	this.className = className;
// }
//
// Entity.prototype = liquidPrototype({
//
//
//
// User.prototype = liquidPrototype({
// 	_extends: Entity,
//
// 	properties: {
// 		'name' : {defaultValue: '', readOnly: ['otherUser'], readAndWrite: ['userSelf']},
// 		'email' : {defaultValue: '', readOnly: ['otherUser'], readAndWrite: ['userSelf']},
// 		'encryptedPassword': {defaultValue: '', readOnly: [], readAndWrite: []}
// 	},
//
// 	relations: {
// 		'AddedReference': {cardinality: 'toMany', order: alphabeticSorter('getUrl'), readOnly: ['otherUser'], readAndWrite:['userSelf'], restriction:'Reference', shape:'Non Recursive'},
// 		'OwnedCategory': {cardinality: 'toMany', order: alphabeticSorter('getName'), readOnly:['otherUser'], readAndWrite:['userSelf'], restriction:'Category', shape:'Non Recursive'} // Tree, Acyclic, Graph
// 	},
//
// 	methods: {
// 		'init' : {
// 			action: function(initData){
// 				for(var property in initData) {
// 					setterName = 'set' + capitaliseFirstLetter(property);
// 					if (typeof(this[setterName]) !== 'undefined') {
// 						console.log("setting using standard constructor");
// 						this[setterName](initData[property]);
// 					}
// 				}
// 			},
// 			permittedRoles: ['userSelf'],
// 			addRoles: ['administrator']
// 		},
//
// 		''
// 	}
// });