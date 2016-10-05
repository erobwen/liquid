/*------------------------------
 *           Tracing
 *-------------------------------*/

var col1Width = 35;
var col2Width = 50;
var col3Width = 40;

var col1Left = 0;
var col2Left = col1Width;
var col3Left = col1Width + col2Width;

// (common/core.js:573:3)             create:       (className: Category)

traceTags = {
    'setup' : true,
    'member' : true,
    'incoming' : true,
    'property' : true,
    'create' : true,
    'pulse' : true,
    'subscribe' : true,
    // 'repetition' : true,
    'unserialize' : true,
    'serialize' : true,
    'selection' : true,
    // 'security' : true,
    'react' : true

    // 'database' : true,
    // 'pushDownstream' : true,
    // 'pushUpstream' : true,
};



function nTimes(count, string) {
    var result = "";
    while (count-- > 0) result += string;
    return result;
}


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

Function.prototype.getName = function()
{
    if(this.name)
        return this.name;
    var definition = this.toString().split("\n")[0];
    return definition;
    // var exp = /^function ([^\s(]+).+/|);
    // if(exp.test(definition))
    //     return definition.split("\n")[0].replace(exp, "$1") || "anonymous";
    // return "anonymous";
};

Function.prototype.signature = function()
{
    var signature = {
        name: this.getName(),
        params: [],
        toString: function()
        {
            var params = this.params.length > 0 ?
            "'" + this.params.join("', '") + "'" : "";
            return this.name + "(" + params + ")"
        }
    };
    if(this.arguments)
    {
        for(var x=0; x<this .arguments.length; x++)
            signature.params.push(this.arguments[x]);
    }
    return signature;
}

var constructTraceString = function(elements) {
    // console.log("========");
    var traceString = "";

    // Deep stack analysis:
    var limit = 50;

    function fillTo(string, target) {
        if (string !== null) {
            var safetyPadding = 0;
            // var safetyPadding = 3;
            var remaining = target - string.length;
            if (remaining < safetyPadding) {
                remaining = safetyPadding;
            }
            return string + nTimes(remaining, " ");
        } else {
            return nTimes(target, " ");
        }
    }

    // http://stackoverflow.com/questions/15582309/traversing-arguments-callee-caller-causes-an-infinite-loop

    function stackDepthString(functionName) {
        var current = arguments.callee.caller;
        var depth = 0;
        var visitedSet = [];
        while(current !== null && !inArray(current, visitedSet)) {
            visitedSet.push(current);
            depth += 1;
            current = current.caller;
        }
        var relevantDepth = depth - 5;

        var result = "";
        if (inArray(current, visitedSet)) {
            result += "~";  // Nesting level not accurate!
            return nTimes(col2Width - 2 - functionName.length - 1," ") + "~";
        } else {
            // result += "(" + relevantDepth + ")";
            result += nTimes(relevantDepth, " ");
            return result;
        }
        // console.log(arguments.callee); // stacktrace
        // console.log(arguments.callee.name); // "stacktrace"
        // console.log(arguments.callee.caller); // function
        // console.log(arguments.callee.caller.name); // function
    }

    // Analyze stack
    var e = new Error('dummy');
    var stack = e.stack
        // .replace(/^[^\(]+?[\n$]/gm, '')
        // .replace(/^\s+at\s+/gm, '')
        // .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
        .split('\n');

    stack.shift();
    stack.shift();
    stack.shift();
    stack.shift();
    stack.shift();
    // console.log(stack);

    // Group caller
    var caller = stack[0].substr(7).trim()
        .replace("(anonymous function)", "(anonymous_function)")
        .replace("[as ", "[as_")
        .split(" ");

    // Extract function name & code file:
    var functionName = null;
    var codeShort = null;
    var codeLong = null;
    if (caller.length === 3) {
        functionName = '"' + caller[1].substr(4).slice(0, -1) + '"';
        codeLong = caller[2];
    } else if (caller.length === 2) {
        functionName = caller[0].split('.').pop();
        codeLong = caller[1];
    } else {
        functionName = 'anonymous';
        codeLong = "(" + caller[0].split('@').pop() + ")";
    }
    // if (functionName === null) {
    //     stackDump();
    // }
    if (codeLong.indexOf("\\") > 0) {
        codeShort = (codeLong != null) ? "(" + codeLong.split("\\").pop() : null;
    } else {
        codeShort = (codeLong != null) ? "(" + codeLong.split("\/").pop() : null;
    }
    // console.log(functionName);
    // console.log(codeLong);
    // console.log(codeShort);
    traceString += fillTo(fillTo(codeShort, col1Width) + "|" + stackDepthString(functionName) + functionName + " ", col3Left) + "| ";
    traceString += nTimes(groupNesting, "  ");
    elements.forEach(function(element) {
        // console.log(element);
        var serialized = cloneAndMapLiquidObjectsDeep(element, function(liquidObject) { return liquidObject.__()})
        traceString += (typeof(serialized) === 'object') ? ("\n" + (JSON.stringify(serialized, null, 2))) : serialized;
        // if (isLiquidObject(element)) {
        //     traceString += element.__();
        // } else {
        //     traceString += element;
        // }
    });
    return traceString;
};

var trace = function() {
    // if (!surpressChildTraces) {
        var argumentsArray = argumentsToArray(arguments);
        var tag = argumentsArray.shift();
        if (shouldTrace(tag)) {
            liquid.allUnlocked++;
            liquid.pauseRecording(function() {
                console.log(constructTraceString(argumentsArray));
            });
            liquid.allUnlocked--;
        }
    // }
};

var traceGroup = function() {
    groupNesting++;
    // if (!surpressChildTraces) {
        var argumentsArray = argumentsToArray(arguments);
        var tag = argumentsArray.shift();
        if (shouldTrace(tag)) {
            liquid.allUnlocked++;
            liquid.pauseRecording(function() {
                groupNesting--;
                console.log(constructTraceString(argumentsArray));
                groupNesting++;
                // console.group(constructTraceString(argumentsArray));
            });
            liquid.allUnlocked--;
        } else {
            surpressChildTraces = true;
            hiddenGroupAtNesting = groupNesting;
        }
    // }
};



var traceGroupEnd = function() {
    groupNesting--;
    if (surpressChildTraces && groupNesting < hiddenGroupAtNesting) {
        surpressChildTraces = false;
    }
    // console.groupEnd();
};


var logData = function(data) {
    console.log(cloneAndMapLiquidObjectsDeep(data, function(liquidObject) { return liquidObject.__()}));
};

if (typeof(module) !== 'undefined') {
    module.exports.trace = trace;
    module.exports.traceGroup = traceGroup;
    module.exports.traceGroupEnd = traceGroupEnd;
    module.exports.traceTage = traceTags;
    module.exports.logData = logData;
}



