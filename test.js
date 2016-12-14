var enrich = require('./enrich.js');

function test(obj) {
  obj.name = 'Jack';
  obj.details.age = 42;
  obj.numbers[0] = 999;
  obj.numbers.push(100);
  obj.numbers.shift();
  for(var i = 0; i < obj.numbers.length; i++) {
    obj.numbers[i] *= 2;
  }
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
var enriched =  new enrich(obj);

console.time('Original');
test(obj);
console.timeEnd('Original');
console.log(JSON.stringify(obj));

console.log('');

console.time('Enriched');
test(enriched);
console.timeEnd('Enriched');
console.log(JSON.stringify(enriched));

console.log(enriched.numbers.concat(enriched.numbers.obj));
