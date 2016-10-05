var addLiquidEntity = function(liquid) {
    liquid.addCommonLiquidClasses = function() {

        /**
         * Experimental, a class that
         */

        // liquid.registerClass({
        //     name: 'ServiceEntity',
        //     addPropertiesAndRelations : function (object) {},
        //
        //     addMethods : function (object) {}
        // });

        liquid.registerClass({
            name: 'Entity',
            addPropertiesAndRelations : function (object) {
                // Note: This information needs to match what is in the database definition (fields and their default values) and the model and its relations.
                object.addProperty('isPlaceholderObject', false, {clientOnly : true});
                object.addProperty('isLockedObject', false, {clientOnly : true});
            },

            addMethods : function (object) {
                // TODO: Use define method functions instead!!!
                
                object.getGlobalId = function() {
                    // TODO: find source of object.
                    // Only some persitent servers can create global ids.
                    // https://github.com/rauschma/strint
                };

                object.init = function(initData) {
                    for(var property in initData) {
                        // console.log("property: " + property);
                        trace('init', this, ".",  property,  "=");
                        setterName = 'set' + capitaliseFirstLetter(property);
                        if (typeof(this[setterName]) !== 'undefined') {
                            trace('init', "setting using standard constructor: ", setterName);
                            this[setterName](initData[property]);
                        } else {
                            trace('init', "Error: Setter not found: ", this, ".", setterName, "!");
                            // console.log(this);
                        }
                    }
                };

                object.isLoaded = function() {
                    if (liquid.onClient) {
                        if (arguments.length == 1) {
                            var selector = arguments[0];
                            if (typeof(liquid.instancePage) !== 'undefined' && liquid.instancePage !== null) {
                                return (typeof(liquid.instancePage.getLoadedSelectionsFor(this)[selector]) !== undefined);
                            } else {
                                return true;
                            }
                        } else {
                            return !this.getIsPlaceholderObject();
                        }
                    } else {
                        return true;
                    }
                };

                object.accessLevel = function(page) {  // Return values, "noAccess", "readOnly", "readAndWrite".
                    return "readAndWrite";
                };

                object.allowCallOnServer = function(page) { // Call on server grants admin rights inside the call, so it should be guarded well. False as default!
                    return false;
                };

                object.readable = function() {
                    return liquid.allowRead(this);
                };

                object.writeable = function() {
                    return liquid.allowWrite(this);
                };

                object.is = function(className) {
                    return typeof(this.classNames[className]) !== 'undefined';
                };

                object._idString = function() {
                    // var idString = "";
                    // if (this._globalId !== null) {
                    //     idString = "¤." + this._globalId;
                    // } else if (this._persistentId !== null){
                    //     idString = "#." + this._persistsentId;
                    // } else if (this._id !== null) {
                    //     idString = "id." + this._id;
                    // }
                    // return idString;
                    function removeNull(value) {
                        return (value === null) ? 'x' : value;
                    }
                    return this._id + "." + removeNull(this._upstreamId) + "." + removeNull(this._persistentId) + "." + removeNull(this._globalId);
                };

                // This is the signum function, useful for debugging and tracing.
                object.__ = function() {
                    return "(" + this.className + "." + this._idString() + ")";
                };

                object.selectAll = function(selection) {
                    trace('selection', liquid.allowRead(this));
                    if (typeof(selection[this._id]) === 'undefined' && liquid.allowRead(this)) {
                        // console.log("Selecting " + this.__());
                        selection[this._id] = true;
                        this.forAllOutgoingRelationsAndObjects(function(definition, instance, relatedObject) {
                            trace('selection', "In here!");
                            liquid.registerObserverTo(this, definition, instance);
                            relatedObject.selectAll(selection);
                        }.bind(this));
                    }
                };
            },

            addServerMethods : function(object) {
            },

            addClientMethods : function(object) {
                object.getSaver = function() {
                    return cream.defaultSaver;
                };

                // object.callOnServer = function(method, postCallCallback) { // TODO: an arglist
                // cream.callOnServer(object, method, postCallCallback);
                // };
            }
        });

        liquid.registerClass({
            name: 'Index',
            addPropertiesAndRelations : function (object) {
                // Note: This information needs to match what is in the database definition (fields and their default values) and the model and its relations.
            },
            addMethods : function (object) {
                object.__ = function() {
                    return "[Index]";
                }
            }
        });
    };
};


if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
    module.exports.addLiquidEntity = addLiquidEntity;
} else {
    // global.addCommonLiquidFunctionality = addCommonLiquidFunctionality;
}
