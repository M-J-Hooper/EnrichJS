(function (factory) {
    if (typeof exports === 'object') {
      // Node requirements
      module.exports = factory();
    } else {
      // Browser global
      this.enrich = factory();
    }
})(function () {
  'use strict';

  ///////////////////////////////////////////////////////
  // Library root function
  ///////////////////////////////////////////////////////

  var enrich = function(obj, propertyName, parent, handlers, history) {
    var isObject = obj.constructor === Object;
    var isArray = obj.constructor === Array;

    if (obj.enriched) return obj;
    if(isObject || isArray) return new EnrichedObject(obj, propertyName, parent, handlers, history);
    return obj;
  };

  enrich.globalHistory = [];
  
  //global undos/redos get refernce of object to change from global history
  enrich.undo = function() {
    var change = getUndoable(enrich.globalHistory);
    if(change) change.data.source.undo();
    else console.log('Nothing to undo');
    return this;
  };

  enrich.redo = function() {
    var change = getRedoable(enrich.globalHistory);
    if(change) change.data.source.redo();
    else console.log('Nothing to redo');
    return this;
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
    
    for(var prop in obj) {
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
    for(var i = 0; i < props.length; i++){
      if(!this[props[i]]) {
        Object.defineProperty(this, props[i], {
          configurable: true,
          set: this.setterFactory(props[i]),
          get: this.getterFactory(props[i])
        });
      }
    }
    
    //add functions from prototype to give correct behaviour (eg. push on arrays)
    props = Object.getOwnPropertyNames(obj.constructor.prototype);
    for(i = 0; i < props.length; i++) {
      if(!this[props[i]] && obj.constructor.prototype[props[i]] && obj.constructor.prototype[props[i]].constructor === Function) {
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
  EnrichedObject.prototype.on = function (event, fn) {
    if(!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(fn);
    return this;
  };
  
  //fire events
  EnrichedObject.prototype.emit = function (event, data) {
    var eventHandlers = this.handlers[event];
    if(eventHandlers) {
      for(var i = 0; i < eventHandlers.length; i++) eventHandlers[i](data);
    }

    var upstreamData = {};
    for(var prop in data) upstreamData[prop] = data[prop];
    
    //change events must be propagated up through heirarchically structured data to update their histories
    if(event === 'change') {
      upstreamData.propertyPath = [];
      for(i = 0; i < data.propertyPath.length; i++) upstreamData.propertyPath[i] = data.propertyPath[i];

      data.undone = false;
      data.active = true;
      if(!this.parent) {
        data.upstreamIndex = enrich.globalHistory.length;
        var globalUpstreamData = {
          source: this,
          undone: false,
          active: true
        };
        enrich.history = deactivate(enrich.globalHistory);
        enrich.globalHistory.push(globalUpstreamData);
      }
      else data.upstreamIndex = this.parent.history.length;
      this.history = deactivate(this.history);
      this.history.push(data);

      if(this.propertyName) upstreamData.propertyPath.push(this.propertyName);
    }
    if(this.parent) this.parent.emit(event, upstreamData); //propagate the change event firing

    return this;
  };

  EnrichedObject.prototype.undo = function() {
    var change = this.unredo(true, getUndoable);
    if(change) this.emit('undo', change);
    else console.log('Nothing to undo');
    return this;
  };

  EnrichedObject.prototype.redo = function() {
    var change = this.unredo(false, getRedoable);
    if(change) this.emit('redo', change);
    else console.log('Nothing to redo');
    return this;
  };

  EnrichedObject.prototype.unredo = function(undone, getFunction) {
    //go downstream to change flags and then change value
    var source = this;
    var first = true;
    do {
      var change = getFunction(source.history);
      if(change) {
        if(first) {
          var index = change.index;
          first = false;
          
          var returnData = {};
          for(var p in change.data) returnData[p] = change.data[p];
        }

        change.data.undone = undone;
        var value = undone ? change.data.oldValue : change.data.newValue;

        var path = change.data.propertyPath;
        if(path.length > 1) source = source[path[path.length - 1]];
        else if(path.length === 1) {
          var prop = change.data.propertyPath[0];
          if(source[prop].history && source[prop].history.length) getFunction(source[prop].history).data.undone = undone;
          source.obj[prop] = enrich(value, source[prop].propertyName, source[prop].parent, source[prop].handlers, source[prop].history);
        }
        else if(path.length === 0) {
          //Problem: undo a push leaves an empty index behind???
          EnrichedObject.call(source, value, source.propertyName, source.parent, source.handlers, source.history);
        }
      }
      else return false;
    } while(path.length > 1);


    //go upstream to change flags
    source = this;
    var upstreamIndex = source.history[index].upstreamIndex;
    while(source.parent) {
      source = source.parent;
      source.history[upstreamIndex].undone = undone;
      upstreamIndex = source.history[upstreamIndex].upstreamIndex;
    }
    enrich.globalHistory[upstreamIndex].undone = undone;
    return returnData;
  };


  ///////////////////////////////////////////////////////
  // Prototype helpers
  ///////////////////////////////////////////////////////

  EnrichedObject.prototype.modifierFactory = function(prop){
    return function () {
      var oldValue = new this.obj.constructor();
      for(var p in this.obj) oldValue[p] = this.obj[p];

      var returnValue = this.obj.constructor.prototype[prop].apply(this.obj, arguments);
      var data = {
        propertyPath: [],
        oldValue: oldValue,
        newValue: this.obj
      };
      if(!jsonEquality(data.oldValue, data.newValue)) {
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
      if(!jsonEquality(data.oldValue, data.newValue)) {
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
    for(var i = propertyPath.length - 1; i >= 0; i--) result = result[propertyPath[i]];
    return result;
  };

  EnrichedObject.prototype.stringFromChangeEvent = function(data, varName) {
    var string = varName || this.propertyName || 'this';
    for(var i = data.propertyPath.length - 1; i >= 0; i--) {
      if(!isNaN(data.propertyPath[i])) string += '[' + data.propertyPath[i] + ']';
      else string += '.' + data.propertyPath[i];
    }
    string += ' changed from ' + JSON.stringify(data.oldValue);
    string += ' to ' + JSON.stringify(data.newValue);
    return string;
  };
  
  EnrichedObject.prototype.stringFromUndoEvent = function(data, varName) {
    var string = varName || this.propertyName || 'this';
    for(var i = data.propertyPath.length - 1; i >= 0; i--) {
      if(!isNaN(data.propertyPath[i])) string += '[' + data.propertyPath[i] + ']';
      else string += '.' + data.propertyPath[i];
    }
    string += ' undone from ' + JSON.stringify(data.newValue);
    string += ' to ' + JSON.stringify(data.oldValue);
    return string;
  };
  
  EnrichedObject.prototype.stringFromRedoEvent = function(data, varName) {
    var string = varName || this.propertyName || 'this';
    for(var i = data.propertyPath.length - 1; i >= 0; i--) {
      if(!isNaN(data.propertyPath[i])) string += '[' + data.propertyPath[i] + ']';
      else string += '.' + data.propertyPath[i];
    }
    string += ' redone from ' + JSON.stringify(data.oldValue);
    string += ' to ' + JSON.stringify(data.newValue);
    return string;
  };


  ///////////////////////////////////////////////////////
  // Helper functions
  ///////////////////////////////////////////////////////

  function getUndoable(history) {
    var undoable = {};

    for(var i = history.length - 1; i >= 0; i--) {
      var data = history[i];
      if(data.active && !data.undone) {
        undoable.data = data;
        undoable.index = i;
        return undoable;
      }
    }
    return undefined;
  }

  function getRedoable(history) {
    var redoable = {};

    for(var i = 0; i < history.length; i++) {
      var data = history[i];
      if(data.active && data.undone) {
        redoable.data = data;
        redoable.index = i;
        return redoable;
      }
    }
    return undefined;
  }
  
  function deactivate(history) {
    var deactivatedHistory = [];
    for(var i = 0; i < history.length; i++) {
      var data = history[i];
      if(data.undone && data.active) data.active = false;
      deactivatedHistory.push(data);
    }
    return deactivatedHistory;
  }

  function jsonEquality(obj1, obj2) {
    if(JSON.stringify(obj1) === JSON.stringify(obj2)) return true; //bad comparison practice???
    return false;
  }

  return enrich;
});