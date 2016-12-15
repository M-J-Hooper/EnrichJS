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

  function enrich(obj, propertyName, parent, history) {
    var isObject = obj.constructor === Object;
    var isArray = obj.constructor === Array;

    if (obj.enriched) return obj;
    if(isObject || isArray) return new EnrichedObject(obj, propertyName, parent, history);
    return obj;
  }
  
  enrich.globalHistory = [];
  enrich.globalHistory.pointer = -1;

  
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
    if(!this.history.pointer) this.history.pointer = -1;

    Object.defineProperty(this, 'obj', {
      writable: true,
      value: new obj.constructor()
    });

    for(var prop in obj) {
      this.obj[prop] = enrich(obj[prop], prop, this);
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
    for(var i = 0; i < props.length; i++) {
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
    var shallowData = JSON.parse(JSON.stringify(data)); //bad copy practice???
    var eventHandlers = this.handlers[event];
    if(eventHandlers) {
      for(var i = 0; i < eventHandlers.length; i++) eventHandlers[i](shallowData);
    }
    if(event === 'change') {
      this.history.push(shallowData);
      if(!this.parent) enrich.globalHistory.push(this);
      if(this.propertyName) data.propertyPath.push(this.propertyName);
    }
    if(this.parent) this.parent.emit(event, data);
    return this;
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

  EnrichedObject.prototype.undoFromEventData = function(data) {
    var source = this;
    for(var i = data.propertyPath.length - 1; i > 0; i--) source = source[data.propertyPath[i]];
    source[data.propertyPath[i]] = data.oldValue; //should not trigger change event or at least not add to history
  };
  
  EnrichedObject.prototype.followPropertyPath = function(propertyPath) {
    var result = this;
    for(var i = propertyPath.length - 1; i >= 0; i--) result = result[propertyPath[i]];
    return result;
  };
  
  EnrichedObject.prototype.stringFromEventData = function(data) {
    var string = this.propertyName || 'this';
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
  
  function jsonEquality(obj1, obj2) {
    if(JSON.stringify(obj1) === JSON.stringify(obj2)) return true; //bad comparison practice???
    return false;
  }

  return enrich;
}));
