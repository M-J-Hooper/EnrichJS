//A working copy of the example given in the README

var enrich = require('./enrich.js');

var obj = {
  name: 'Matt',
  details: {
    age: 22,
    eyes: 'blue',
    hair: 'brown'
  }
};

obj = enrich(obj);

obj.on('change', function (data) {
  console.log(obj.stringFromChangeEvent(data));
});
obj.on('undo', function (data) {
  console.log(obj.stringFromUndoEvent(data));
});
obj.on('redo', function (data) {
  console.log(obj.stringFromRedoEvent(data));
});


obj.name = 'Matthew';
obj.details.age++;

obj.undo().undo().redo();
