var enrich = require('../enrich.js');
var expect = require('chai').expect;

var me = {
  name: 'Matt',
  details: {
    age: 23,
    eyes: 'blue',
    hair: 'brown'
  }
};

var arr = [2,4,8,16,999];

describe('Event behaviour', function() {
    describe('Standard objects', function() {
       it('Assign a custom event handler then emit event', function() {
          var obj = enrich(me);
          var x = 0;
          obj.on('test', function() {
              x++;
          });
          obj.emit('test');
          expect(x).to.equal(1);
          obj.emit('test').emit('test');
          expect(x).to.equal(3);
       });
       it('Events propagates correctly up through parents', function() {
          var obj = enrich(me);
          var x = 4;
          obj.on('test', function() {
              x--;
          });
          obj.details.emit('test').emit('test');
          expect(x).to.equal(2);
          obj.emit('test');
          expect(x).to.equal(1);
       });
       it('Change event handled correctly with undos and redos', function() {
          var obj = enrich(me);
          var x = 0;
          obj.on('change', function() {
              x++;
          });
          obj.name = 'Matthew';
          expect(x).to.equal(1);
          obj.details.age++;
          obj.details.eyes = 'X';
          obj.undo().undo().redo();
          expect(x).to.equal(3);
       });
    });
    
    describe('Array objects', function() {
       it('Change event handled correctly with undos and redos', function() {
          var a = enrich(arr);
          var x = 4;
          a.on('change', function() {
              x--;
          });
          a[0] = 222;
          expect(x).to.equal(3);
          a.push(1000);
          a.push(1001);
          a.undo().undo().redo();
          expect(x).to.equal(1);
       });
    });
});
