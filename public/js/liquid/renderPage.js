
console.group("=== Render page first time: ===");

var reactRootComponentInstance = ReactDOM.render(
	<LiquidApplication />,
	document.getElementById("ReactRootDiv")
);
console.log("=== Finish render page first time: ===");
console.groupEnd();

