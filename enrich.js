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
  // Library root function
  //////////////////////////////////////////////

  function enrich(thing, name, parent) {
    var isObject = thing.constructor === Object;
    var isArray = thing.constructor === Array;

    if (isObject) return new EnrichedObject(thing, name, parent);
    else if (isArray) return new EnrichedArray(thing, name, parent);
    else return thing;
  }



  //////////////////////////////////////////////
  // EnrichedObject
  //////////////////////////////////////////////

  function EnrichedObject(obj, name, parent) {
    if (obj.enriched) return obj;
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

    this.on('change', function (prop) {
      console.log('Property changed: ' + prop);
    });
  }
  EnrichedObject.prototype.enriched = true;

  EnrichedObject.prototype.getterFactory = function (prop) {
    return function () {
      return this['_' + prop];
    };
  };

  EnrichedObject.prototype.setterFactory = function (prop) {
    return function (value) {
      this.emit('change', prop);
      if(this.parent) this.parent.emit('change', this.name);
      this['_' + prop] = value;
    };
  };

  EnrichedObject.prototype.on = on;
  EnrichedObject.prototype.emit = emit;



  //////////////////////////////////////////////
  // EnrichedArray
  //////////////////////////////////////////////

  function EnrichedArray(array, name, parent) {
    if (array.enriched) return array;
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

    this.on('change', function (index) {
      console.log('Index changed: ' + index);
    });
  }
  EnrichedArray.prototype.enriched = true;

  Object.getOwnPropertyNames(Array.prototype).forEach(function(prop) {
    if(Array.prototype[prop].constructor === Function) {
      EnrichedArray.prototype[prop] = function () {
        var newArray = Array.prototype[prop].apply(this._array, arguments);
        var isArray = newArray.constructor === Array;
        if(this.parent) this.parent.emit('change', this.name);
        EnrichedArray.call(this, isArray ? newArray : this._array);
      };
    }
  });

  EnrichedArray.prototype.setterFactory = function(index) {
    return function(value) {
      this.emit('change', index);
      if(this.parent) this.parent.emit('change', this.name);
      this._array[index] = value;
    };
  };

  EnrichedArray.prototype.getterFactory = function(index) {
    return function() {
      return this._array[index];
    };
  };

  EnrichedArray.prototype.on = on;
  EnrichedArray.prototype.emit = emit;



  //////////////////////////////////////////////
  // Common functions
  //////////////////////////////////////////////

  function on(event, fn) {
    if(!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(fn);
  }

  function emit(event) {
    var eventHandlers = this.handlers[event];
    if(eventHandlers) {
      var args = Array.prototype.slice.call(arguments, 1);
      for(var i = 0; i < eventHandlers.length; i++) {
        eventHandlers[i].apply(null, args);
      }
    }
  }

  return enrich;
}));
