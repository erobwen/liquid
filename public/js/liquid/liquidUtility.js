/*------------------------------
*           Utility
*-------------------------------*/

var isArray = function(entity) {
	return Array.isArray(entity);
}

// var inArray = function(item, array) {
	// array.forEach(function(arrayItem) {
		// if (item === arrayItem) {
			// return true;
		// }
	// });
	// return false;
// }

var argumentsToArray = function(arguments) {
	return Array.prototype.slice.call(arguments);
}

var copyArray = function(array) {
	return array.slice();
}

var clearArray = function(array) {
	return array.lenght = 0;
}

var lastOfArray = function(array) {
	return array[array.length - 1];
}

var arrayToMap = function(array) {
	var result = {};
	if (typeof(array) !== 'undefined') {
		array.forEach(function(item) {
			result[item] = true;
		});
	}
	return result;
}

// var argumentsToArray = function(argumentsObject) {
	// var result = [];
	// for (key in argumentsObject) {
		// result.push(argumentsObject[key]);
	// }
	// return result;
// }

var removeFromArray = function(object, array) {
	// console.log(object);
	for(var i = 0; i < array.length; i++) {
		// console.log("Searching!");
		// console.log(array[i]);
		if (array[i] === object) {
			// console.log("found it!");
			array.splice(i, 1);
			break;
		}
	}
};

// var copyArray = function(array) {
	// var copy = [];
	// array.forEach(function(item) {
		// copy.push(item);
	// })
	// return copy;
// };

var clone = function(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
};

var arrayDifference = function(updatedArray, oldArray) {
	var added = copyArray(updatedArray);
	var removed = copyArray(oldArray);
	updatedArray.forEach(function(newItem) {
		oldArray.forEach(function(oldItem) {
			if (newItem == oldItem) {
				removeFromArray(newItem, added);
				removeFromArray(newItem, removed);
			}
		});
	});
	return {added: added, removed: removed};
}


/*------------------------------
*        String Utility
*-------------------------------*/
 

var pluralize = function(string, revert){

    var plural = {
        '(quiz)$'               : "$1zes",
        '^(ox)$'                : "$1en",
        '([m|l])ouse$'          : "$1ice",
        '(matr|vert|ind)ix|ex$' : "$1ices",
        '(x|ch|ss|sh)$'         : "$1es",
        '([^aeiouy]|qu)y$'      : "$1ies",
        '(hive)$'               : "$1s",
        '(?:([^f])fe|([lr])f)$' : "$1$2ves",
        '(shea|lea|loa|thie)f$' : "$1ves",
        'sis$'                  : "ses",
        '([ti])um$'             : "$1a",
        '(tomat|potat|ech|her|vet)o$': "$1oes",
        '(bu)s$'                : "$1ses",
        '(alias)$'              : "$1es",
        '(octop)us$'            : "$1i",
        '(ax|test)is$'          : "$1es",
        '(us)$'                 : "$1es",
        '([^s]+)$'              : "$1s"
    };

    var singular = {
        '(quiz)zes$'             : "$1",
        '(matr)ices$'            : "$1ix",
        '(vert|ind)ices$'        : "$1ex",
        '^(ox)en$'               : "$1",
        '(alias)es$'             : "$1",
        '(octop|vir)i$'          : "$1us",
        '(cris|ax|test)es$'      : "$1is",
        '(shoe)s$'               : "$1",
        '(o)es$'                 : "$1",
        '(bus)es$'               : "$1",
        '([m|l])ice$'            : "$1ouse",
        '(x|ch|ss|sh)es$'        : "$1",
        '(m)ovies$'              : "$1ovie",
        '(s)eries$'              : "$1eries",
        '([^aeiouy]|qu)ies$'     : "$1y",
        '([lr])ves$'             : "$1f",
        '(tive)s$'               : "$1",
        '(hive)s$'               : "$1",
        '(li|wi|kni)ves$'        : "$1fe",
        '(shea|loa|lea|thie)ves$': "$1f",
        '(^analy)ses$'           : "$1sis",
        '((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$': "$1$2sis",        
        '([ti])a$'               : "$1um",
        '(n)ews$'                : "$1ews",
        '(h|bl)ouses$'           : "$1ouse",
        '(corpse)s$'             : "$1",
        '(us)es$'                : "$1",
        's$'                     : ""
    };

    var irregular = {
        'move'   : 'moves',
        'foot'   : 'feet',
        'goose'  : 'geese',
        'sex'    : 'sexes',
        'child'  : 'children',
        'man'    : 'men',
        'tooth'  : 'teeth',
        'person' : 'people'
    };

    var uncountable = [
        'sheep', 
        'fish',
        'deer',
        'series',
        'species',
        'money',
        'rice',
        'information',
        'equipment'
    ];

    // save some time in the case that singular and plural are the same
    if(uncountable.indexOf(string.toLowerCase()) >= 0)
      return string;

    // check for irregular forms
    for(word in irregular){

      if(revert){
              var pattern = new RegExp(irregular[word]+'$', 'i');
              var replace = word;
      } else{ var pattern = new RegExp(word+'$', 'i');
              var replace = irregular[word];
      }
      if(pattern.test(string))
        return string.replace(pattern, replace);
    }

    if(revert) var array = singular;
         else  var array = plural;

    // check for matches using regular expressions
    for(reg in array){

      var pattern = new RegExp(reg, 'i');

      if(pattern.test(string))
        return string.replace(pattern, array[reg]);
    }

    return string;
};


var camelCaseToPlural = function(string) {
	var words = breakdownCamelCase(string);
	words[words.length - 1] = pluralize(words[words.length - 1]);
	return reconstructCamelCase(words);
};


var reconstructCamelCase = function(words) {
	// words[0] = words[0].toLowerCase();
	// var index = 1;
	// while (index < words.length) {
		// words[index] = words[index].toLowerCase().replace('/^./', function(str){ return str.toUpperCase(); });	
	// }
	return words.join("");
};


var breakdownCamelCase = function(string) {
	return string.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(" ");
};

var capitaliseFirstLetter = function(string){
	return string.substr(0, 1).toUpperCase() + string.slice(1);
};

var lowerCaseFirstLetter = function(string){
	return string.substr(0, 1).toLowerCase() + string.slice(1);
};

var nameToVariable = function(string) {
	return lowerCaseFirstLetter(string.replace(/\s/g, ''));
}

if (typeof(module) !== 'undefined') {
	module.exports.isArray = isArray;
	// module.exports.inArray = inArray;
	module.exports.argumentsToArray = argumentsToArray;
	module.exports.copyArray = copyArray;
	module.exports.clearArray = clearArray;
	module.exports.arrayToMap = arrayToMap;
	module.exports.lastOfArray = lastOfArray;
	module.exports.removeFromArray = removeFromArray;
	module.exports.clone = clone;
	module.exports.arrayDifference = arrayDifference;
	
	module.exports.pluralize = pluralize;
	module.exports.camelCaseToPlural = camelCaseToPlural;
	module.exports.reconstructCamelCase = reconstructCamelCase;
	module.exports.breakdownCamelCase = breakdownCamelCase;
	module.exports.capitaliseFirstLetter = capitaliseFirstLetter;
	module.exports.lowerCaseFirstLetter = lowerCaseFirstLetter;
}

