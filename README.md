# EnrichJS
A library for enriching Javascript objects and arrays with change-tracking, event, and undo/redo functionality.

For example, consider this Javascript object:
```js
var obj = {
  name: 'Matt',
  details: {
    age: 22,
    eyes: 'blue',
    hair: 'brown'
  }
};
```
This can be "enriched" to give it extra functionality:
```js
obj = enrich(obj);
```
We can add some handlers for default "change", "undo" and "redo" events, or for custom events.
Here we will add handlers for the default events and use the built-in event-to-string functions:
```js
obj.on('change', function (data) {
  console.log(obj.stringFromChangeEvent(data));
});
obj.on('undo', function (data) {
  console.log(obj.stringFromUndoEvent(data));
});
obj.on('redo', function (data) {
  console.log(obj.stringFromRedoEvent(data));
});
```
Now we can test them by making some changes and then doing a few undos and redos:
```js
obj.name = 'Matthew';
obj.details.age++;

//Console readout:
//this.name changed from "Matt" to "Matthew"
//this.details.age changed from 22 to 23

obj.undo();
obj.undo();
obj.redo();

//Console readout:
//this.details.age undone from 23 to 22
//this.name undone from "Matthew" to "Matt"
```

This was primarily created as a as a learning exercises and there are currently a few issues including errors when undoing array methods. However, I can certainly see a few useful applications in web editors and similar scenarios where there is large user input.
