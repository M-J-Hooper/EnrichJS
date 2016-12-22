(function (factory) {
    if (typeof exports === 'object') {
      // Node
      module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
      // AMD
      define(factory);
    } else {
      // Browser globals
      this.enrich = factory();
    }
}(function () {
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

    Object.defineProperty(this, 'obj', {
      writable: true,
      value: new obj.constructor()
    });

    for(var prop in obj) {
      this.obj[prop] = enrich(obj[prop], prop, this, obj[prop].handlers, obj[prop].history);
      Object.defineProperty(this, prop, {
        enumerable: true,
        configurable: true,
        set: this.setterFactory(prop),
        get: this.getterFactory(prop)
      });
    }

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

    props = Object.getOwnPropertyNames(obj.constructor.prototype);
    for(i = 0; i < props.length; i++) {
      if(!this[props[i]] && obj.constructor.prototype[props[i]] &&
        obj.constructor.prototype[props[i]].constructor === Function) {
        Object.defineProperty(this, props[i], {
          value: this.modifierFactory(props[i])
        });
      }
    }
  }
  
  
  ///////////////////////////////////////////////////////
  // Prototype core
  ///////////////////////////////////////////////////////

  EnrichedObject.prototype.enriched = true;
  
  EnrichedObject.prototype.on = function (event, fn) {
    if(!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(fn);
    return this;
  };
  
  EnrichedObject.prototype.emit = function (event, data) {
    var eventHandlers = this.handlers[event];
    if(eventHandlers) {
      for(var i = 0; i < eventHandlers.length; i++) eventHandlers[i](data);
    }
    
    var upstreamData = {};
    for(var prop in data) upstreamData[prop] = data[prop];
    
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
        enrich.globalHistory.push(globalUpstreamData);
      }
      else data.upstreamIndex = this.parent.history.length;
      this.history.push(data);
      
      if(this.propertyName) upstreamData.propertyPath.push(this.propertyName);
      
    }
    if(this.parent) this.parent.emit(event, upstreamData);
    
    //awkward having this here, maybe attach it as handler???
    if(event === 'change') {
      if(data.propertyPath.length === 0) this.deactivate();
      if(data.propertyPath.length === 1) this.deactivate(data.propertyPath[0]);
    }
    return this;
  };
  
  EnrichedObject.prototype.undo = function() {
    var success = this.unredo(true, getUndoable);
    if(success) console.log('Undone');
    else console.log('Nothing to undo');
    return this;
  };
  
  EnrichedObject.prototype.redo = function() {
    var success = this.unredo(false, getRedoable);
    if(success)console.log('Redone');
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
        }          
        
        change.data.undone = undone;
        var value = undone ? change.data.oldValue : change.data.newValue;
        
        var path = change.data.propertyPath;
        if(path.length > 1) source = source[path[path.length - 1]];
        else if(path.length === 1) {
          var prop = change.data.propertyPath[0];
          if(source[prop].history) getFunction(source[prop].history).data.undone = undone;
          source.obj[prop] = enrich(value, source[prop].propertyName, source[prop].parent, source[prop].handlers, source[prop].history);
        }
        else if(path.length === 0) {
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
    return true;
  };
  
  
  ///////////////////////////////////////////////////////
  // Prototype helpers
  ///////////////////////////////////////////////////////
  
  EnrichedObject.prototype.deactivate = function(prop) {
    for(var i = this.history.length - 1; i >= 0; i--) {
      var data = this.history[i];
      var rootProp = data.propertyPath[data.propertyPath.length - 1];
      
      var check = true;
      if(prop) check = rootProp === prop;
      
      if(check && data.undone && data.active) {
        data.active = false;
        var source = this;
        var upstreamIndex = data.upstreamIndex;
        while(source.parent) {
          source = source.parent;
          source.history[upstreamIndex].active = false;
          upstreamIndex = source.history[upstreamIndex].upstreamIndex;
        }
        enrich.globalHistory[upstreamIndex].active = false;
      }
    }
  };
  
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
        this.obj[prop] = value;
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
  
  function jsonEquality(obj1, obj2) {
    if(JSON.stringify(obj1) === JSON.stringify(obj2)) return true; //bad comparison practice???
    return false;
  }

  return enrich;
}));