var addLiquidEntity = function(liquid) {
    liquid.addCommonLiquidClasses = function() {
        liquid.registerClass({
            name: 'LiquidSession', _extends: 'Entity',
    
            addPropertiesAndRelations : function (object) {
                // Properties
                object.addProperty('hardToGuessSessionId', '');
    
                // Relations
                object.addRelation('User', 'toOne', {order: function(a, b) { return -1; }});

                // Relations
                object.addReverseRelationTo('LiquidPage_Session', 'Page', 'toMany', {order: function(a, b) { return -1; }}); //readOnly: [], readAndWrite:['administrator'],
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
                object.addRelation('Session', 'toOne');
                object.addRelation('Service', 'toOne');
                object.addRelation('ReceivedSubscription', 'toMany');
                object.addRelation('OrderedSubscription', 'toMany');
            },
    
            addMethods : function(object) {
                object.overrideMethod('init', function(parent, initData) {
                    parent(initData);
                    this._selection = {};
                    this._dirtySubscriptions = true;
                    this._socket = null;

                    var hardToGuessPageId = liquid.generatePageId();
                    liquid.pagesMap[hardToGuessPageId] = this;
                    this.setHardToGuessPageId(hardToGuessPageId);
                    this.addOrderedSubscription(create('Subscription', {selector: 'Basics', object: this}));
                });//Subscription
                
                object.addMethod('encryptPassword', function(liquidPassword) {
                    return liquidPassword + " [encrypted]";
                });

                object.addMethod('selectBasics', function(selection) {
                    liquid.addToSelection(selection, this);
                    liquid.addToSelection(selection, this.getSession());
                    liquid.addToSelection(selection, this.getActiveUser());

                    // Only needed for progressive loading!
                    this.getReceivedSubscriptions().forEach(function(subscription) {
                        liquid.addToSelection(selection, subscription);
                        liquid.addToSelection(selection, subscription.getTargetObject());
                    });
                    this.getOrderedSubscriptions().forEach(function(subscription) {
                        liquid.addToSelection(selection, subscription);
                        liquid.addToSelection(selection, subscription.getTargetObject());
                    });
                });

                object.addMethod('getLoadedSelectionsFor', function(object) {
                    var idToSelectorsMap = this.cachedCall('getAllReceivedSelections');
                    return idToSelectorsMap[object._id];
                });

                object.addMethod('getAllReceivedSelections', function() {
                    liquid.recordSelectors = true;
                    liquid.idToSelectorsMap = {};
                    this.getReceivedSubscriptions().forEach(function(subscription) {
                        var selection = {};
                        var selectorFunctionName = capitalizeFirstLetter(selection.getSelector());
                        subscription.getTargetObject()[selectorFunctionName](selection);
                    });
                    liquid.recordingSelectors = false;
                    return liquid.idToSelectorsMap;
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
                }, 'administrator');
            }
        });

        liquid.registerClass({
            name: 'LiquidPageService', _extends: 'Entity',

            addPropertiesAndRelations : function(object) {
                // Relations
                object.addReverseRelationTo('LiquidPage_Service', 'Page', 'toOne');
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
                    // Use SHA and similar here!
                    this.callOnServer('loginOnServer', loginName, liquidPassword);  
                });

                object.addMethod('loginOnServer', function(loginName, liquidPassword) {
                    var user = liquid.findPersistentEntity({name: loginName});
                    // Verify password
                    this.getPage().setUser(user);
                });
            }
        });
            
        liquid.registerClass({
            name: 'Subscription',  _extends: 'Entity',

            addPropertiesAndRelations : function(object) {
                // Basics
                object.addProperty('selector', 'all'); //TODO: write once semantics.
                object.addRelation('TargetObject','toOne'); //TODO: write once semantics

                // Relations
                object.addReverseRelationTo('LiquidPage_Subscriptions','Page', 'toOne');

                object.addRelation('ChildSubscription');
                object.addReverseRelationTo('Subscription_ChildSubscription', 'Parent', 'toOne');
            },

            addMethods : function(object) {
                // Properties
                object.overrideMethod('init', function(parent, initData) {
                    // parent(initData); // Should not be needed, has no data visible inside liquid.
                    this.setSelector(undefinedAsNull(initData.selector));
                    this.setTargetObject(initData.object);
                    this._previousSelection = {};
                    this._idToDownstreamIdMap = null;  // This is set in pulses where this page pushes data upstream.
                });
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

                object.isLoaded = function() {
                    if (typeof(liquid.instancePage) !== 'undefined' && liquid.instancePage !== null) {
                        if (arguments.length = 1) {
                            var selector = arguments[0];
                            if (typeof(liquid.instancePage) !== 'undefined' && liquid.instancePage !== null) {
                                return (typeof(liquid.instancePage.getLoadedSelectionsFor(this)[selector]) !== undefined);
                            } else {
                                return true;
                            }
                        } else {
                            if (typeof(this._isLoadedObservers) === 'undefined') {
                                this._isLoadedObservers = { observers: {} };
                            }
                            liquid.setupObservation(this, {name: 'isLoaded'}, this._isLoadedObservers);
                            return !this._noDataLoaded;
                        }
                    } else {
                        return true;
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
                            liquid.setupObservation(this, definition, instance);
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
