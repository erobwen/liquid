var addLiquidEntity = function(liquid) {
    liquid.addCommonLiquidClasses = function() {
        liquid.registerClass({
            name: 'LiquidSession', _extends: 'Entity',
    
            addPropertiesAndRelations : function (object) {
                // Properties
                object.addProperty('hardToGuessSessionId', '');
    
                // Relations
                object.addRelation('Page', 'toMany', {order: function(a, b) { return -1; }});
                object.addRelation('User', 'toOne', {order: function(a, b) { return -1; }});
            },
    
            addMethods : function (object) {
                object.addMethod('canReadAndWrite', function(user) { return liquid.isAdministrator; });
                object.addMethod('canRead', function(user) { return liquid.isAdministrator; });
    
    
                object.addMethod('encryptPassword', function(liquidPassword) {
                    return liquidPassword + " [encrypted]";
                });
    
                object.addMethod('login', function(loginName, liquidPassword) {
                    var user = liquid.find({loginName: loginName});
                    if (this.encryptPassword(liquidPassword) == user.getEncryptedPassword()) {
                        this.setUser(user);
                        return true;
                    } else {
                        return false;
                    }
                }, 'administrator');
            }
        });
    
        liquid.registerClass({
            name: 'LiquidPage', _extends: 'Entity',
    
            addPropertiesAndRelations : function(object) {
                // Properties
                object.addProperty('hardToGuessPageId', '');
    
                // Relations
                object.addReverseRelationTo('LiquidSession_Page', 'Session', 'toOne', {order: function(a, b) { return -1; }}); //readOnly: [], readAndWrite:['administrator'],
            },
    
            addMethods : function(object) {
                object.addMethod('encryptPassword', function(liquidPassword) {
                    return liquidPassword + " [encrypted]";
                });
    
                object.addMethod('getActiveUser', function(liquidPassword) {
                    if (this.getSession() != null) {
                        // console.log(this.getSession());
                        // console.log(this.getSession().getUser);
                        return this.getSession().getUser();
                    }
                    return null;
                });
    
                object.addMethod('login', function(loginName, liquidPassword) {
                    return this.getPage().login(loginName, liquidPassword);
                }, 'administrator');
    
            }
        });
    
        liquid.registerClass({
            name: 'LiquidUser', _extends: 'Entity',
    
            addPropertiesAndRelations : function (object) {
                // Properties
                object.addProperty('loginName', '');
                object.addProperty('alternativeLoginName', '');
                object.addProperty('encryptedPassword', '', {readOnly: [], readAndWrite:['administrator']});
    
                // Relations
                object.addReverseRelationTo('LiquidSession_User', 'Session', 'toOne');
            },
    
            addMethods : function (object) {}
        });
    
        liquid.registerClass({
            name: 'Entity',
            addPropertiesAndRelations : function (object) {
                // Note: This information needs to match what is in the database definition (fields and their default values) and the model and its relations.
            },
    
            addMethods : function (object) {
                object.touchedByEntity = true;
    
                // TODO: Use define method functions instead!!!
    
                object.roles = function(liquidPage) {
                    // Do something with: liquidPage.getUser();
                    return [];
                };

                object.getGlobalId = function() {
                    // TODO: find source of object.
                    // Only some persitent servers can create global ids.
                    // https://github.com/rauschma/strint
                };
    
                object.init = function(initData) {
                    for(var property in initData) {
                        // console.log("property: " + property);
                        setterName = 'set' + capitaliseFirstLetter(property);
                        if (typeof(this[setterName]) !== 'undefined') {
                            console.log("setting using standard constructor:" + setterName);
                            this[setterName](initData[property]);
                        } else {
                            console.log("Error: Setter not found: " + this.__() + "." + setterName + "!");
                            // console.log(this);
                        }
                    }
                };
    
                object.is = function(className) {
                    return typeof(this.classNames[className]) !== 'undefined';
                };
                    
                object._idString = function() {
                    // var idString = "";
                    // if (this._globalId !== null) {
                    //     idString = "¤." + this._globalId;
                    // } else if (this._persistentId !== null){
                    //     idString = "#." + this._persistentId;
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
                    if (typeof(selection[this._id]) === 'undefined') {
                        // console.log("Selecting " + this.__());
                        selection[this._id] = true;
                        this.forAllOutgoingRelatedObjects(function(definition, instance, relatedObject) {
                            relatedObject.selectAll(selection);
                        });
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
