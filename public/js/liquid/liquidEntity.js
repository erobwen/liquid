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
    
                object.init = function(initData) {
                    for(var property in initData) {
                        // console.log("property: " + property);
                        setterName = 'set' + capitaliseFirstLetter(property);
                        if (typeof(this[setterName]) !== 'undefined') {
                            console.log("setting using standard constructor:" + setterName);
                            this[setterName](initData[property]);
                        } else {
                            console.log("Error: Setter not found: (" + this.id + ")" + setterName + "!");
                            // console.log(this);
                        }
                    }
                };
    
                object.is = function(className) {
                    return typeof(this.classNames[className]) !== 'undefined';
                };
    
                object.getObjectSignum = function() {
                    return "(" + this.className + "." + this.id + ")";
                };
    
                object.selectAll = function(selection) {
                    if (typeof(selection[this.id]) === 'undefined') {
                        // console.log("Selecting " + this.className + ":" + this.id);
                        selection[this.id] = true;
                        this._relationDefinitions.forEach(function(definition) {
                            if(definition.isSet) {
                                this[definition.forAllName](function(related) {
                                    related.selectAll(selection)
                                });
                            } else {
                                related = this[definition.getterName]();
                                if (related !== null) {
                                    related.selectAll(selection);
                                }
                            }
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
                object.getObjectSignum = function() {
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
