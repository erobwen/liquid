
traceGroup('setup', "=== Render page first time: ===");

var reactRootComponentInstance = ReactDOM.render(
	<LiquidApplication />,
	document.getElementById("ReactRootDiv")
);
traceGroupEnd();

