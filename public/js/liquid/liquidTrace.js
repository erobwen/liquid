/*------------------------------
 *           Tracing
 *-------------------------------*/
var constructTraceString = function(elements) {
    var traceString = "";
    traceString += nthCaller(3);
    elements.forEach(function(element) {
        if (isLiquidObject(element)) {
            traceString += element.__();
        } else {
            traceString += element;
        }
    });
    return traceString;
};

var trace = function() {
    liquid.pauseRecording(function() {
        console.log(constructTraceString(arguments));
    });
};

var traceGroup = function() {
    liquid.pauseRecording(function() {
        console.group(constructTraceString(arguments));
    });
};

var traceGroupEnd = function() {
    console.groupEnd();
};


if (typeof(module) !== 'undefined') {
    module.exports.trace = trace;
}

