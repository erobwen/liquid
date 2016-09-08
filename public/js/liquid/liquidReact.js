// http://unitstep.net/blog/2015/03/03/using-react-animations-to-transition-between-ui-states/

var reactRootComponentInstance = null;


/*--------------------------------------*
*              Focus    
*---------------------------------------*/
//https://www.kirupa.com/html5/event_capturing_bubbling_javascript.htm
var reactFocusedComponent = null;
var lastEvent = null;
var dropFocus = function(event) {
	// console.log("shouldDropFocus?");
	// console.log(event);
	if (event.bubbles) { // Only capture event in bubble phase
		// console.log("dropFocus");
		if (reactFocusedComponent !== null && reactFocusedComponent._mounted) {
			// debugger;
			reactFocusedComponent.setState({focused:false}); 
		}
	}
	// lastEvent = event;
}


var focusComponent = function(component) {
	if (reactFocusedComponent !== null && reactFocusedComponent._mounted) {
		// debugger;
		reactFocusedComponent.setState({focused:false}); 
	}
	component.setState({focused: true});
	reactFocusedComponent = component;
}

/*--------------------------------------*
*            Components
*---------------------------------------*/

var componentsNeedOfForceUpdate = [];
liquid.addNoMoreDirtyRepeaterCallback(function() {
	console.group("=== Updating user interface ===");
	// stackDump();
	console.log("Starting UI update with " + componentsNeedOfForceUpdate.length + " required updates");
	componentsNeedOfForceUpdate.forEach(function(component) {
		// console.log("Force update!");
		if (component._mounted) {
			// console.log("Actual force update!");
			component.forceUpdate();
		}
	});
	console.log("=== Finished updating user interface ===");
	console.groupEnd();
	componentsNeedOfForceUpdate.length = 0;
});


var shallowCompareSetsEqualX = function(first, second) {
	// console.log(Object.keys(first).length !== Object.keys(second).length);
	// console.log(first);
	// console.log(second);
	if (typeof(first) === 'undefined') {
		return typeof(second) === 'undefined';
	}
	if (first === null) {
		return second === null;
	}
	if (Object.keys(first).length !== Object.keys(second).length) {
		return false;
	}
	for (var key in first) {
		// console.log("Comparing key " + key);
		if (first[key] !== second[key]) {
			// console.log("Key was not equal");
			return false;
		}
	}
	return true;
}

var shallowCompareEqual = function(component, nextProps, nextState) {
	// console.log("Properties");
	// console.log(nextProps);
	// console.log(component.props);

	// console.log("State");
	// console.log(nextState);
	// console.log(component.state);
	
	var first = shallowCompareSetsEqualX(component.props, nextProps);
	var second = shallowCompareSetsEqualX(component.state, nextState);
	// console.log(first);
	// console.log(second);
	return first && second;
		
}

var liquidClassData = function(classData) {
	classData.dataChanged = false;
	classData.childDataChanged = false;
	
	classData.shouldComponentUpdate = function(nextProps, nextState) { // TODO: What about this here?
		// console.group("shouldComponentUpdate");// console.log(">>>>> Inside shouldComponentUpdate <<<<<");
		// return true;
		var result = !shallowCompareEqual(this, nextProps, nextState);
		// console.log(result);
		// console.groupEnd();
		return result; // TODO: Compare that compares arrays with liquid objects. Maybe it works now because a new return value is created on change. 
	};
	
	var applicationComponentDidMount = classData.componentDidMount;
	classData.componentDidMount = function() {
		this._mounted = true;
		if (typeof(applicationComponentDidMount) === 'function') {
			applicationComponentDidMount.bind(this)();
		}
	}
	
	var applicationComponentWillUnmount = classData.componentWillUnmount;
	classData.componentWillUnmount = function() {
		this._mounted = false;
		if (typeof(this.repeater) !== 'undefined') {
			liquid.removeRepeater(this.repeater);
		}
		if (typeof(applicationComponentWillUnmount) === 'function') {
			applicationComponentWillUnmount.bind(this)();
		}
	}
	
	return classData;
}


var invalidateUponLiquidChange = function(className, component, renderFunction) {
	console.group("***" + className + ".render: ***");
	// stackDump();
	console.log(componentsNeedOfForceUpdate);
	component._ = "<" + className + " />";
	return uponChangeDo("Component:" + className,
	function() {
		// console.log("Actually rendering!");
		var element = renderFunction();
		console.groupEnd();
		return element;
	},
	function() {
		console.log("Component:" + className + " in need of update");
		componentsNeedOfForceUpdate.push(component);
	});
	// return repeater.returnValue; //getReturnValueWithoutObservation(); // To not bind the surrounding repeater to this one.
}
