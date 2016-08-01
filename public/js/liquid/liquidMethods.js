	


		// Add methods and repeaters
		object.addMethod = function(methodName, method) {
			liquid.addMethod(object, methodName, method);
		};
		
		object.overrideMethod = function(methodName, method) {
			liquid.overrideMethod(object, methodName, method);
		};
		


			var methodWithPossibleSecurity = method;
			if (arguments.length > 2 && liquid.onServer) {
				var methodRoleOnServer = arguments[2];
				methodWithPossibleSecurity = function() {
					liquid.roleStack.push(methodRoleOnServer);
					method.apply(this, argumentsToArray(argumentList));
					liquid.roleStack.pop();
				};
			}
			
			object[methodName] = methodWithPossibleSecurity;

			
			
			
			
			
			var parent = object[methodName];
			if (arguments.length > 2 && liquid.onServer) {
				throw "Error: Cannot change method role on inherited function!"
			}

			// Note: this is important, because in a repeatOnChange we can track what methods are overwritten on the server, so we know they can only be called on the server. 
			object[methodName] = function() {
				// console.log("In overridden function");
				var argumentList = argumentsToArray(arguments);
				argumentList.unshift(parent.bind(this));
				return method.apply(this, argumentList);
			}
