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

  //////////////////////////////////////////////
  // Library root function and base enriched constructor
  //////////////////////////////////////////////

  function enrich(obj, propertyName, parent) {
    var isObject = obj.constructor === Object;
    var isArray = obj.constructor === Array;

    if (obj.enriched) return obj;
    if(isObject || isArray) return new EnrichedObject(obj, propertyName, parent);
    return obj;
  }

  function EnrichedObject(obj, propertyName, parent) {
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
      value: {}
    });

    var emptyObj = (obj.constructor === Array) ? [] : {};
    Object.defineProperty(this, 'obj', {
      writable: true,
      value: emptyObj,
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

    this.on('change', function (data) {
      console.log('Changed: ' + data.propertyPath);
    });
  }

  EnrichedObject.prototype.enriched = true;
  EnrichedObject.prototype.on = function (event, fn) {
    if(!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(fn);
    return this;
  };
  EnrichedObject.prototype.emit = function (event, data) {
    var eventHandlers = this.handlers[event];
    if(eventHandlers) {
      for(var i = 0; i < eventHandlers.length; i++) {
        eventHandlers[i](data);
      }
    }
    console.log(JSON.stringify(data));
    if(this.propertyName) data.propertyPath.push(this.propertyName);
    if(this.parent) this.parent.emit(event, data);
    return this;
  };

  EnrichedObject.prototype.modifierFactory = function(prop){
    return function () {
      var oldValue = (this.obj.constructor === Array) ? [] : {};
      for(var p in this.obj) oldValue[p] = this.obj[p];

      var returnValue = this.obj.constructor.prototype[prop].apply(this.obj, arguments);
      var data = {
        propertyPath: [],
        oldValue: oldValue,
        newValue: this.obj
      };
      EnrichedObject.call(this, this.obj); //will all handlers disappear???
      this.emit('change', data);
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
      this.obj[prop] = value;
      this.emit('change', data);
    };
  };

  EnrichedObject.prototype.getterFactory = function(prop) {
    return function() {
      return this.obj[prop];
    };
  };

  return enrich;
}));
