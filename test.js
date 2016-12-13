var enrich = require('./enrich.js');

var obj = {
  name: 'Matt',
  numbers: [2,3,5,7],
  details: {
    age: 22,
    eyes: 'blue',
    hair: 'brown'
  }
};

var enriched =  new enrich(obj);

enriched.name = 'Jack';
enriched.details.age = 42;
enriched.numbers[0] = 999;
enriched.numbers.push(1001);
enriched.numbers.shift();

console.log(JSON.stringify(enriched));
