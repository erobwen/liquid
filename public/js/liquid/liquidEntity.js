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
                object.overrideMethod('accessLevel', function(parent, page) {
                    return 'readOnly';
                });

                object.addMethod('encryptPassword', function(liquidPassword) {
                    return liquidPassword + " [encrypted]";
                });
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
                object.addRelation('PageService', 'toOne');
            },

            addMethods : function(object) {
                object.overrideMethod('init', function(parent, initData) {
                    parent(initData);
                    this.setPageService(create('LiquidPageService', {}));
                    // Server variables
                    this._selection = {};
                    this._dirtySubscriptionSelections = true;
                    this._socket = null;

                    // Client variables
                    this._requestingSubscription = false;
                    this._subscriptionQueue = [];

                    var hardToGuessPageId = liquid.generatePageId();
                    liquid.pagesMap[hardToGuessPageId] = this;
                    this.setHardToGuessPageId(hardToGuessPageId);
                    this.getPageService().addOrderedSubscription(create('Subscription', {selector: 'Basics', object: this}));
                });//Subscription

                object.overrideMethod('accessLevel', function(parent, page) {
                    return 'readOnly';
                });

                object.addMethod('upstreamPulseReceived', function() {
                    // TODO: activate this later
                    // this.setReceivedSubscriptions(this.getOrderedSubscriptions()); // TODO: Consider, what happens if two subscriptions are requested at the same time?
                    // this._requestingSubscription = false;
                    // this.checkLoadQueue();
                });

                object.addMethod('encryptPassword', function(liquidPassword) {
                    return liquidPassword + " [encrypted]";
                });

                object.addMethod('selectBasics', function(selection) {
                    trace('selection', "----------");
                    liquid.addToSelection(selection, this);
                    trace('selection', "----------");
                    liquid.addToSelection(selection, this.getSession());
                    trace('selection', "----------");
                    liquid.addToSelection(selection, this.getActiveUser());
                    trace('selection', "----------");
                    liquid.addToSelection(selection, this.getPageService());

                    // Only needed for progressive loading!
                    this.getReceivedSubscriptions().forEach(function(subscription) {
                        liquid.addToSelection(selection, subscription);
                        liquid.addToSelection(selection, subscription.getTargetObject());
                    });
                    this.getPageService().getOrderedSubscriptions().forEach(function(subscription) {
                        liquid.addToSelection(selection, subscription);
                        liquid.addToSelection(selection, subscription.getTargetObject());
                    });
                });

                object.addMethod('checkLoadQueue', function() {
                    return;
                    if (!this._requestingSubscription) {
                        this._requestingSubscription = true;
                        if (this._subscriptionQueue.length > 0) {
                            var subscription = this._subscriptionQueue.unshift();
                            subscription.setParent(subscription._parentSubscription);
                            this.getPageService().addOrderedSubscription(subscription);
                        }
                    }
                });

                object.addMethod('ensureLoaded', function(object, selector, prioritized, loadedCallback) { // TODO: Optional parent subscription.
                    var loadedSelections = this.getLoadedSelectionsFor(object);
                    if (typeof(loadedSelections[selector]) === 'undefined') {
                        // Find a parent subscription.
                        var parentSubscription = null;
                        for (selector in loadedSelections) {
                            var firstSelection = loadedSelections[selector];
                            parentSubscription = firstSelection[Object.keys(firstSelection)[0]];// Just take the first one, as good as anyone.
                            break;
                        }

                        var subscription = create('Subscription', {selector: selector, object: object}); // , Parent : parentSubscription
                        subscription._parentSubscription = parentSubscription;
                        subscription._loadedCallback = loadedCallback;
                        this._requestingSubscription = false;

                        if (!prioritized) {
                            this._subscriptionQueue.push(subscription);
                        } else {
                            this._subscriptionQueue.shift(subscription);
                        }
                        this.checkLoadQueue();

                    }
                });

                object.addMethod('getLoadedSelectionsFor', function(object) {
                    var idToSelectorsMap = this.cachedCall('getAllReceivedSelections');
                    return idToSelectorsMap[object._id];
                });

                object.addMethod('getAllReceivedSelections', function() {
                    liquid.recordSelectors = true;
                    liquid.idToSelectorsMap = {}; // Structure {id -> {selector -> {subscriptionId -> subscription}}}
                    this.getReceivedSubscriptions().forEach(function(subscription) {
                        liquid.recordingSubscription = subscription;
                        var selection = {};
                        var selectorFunctionName = capitaliseFirstLetter(selection.getSelector());
                        subscription.getTargetObject()[selectorFunctionName](selection);
                    });
                    liquid.recordingSelectors = false;
                    return liquid.idToSelectorsMap;
                });

                object.addMethod('getActiveUser', function() {
                    if (this.getSession() != null) {
                        // console.log(this.getSession());
                        // console.log(this.getSession().getUser);
                        return this.getSession().getUser();
                    }
                    return null;
                });

                object.addMethod('setActiveUser', function(user) {
                    if (this.getSession() != null) {
                        // console.log(this.getSession());
                        // console.log(this.getSession().getUser);
                        return this.getSession().setUser(user);
                    }
                    return null;
                });
            }
        });

        liquid.registerClass({
            name: 'LiquidPageService', _extends: 'Entity',

            addPropertiesAndRelations : function(object) {
                // Relations
                object.addRelation('OrderedSubscription', 'toMany');

                // Reverse relations
                object.addReverseRelationTo('LiquidPage_PageService', 'Page', 'toOne');
            },

            addMethods : function(object) {
                object.overrideMethod('accessLevel', function(parent, page) {
                    return 'readAndWrite';
                });

                object.overrideMethod('allowCallOnServer', function(parent, page) {
                    return page === this.getPage();
                });

                object.addMethod('encryptPassword', function(liquidPassword) {
                    return liquidPassword + "[encrypted]"; // Dummy encryption, replace with SHA5 or similar.
                });

                object.addMethod('tryLogin', function(loginName, liquidPassword) {
                    // Use SHA and similar here!
                    // alert('try login');
                    this.callOnServer('tryLoginOnServer', loginName, this.encryptPassword(liquidPassword));
                });

                object.addMethod('logout', function() {
                    // Use SHA and similar here!
                    this.callOnServer('logoutOnServer');
                });

                object.addMethod('tryLoginOnServer', function(loginName, clientEncryptedPassword) {
                    // console.log("Here");
                    // console.log(loginName);
                    // console.log(clientEncryptedPassword);
                    var serverEncryptedPassword = this.encryptPassword(clientEncryptedPassword);
                    var user = liquid.findLocalEntity({name: loginName});
                    if (user != null && user.getEncryptedPassword() === serverEncryptedPassword) {
                        this.getPage().setActiveUser(user);
                    }
                });

                object.addMethod('logoutOnServer', function() {
                    this.getPage().setActiveUser(null);
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

                object.addRelation('ChildSubscription', 'toMany');
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

                // Relations
                object.addRelation('PasswordVault', 'toOne');

                object.addReverseRelationTo('LiquidSession_User', 'Session', 'toOne');
            },

            addMethods : function (object) {
                object.overrideMethod('init', function(parent, initData) {
                    parent(initData);

                    var encryptedPassword = null;
                    if (typeof(initData.password) !== 'undefined') {
                        encryptedPassword = initData.password + "[encrypted][encrypted]";
                    } else if (typeof(initData.clientEncryptedPassword) !== 'undefined') {
                        encryptedPassword = initData.clientEncryptedPassword + "[encrypted]";
                    } else if (typeof(initData.serverEncryptedPassword) !== 'undefined') {
                        encryptedPassword = initData.serverEncryptedPassword;
                    }

                    this.setPasswordVault(create('LiquidUserPasswordVault', { encryptedPassword: encryptedPassword })); // TODO: really need init data?
                });

                object.addMethod('getEncryptedPassword', function() {
                    return this.getPasswordVault().getEncryptedPassword();
                });
            }
        });


        /**
         * Password vault
         */
        liquid.registerClass({
            name: 'LiquidUserPasswordVault', _extends: 'Entity',

            addPropertiesAndRelations : function (object) {
                // Properties
                object.addProperty('encryptedPassword', '');

                // Relations
                object.addReverseRelationTo('LiquidSession_User', 'Session', 'toOne');
            },

            addMethods : function (object) {
                object.overrideMethod('accessLevel', function(page) {  // Return values, "noAccess", "readOnly", "readAndWrite".
                    return "noAccess"; // Only accessible on server call.
                });
            }
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
