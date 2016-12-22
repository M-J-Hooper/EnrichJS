var enrich = require('./enrich.js');

function test(obj) {
  obj.name = 'Jack';
  // obj.details.age = 42;
  // obj.numbers[0] = 999;
  // obj.numbers.push(100);
  // obj.numbers.shift();
  // for(var i = 0; i < obj.numbers.length; i++) {
  //   obj.numbers[i] *= 2;
  // }
}

var obj = {
  name: 'Matt',
  numbers: [2,3,5,7, {nested: 10}],
  details: {
    age: 22,
    eyes: 'blue',
    hair: 'brown'
  }
};
var enriched =  enrich(obj);
enriched.on('change', function (data) {
  console.log(enriched.stringFromChangeEvent(data, 'Enriched'));
});

console.time('Original');
test(obj);
console.timeEnd('Original');
console.log('Original:', JSON.stringify(obj));

console.log('');

console.time('Enriched');
test(enriched);
console.timeEnd('Enriched');

enrich.undo();
enriched.name = 'Sam';
enrich.undo();
enrich.redo();
// enrich.redo();

console.log('');
console.log('Enriched:', JSON.stringify(enriched));
console.log('');
console.log('Global history:', JSON.stringify(enrich.globalHistory));
console.log('');
console.log('Enriched history:', JSON.stringify(enriched.history));
console.log('');
console.log('Enriched.numbers history:', JSON.stringify(enriched.numbers.history));