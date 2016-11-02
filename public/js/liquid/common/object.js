
/*--------------------------------------
 *        Create function
 *---------------------------------------*/

function q(initialData) {
    if (initialData instanceof Array) {
        return new LiquidArray(initialData);
    } else {
        return new LiquidOject(initialData);
    }
}


/*--------------------------------------
 *
 *        Object
 *
 *---------------------------------------*/

function LiquidObject(initialData) {
    this.data = initialData;
    this.referenceCount = 0;

    this._id = null;
    this._upstreamId = null;
    this._persistentId = null;
}

LiquidObject.prototype.set = function(property, value){
    if (liquid.allowWrite(this)) {
        var previousValue = this.get(property);
        if (previousValue != value) {
            liquid.inPulse(function (pulse) {
                this.data[property] = value;
                pulse.add({
                    object: this,
                    action: 'set',
                    property: property,
                    previousValue: previousValue,
                    value: value
                });
            });
        }
    }
};

LiquidObject.prototype.get = function(property) {
    if (liquid.allowRead(this)) {
        liquid.registerObserverTo(this, {name : property}, {observers : getObject(this, 'observers', property)});
        return this.data[property];
    }
};

LiquidObject.prototype.forAllKeyValues = function(callback) {
    if (liquid.allowRead(this)) {
        liquid.registerObserverTo(this, {name : property}, {observers : getObject(this, 'keyObservers', property)});
        liquid.registerObserverTo(this, {name : property}, {observers : getObject(this, 'valueObservers', property)});
        for (key in this.data) {
            callback(key, this.data[key]);
        }
    }
};

LiquidObject.prototype.forAllKeys = function(callback) {
    if (liquid.allowRead(this)) {
        liquid.registerObserverTo(this, {name : property}, {observers : getObject(this, 'keyObservers', property)});
        for (key in this.data) {
            callback(key);
        }
    }
};

LiquidObject.prototype.forAllKeys = function(callback) {
    if (liquid.allowRead(this)) {
        liquid.registerObserverTo(this, {name : property}, {observers : getObject(this, 'keyObservers', property)});
        Object.keys(this.data).forEach(callback);
    }
};



/*--------------------------------------
 *
 *        Array
 *
 *---------------------------------------*/


function LiquidArray(initialData) {
    this.data = initialData;
    this.referenceCount = 0;
}

LiquidArray.prototype.__proto__ = LiquidObject.prototype;

LiquidArray.prototype.splice = function(index, removedCount, added) {
    if (liquid.allowWrite(this)) {
        liquid.inPulse(function (pulse) {
            var removed = this.data.slice(index, index + removedCount);
            var args = [index, removedCount];
            added.forEach(function(addedElement) {
                args.push(addedElement);
            });
            this.data.splice.apply(this.data, args);
            pulse.add({
                object: this,
                action: 'splice',
                index: index,
                removed: removed,
                added: added
            });
        });
    }
};

LiquidArray.prototype.push = function(value){
    if (liquid.allowWrite(this)) {
        liquid.inPulse(function (pulse) {
            this.data.push(value);
            pulse.add({
                object: this,
                action: 'splice',
                index: this.data.length,
                removed: [],
                added: [value]
            });
        });
    }
};

LiquidArray.prototype.pop = function(){
    var result;
    if (liquid.allowWrite(this)) {
        liquid.registerObserverTo(this, {name : this.data.length - 1}, {observers : getObject(this, 'arrayObservers')});
        liquid.inPulse(function (pulse) {
            result = this.data.pop();
            pulse.add({
                object: this,
                action: 'splice',
                index: this.data.length - 1,
                removed: [this.data[this.data.length - 1]],
                added: []
            });
        });
    }
    return result;
};

LiquidArray.prototype.unshift = function(value){
    if (liquid.allowWrite(this)) {
        liquid.inPulse(function (pulse) {
            this.data.unshift(value);
            pulse.add({
                object: this,
                action: 'splice',
                index: 0,
                removed: [],
                added: [value]
            });
        });
    }
};

LiquidArray.prototype.shift = function(){
    var result;
    if (liquid.allowWrite(this)) {
        liquid.registerObserverTo(this, {name : 1}, {observers : getObject(this, 'arrayObservers')});
        liquid.inPulse(function (pulse) {
            result = this.data.shift();
            pulse.add({
                object: this,
                action: 'splice',
                index: 0,
                removed: [data[0]],
                added: []
            });
        });
    }
    return result;
};

LiquidArray.prototype.get = function(index) {
    if (liquid.allowRead(this)) {
        if (typeof(index) === 'number') {
            liquid.registerObserverTo(this, {name : property}, {observers : getObject(this, 'arrayObservers')});
            return this.data[index];
        } else {
            this.__proto__.get(index);
        }
    }
};

LiquidArray.prototype.set = function(index, value){
    if (liquid.allowWrite(this)) {
        if (typeof(index) === 'number') {
            liquid.inPulse(function (pulse) {
                pulse.add({
                    object: this,
                    action: 'splice',
                    index: index,
                    removed: [],
                    added: [value]
                });
            });
        } else {
            this.__proto__.get(index);
        }
    }
};

LiquidArray.prototype.forAll = function(callback) {
    if (liquid.allowRead(this)) {
        liquid.registerObserverTo(this, {name : property}, {observers : getObject(this, 'keyObservers', property)});
        liquid.registerObserverTo(this, {name : property}, {observers : getObject(this, 'valueObservers', property)});
        for (key in this.data) {
            callback(key, this.data[key]);
        }
    }
};

