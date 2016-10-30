




function addObservability(object) {
    object.set = function(property, value){
        if (liquid.allowWrite(this)) {
            var previousValue = this.get(property);
            if (previousValue != value) {
                liquid.inPulseBlockUponChangeActions(function (pulse) {
                    this[property] = value;
                    pulse.add({
                        action: 'set',
                        object: this,
                        property: property,
                        previousValue: previousValue,
                        value: value
                    });
                });
            }
        }
    };
    
    object.get = function(property) {
        var observers = getObject(this, 'observers', property);
        if (liquid.allowRead(this)) {
            liquid.registerObserverTo(this, {name : property}, {observers : observers});
            return this[property];
        }
    };
}


function addSynchronizeability(object) {
}

