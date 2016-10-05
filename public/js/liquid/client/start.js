/**
 * General setup
 */

var liquid = {
	onServer : false,
	onClient: true
};

addCommonLiquidFunctionality(liquid);
addLiquidShapeFunctionality(liquid);
addLiquidObjectMemberFunctionality(liquid);
addLiquidEntity(liquid);
addUserPageAndSessions(liquid)
addLiquidSelectionFunctionality(liquid);
addLiquidRepetitionFunctionality(liquid);
addLiquidSerializeAndServerCallFunctionality(liquid);

console.log("");console.log("=== Liquid Object: ===");
console.log(liquid);


/**--------------------------------------------------------------
 * Some public interface
 *----------------------------------------------------------------*/


window.find = liquid.find;

window.uponChangeDo = liquid.uponChangeDo;
window.repeatOnChange = liquid.repeatOnChange;

window.create = liquid.create;

window.getEntity = liquid.getEntity;
window.getUpstreamEntity = liquid.getUpstreamEntity;
window.getPersistentEntity = liquid.getPersistentEntity;
window.getGlobalEntity = liquid.getGlobalEntity;

window.registerClass = liquid.registerClass;

window.liquid = liquid;
