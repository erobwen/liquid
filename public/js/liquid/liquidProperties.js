	/*-------------------
	*     Properties
	*--------------------*/

	/**
	 * Properties
	 */	
	liquid.addProperty = function(object, name, defaultValue, details) {
		liquid.addPropertyInfo(
			object, 
			liquid.createPropertyStructure({
				name : name,
				type : 'this is not used?',
				defaultValue : defaultValue, 
			}, details)
		);
	};

		
	var allowRead = function(object, definition) {
		return true;
		var user = page.getUser();
		return object.cachedCall('allowRead', user) || object.cachedCall('allowReadAndWrite', user);
	};

	
	var allowWrite = function(object, page) {
		return true;
		return object.cachedCall('allowReadAndWrite', page.getUser());
	};


	
	liquid.addPropertyInfo = function(object, definition) {
		var instance = {observers : {}};
		object._propertyDefinitions[definition.name] = definition;
		object._propertyInstances[definition.name] = instance; // This is only used in object augmentation mode. 
		
		// Initialize getter
		object[definition.getterName] = function() {
			if (allowRead(this, liquid.page)) {
				var instance = this._propertyInstances[definition.name];
				liquid.notifyGettingProperty(object, definition, instance);
				return instance.data;
			} else {
				console.log("Access violation: " + this._ + "." + definition.getterName + "() not allowed by page/user");
				return clone(definition.defaultValue);
			}
		};
		
		// Initialize setter
		object[definition.setterName] = function(value) {
			var instance = this._propertyInstances[definition.name];
			var oldValue = instance.data;
			if (value != oldValue) {
				if (allowWrite(this, liquid.page)) {
					instance.data = value;
					liquid.notifySettingProperty(this, definition, instance, value, oldValue);
				} else {
					console.log("Access violation: " + this._ + "." + definition.setterName + "(...) not allowed by page/user");
				}
			}
		};
	};
