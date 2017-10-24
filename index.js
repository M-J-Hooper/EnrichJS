(function(factory) {
    if (typeof exports === 'object') {
        // Node requirements
        module.exports = factory();
    } else {
        // Browser global
        this.enrich = factory();
    }
})(function() {
    'use strict';

    ///////////////////////////////////////////////////////
    // Library root function
    ///////////////////////////////////////////////////////

    var enrich = function(obj, propertyName, parent, handlers, history) {
        var isObject = obj.constructor === Object;
        var isArray = obj.constructor === Array;

        if (obj.enriched) return obj;
        if (isObject || isArray) return new EnrichedObject(obj, propertyName, parent, handlers, history);
        return obj;
    };


    ///////////////////////////////////////////////////////
    // Constructor
    ///////////////////////////////////////////////////////

    function EnrichedObject(obj, propertyName, parent, handlers, history) {
        //extra properties to allow for enriched behaviour
        if (propertyName && !this.propertyName) {
            Object.defineProperty(this, 'propertyName', {
                value: propertyName
            });
        }
        if (parent && !this.parent) {
            Object.defineProperty(this, 'parent', {
                writable: true,
                value: parent
            });
        }
        Object.defineProperty(this, 'handlers', {
            writable: true,
            value: handlers || {}
        });
        Object.defineProperty(this, 'history', {
            writable: true,
            value: history || []
        });

        //create new obj type to store a replica of original object
        Object.defineProperty(this, 'obj', {
            writable: true,
            value: new obj.constructor()
        });

        for (var prop in obj) {
            //each property of original object must also be enriched to handle heirarchically structured data
            this.obj[prop] = enrich(obj[prop], prop, this, obj[prop].handlers, obj[prop].history);

            //add object property names with getters/setters modifying corresponding this.obj property
            //allows changes to be added to history for undoing and for firing change events
            Object.defineProperty(this, prop, {
                enumerable: true,
                configurable: true,
                set: this.setterFactory(prop),
                get: this.getterFactory(prop)
            });
        }

        //simulate array indices
        var props = Object.getOwnPropertyNames(obj);
        for (var i = 0; i < props.length; i++) {
            if (!this[props[i]]) {
                Object.defineProperty(this, props[i], {
                    configurable: true,
                    set: this.setterFactory(props[i]),
                    get: this.getterFactory(props[i])
                });
            }
        }

        //add functions from prototype to give correct behaviour (eg. push on arrays)
        props = Object.getOwnPropertyNames(obj.constructor.prototype);
        for (i = 0; i < props.length; i++) {
            if (!this[props[i]] && obj.constructor.prototype[props[i]] && obj.constructor.prototype[props[i]].constructor === Function) {
                Object.defineProperty(this, props[i], {
                    value: this.modifierFactory(props[i])
                });
            }
        }
    }


    ///////////////////////////////////////////////////////
    // Prototype core
    ///////////////////////////////////////////////////////

    EnrichedObject.prototype.enriched = true; //for detecting if enriched

    //attach event handlers
    EnrichedObject.prototype.on = function(event, fn) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(fn);
        return this;
    };

    //fire events
    EnrichedObject.prototype.emit = function(event, data) {
        var i;
        var upstreamData = data;
        
        var eventHandlers = this.handlers[event];
        if (eventHandlers) {
            for (i = 0; i < eventHandlers.length; i++) eventHandlers[i](data);
        }
        
        //change, undo and redo events need to have correct prop paths at each level
        if (['change', 'undo', 'redo'].indexOf(event) !== -1) {
            upstreamData = JSON.parse(JSON.stringify(data));
            
            //change events to update their histories
            if(event === 'change') {
                data.undone = false;
                data.active = true;
                if(this.parent) data.upstreamIndex = this.parent.history.length;
                this.history = deactivate(this.history);
                this.history.push(data);
                if (this.propertyName) upstreamData.propertyPath.push(this.propertyName);
            }
            else if (this.propertyName) upstreamData.push(this.propertyName);
        }
        if (this.parent) this.parent.emit(event, upstreamData); //propagate the event upstream
        return this;
    };
    
    EnrichedObject.prototype.change = function(change) {
        change.undone = false;
        change.active = true;
        
        //go downstream to change histories and make change
        var pointer = this;
        while(true) {
            if(change.propertyPath.length == 1) {
                pointer.obj[change.propertyPath[0]] = enrich(change.newValue); //change obj prop to avoid event from setter
                break;
            }
            else if(change.propertyPath.length == 0) {
                EnrichedObject.call(pointer, change.newValue, pointer.propertyName, pointer.parent, pointer.handlers, pointer.history);
                break;
            }
            else pointer = pointer[change.propertyPath.pop()];
        }
        
        //go upstream to change histories
        while(true) {
            if(pointer.parent) change.upstreamIndex = pointer.parent.history.length;
            else delete change.upstreamIndex;
            
            pointer.history = deactivate(pointer.history);
            pointer.history.push(JSON.parse(JSON.stringify(change)));
            
            if(!pointer.parent) break;
            change.propertyPath.push(pointer.propertyName);
            pointer = pointer.parent;
        } 
        return this;
    };

    EnrichedObject.prototype.undo = function(emitEvent, propertyPath) {
        if(emitEvent === undefined) emitEvent = true;
        
        var pointer = this;
        if(propertyPath && propertyPath.length) {
            while(propertyPath.length > 1) pointer = pointer[propertyPath.pop()];
            pointer[propertyPath[0]].undo(emitEvent);
            return this;
        }
        
        var change = this.unredo(true, emitEvent);
        if(!change) console.log('Nothing to undo');
        return this;
    };

    EnrichedObject.prototype.redo = function(emitEvent, propertyPath) {
        if(emitEvent === undefined) emitEvent = true;
        
        var pointer = this;
        if(propertyPath) {
            while(propertyPath.length > 1) pointer = pointer[propertyPath.pop()];
            pointer[propertyPath[0]].redo(emitEvent);
            return this;
        }
        
        var change = pointer.unredo(false, emitEvent);
        if(!change) console.log('Nothing to redo');
        return this;
    };

    EnrichedObject.prototype.unredo = function(undone, emitEvent) {
        var getFunction = undone ? getUndoable : getRedoable;
        var event = undone ? 'undo' : 'redo';
        
        //go downstream to change flags and then change value
        var path, index, change;
        var pointer = this;
        var count = 0;
        do {
            change = getFunction(pointer.history);
            if (change) {
                if (count == 0) index = change.index;

                change.undone = undone;
                var value = undone ? change.oldValue : change.newValue;

                path = change.propertyPath;
                if (path.length > 1) pointer = pointer[path[path.length - 1]];
                else if (path.length === 1) {
                    var prop = change.propertyPath[0];
                    //what does the line below even do???
                    //if (pointer[prop].history && pointer[prop].history.length) getFunction(pointer[prop].history).data.undone = undone;
                    pointer.obj[prop] = enrich(value, pointer[prop].propertyName, pointer[prop].parent, pointer[prop].handlers, pointer[prop].history);
                } 
                else if (path.length === 0) {
                    //Problem: undo a push leaves an empty index behind???
                    EnrichedObject.call(pointer, value, pointer.propertyName, pointer.parent, pointer.handlers, pointer.history);
                }
                if(count == 0 && emitEvent) pointer.emit(event, []);
                count++;
            } else return false;
        } while (path.length > 1);


        //go upstream to change flags
        pointer = this;
        var upstreamIndex = pointer.history[index].upstreamIndex;
        while (pointer.parent) {
            pointer = pointer.parent;
            pointer.history[upstreamIndex].undone = undone;
            upstreamIndex = pointer.history[upstreamIndex].upstreamIndex;
        }
        return true;
    };


    ///////////////////////////////////////////////////////
    // Prototype helpers
    ///////////////////////////////////////////////////////

    EnrichedObject.prototype.modifierFactory = function(prop) {
        return function() {
            var oldValue = new this.obj.constructor();
            for (var p in this.obj) oldValue[p] = this.obj[p];

            var returnValue = this.obj.constructor.prototype[prop].apply(this.obj, arguments);
            var data = {
                propertyPath: [],
                oldValue: oldValue,
                newValue: this.obj
            };
            if (!jsonEquality(data.oldValue, data.newValue)) {
                EnrichedObject.call(this, this.obj, this.propertyName, this.parent, this.handlers, this.history);
                this.emit('change', data);
            }
            return returnValue;
        };
    };

    EnrichedObject.prototype.setterFactory = function(prop) {
        return function(value) {
            var data = {
                propertyPath: [prop],
                oldValue: this.obj[prop],
                newValue: value
            };
            if (!jsonEquality(data.oldValue, data.newValue)) {
                this.obj[prop] = enrich(value); //include history from previous data and add an entry with empty path???
                this.emit('change', data);
            }
        };
    };

    EnrichedObject.prototype.getterFactory = function(prop) {
        return function() {
            return this.obj[prop];
        };
    };

    EnrichedObject.prototype.followPropertyPath = function(propertyPath) {
        var result = this;
        for (var i = propertyPath.length - 1; i >= 0; i--) result = result[propertyPath[i]];
        return result;
    };

    EnrichedObject.prototype.stringFromChangeEvent = function(data, varName) {
        var string = varName || this.propertyName || 'this';
        for (var i = data.propertyPath.length - 1; i >= 0; i--) {
            if (!isNaN(data.propertyPath[i])) string += '[' + data.propertyPath[i] + ']';
            else string += '.' + data.propertyPath[i];
        }
        string += ' changed from ' + JSON.stringify(data.oldValue);
        string += ' to ' + JSON.stringify(data.newValue);
        return string;
    };

    EnrichedObject.prototype.stringFromUndoEvent = function(data, varName) {
        var string = varName || this.propertyName || 'this';
        for (var i = data.propertyPath.length - 1; i >= 0; i--) {
            if (!isNaN(data.propertyPath[i])) string += '[' + data.propertyPath[i] + ']';
            else string += '.' + data.propertyPath[i];
        }
        string += ' undone from ' + JSON.stringify(data.newValue);
        string += ' to ' + JSON.stringify(data.oldValue);
        return string;
    };

    EnrichedObject.prototype.stringFromRedoEvent = function(data, varName) {
        var string = varName || this.propertyName || 'this';
        for (var i = data.propertyPath.length - 1; i >= 0; i--) {
            if (!isNaN(data.propertyPath[i])) string += '[' + data.propertyPath[i] + ']';
            else string += '.' + data.propertyPath[i];
        }
        string += ' redone from ' + JSON.stringify(data.oldValue);
        string += ' to ' + JSON.stringify(data.newValue);
        return string;
    };
    
    EnrichedObject.prototype.revert = function() {
        var reverted = new this.obj.constructor();
        for(var prop in this.obj) {
            if(this.obj[prop].revert) reverted[prop] = this.obj[prop].revert();
            else reverted[prop] = this.obj[prop];
        }
        return reverted;
    };


    ///////////////////////////////////////////////////////
    // Helper functions
    ///////////////////////////////////////////////////////

    function getUndoable(history) {
        for (var i = history.length - 1; i >= 0; i--) {
            var data = history[i];
            if (data.active && !data.undone) {
                data.index = i;
                return data;
            }
        }
        return undefined;
    }

    function getRedoable(history) {
        for (var i = 0; i < history.length; i++) {
            var data = history[i];
            if (data.active && data.undone) {
                data.index = i;
                return data;
            }
        }
        return undefined;
    }

    function deactivate(history) {
        var deactivatedHistory = [];
        for (var i = 0; i < history.length; i++) {
            var data = history[i];
            if (data.undone && data.active) data.active = false;
            deactivatedHistory.push(data);
        }
        return deactivatedHistory;
    }

    function jsonEquality(obj1, obj2) {
        if (JSON.stringify(obj1) === JSON.stringify(obj2)) return true; //bad comparison practice???
        return false;
    }

    return enrich;
});