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

  function enrich(thing, name, parent) {
    var isObject = thing.constructor === Object;
    var isArray = thing.constructor === Array;
    
    if (thing.enriched) return thing;
    if (isObject) return new EnrichedObject(thing, name, parent);
    if (isArray) return new EnrichedArray(thing, name, parent);
    return thing;
  }

  function Enriched() {}
  Enriched.prototype.enriched = true;
  Enriched.prototype.on = function (event, fn) {
    if(!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(fn);
    return this;
  };
  Enriched.prototype.emit = function (event, data) {
    var eventHandlers = this.handlers[event];
    if(eventHandlers) {
      for(var i = 0; i < eventHandlers.length; i++) {
        data.source = this;
        eventHandlers[i](data);
      }
    }
    console.log(JSON.stringify(data));
    if(this.name) data.propertyPath.push(this.name);
    if(this.parent) this.parent.emit(event, data);
    return this;
  };



  //////////////////////////////////////////////
  // EnrichedObject
  //////////////////////////////////////////////

  function EnrichedObject(obj, name, parent) {
    if (name && !this.name) {
      Object.defineProperty(this, 'name', {
        value: name
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

    for (var prop in obj) {
      var isObject = obj[prop].constructor === Object;
      var isArray = obj[prop].constructor === Array;
      Object.defineProperty(this, '_' + prop, {
        writable: true,
        value: (isObject || isArray) ? enrich(obj[prop], prop, this) : obj[prop],
      });
      Object.defineProperty(this, prop, {
        enumerable: true,
        configurable: true,
        get: this.getterFactory(prop),
        set: this.setterFactory(prop),
      });
    }

    this.on('change', function (data) {
      console.log('Property changed: ' + data.propertyPath);
    });
  }
  EnrichedObject.prototype = Object.create(Enriched.prototype);
  EnrichedObject.prototype.constructor = EnrichedObject;

  EnrichedObject.prototype.getterFactory = function (prop) {
    return function () {
      return this['_' + prop];
    };
  };

  EnrichedObject.prototype.setterFactory = function (prop) {
    return function (value) {
      var data = {
        propertyPath: [prop],
        oldValue: this['_' + prop],
        newValue: value
      };
      this.emit('change', data);
      this['_' + prop] = value;
    };
  };



  //////////////////////////////////////////////
  // EnrichedArray
  //////////////////////////////////////////////

  function EnrichedArray(array, name, parent) {
    if (name && !this.name) {
      Object.defineProperty(this, 'name', {
        value: name
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

    Object.defineProperty(this, '_array', {
      writable: true,
      value: [],
    });
    for(var i = 0; i < array.length; i++) {
      var isObject = array[i].constructor === Object;
      var isArray = array[i].constructor === Array;
      this._array[i] = (isObject || isArray) ? enrich(array[i], i, this) : array[i];
    }

    for (var i = 0; i < this._array.length; i++) {
      Object.defineProperty(this, i, {
        enumerable: true,
        configurable: true,
        set: this.setterFactory(i),
        get: this.getterFactory(i)
      });
    }

    if (!this.length) {
      Object.defineProperty(this, 'length', {
        get: function () {
          return this._array.length;
        },
        set: function() {
          throw new Error('Cannot set length property.');
        }
      });
    }

    this.on('change', function (data) {
      console.log('Index changed: ' + data.propertyPath);
    });
  }
  EnrichedArray.prototype = Object.create(Enriched.prototype);
  EnrichedArray.prototype.constructor = EnrichedArray;

  Object.getOwnPropertyNames(Array.prototype).forEach(function(prop) {
    if(Array.prototype[prop].constructor === Function) {
      EnrichedArray.prototype[prop] = function () {
        var newArray = [];
        for(var i = 0; i < this._array.length; i++) newArray.push(this._array[i]);
        var returnValue = Array.prototype[prop].apply(newArray, arguments);
        if(newArray.join(',') !== this._array.join(',')) {
          var data = {
            propertyPath: [],
            oldValue: this._array,
            newValue: newArray
          };
          this.emit('change', data);
          EnrichedArray.call(this, newArray); //will all handlers disappear???
        }
        return returnValue;
      };
    }
  });

  EnrichedArray.prototype.setterFactory = function(index) {
    return function(value) {
      var data = {
        propertyPath: [index],
        oldValue: this._array[index],
        newValue: value
      };
      this.emit('change', data);
      this._array[index] = value;
    };
  };

  EnrichedArray.prototype.getterFactory = function(index) {
    return function() {
      return this._array[index];
    };
  };

  return enrich;
}));
