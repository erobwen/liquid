/*------------------------------
 *           Tracing
 *-------------------------------*/

var traceTags = {
    'setup' : true,
    'member' : true,
    'incoming' : true,
    'property' : true,
    'create' : true

    // 'database' : true,
    // 'pushDownstream' : true,
    // 'pushUpstream' : true,
};



var groupNesting = 0;
var surpressChildTraces = false;
var hiddenGroupAtNesting = null;

var nthCaller = function() {
    var e = new Error('dummy');
    var stack = e.stack
        // .replace(/^[^\(]+?[\n$]/gm, '')
        // .replace(/^\s+at\s+/gm, '')
        // .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
        .split('\n');
    return stack[6].substr(7).trim();
};

var shouldTrace = function(tag) {
    if (isArray(tag)) {
        var result = false;
        tag.forEach(function(taglet) {
           if (traceTags[taglet] === true) {
               result = true;
           }
        });
        return result;
    } else {
        return traceTags[tag] === true
    }
};

var constructTraceString = function(elements) {
    var traceString = "";

    // Group caller
    var caller = nthCaller();
    caller = caller
        .replace("(anonymous function)", "(anonymous_function)")
        .replace("[as ", "[as_")
        .split(" ");

    // Extract function name & code file:
    var functionName = null;
    var codeShort = null;
    var codeLong = null;
    if (caller.length === 3) {
        functionName = "'" + caller[1].substr(4).slice(0, -1) + "'";
        codeLong = caller[2];
    } else if (caller.length === 2) {
        functionName = caller[0].split('.').pop();
        codeLong = caller[1];
    } else {
        functionName = null;
        codeLong = null;
    }
    codeShort = (codeLong != null) ? "(" + codeLong.split("\\").pop() : null;
    // console.log(functionName);
    // console.log(codeLong);
    // console.log(codeShort);

    traceString += codeShort + " " + functionName + ":  ";
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
    if (!surpressChildTraces) {
        var argumentsArray = argumentsToArray(arguments);
        var tag = argumentsArray.shift();
        if (shouldTrace(tag)) {
            liquid.pauseRecording(function() {
                console.log(constructTraceString(argumentsArray));
            });
        }
    }
};

var traceGroup = function() {
    groupNesting++;
    if (!surpressChildTraces) {
        var argumentsArray = argumentsToArray(arguments);
        var tag = argumentsArray.shift();
        if (shouldTrace(tag)) {
            liquid.pauseRecording(function() {
                console.group(constructTraceString(argumentsArray));
            });
        } else {
            surpressChildTraces = true;
            hiddenGroupAtNesting = groupNesting;
        }
    }
};

var traceGroupEnd = function() {
    groupNesting--;
    if (surpressChildTraces && groupNesting < hiddenGroupAtNesting) {
        surpressChildTraces = false;
    }
    console.groupEnd();
};


if (typeof(module) !== 'undefined') {
    module.exports.trace = trace;
}

