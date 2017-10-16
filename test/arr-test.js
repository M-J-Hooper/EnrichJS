var enrich = require('../enrich.js');
var expect = require('chai').expect;

var arrays = {
  a: [1,2,3,4,5],
  nested: {
      b: [10,20,30],
      c: [11,99,242]
  }
};

var arr = [2,4,8,16,999];

describe('Array behaviour', function() {
    describe('Arrays as props of object', function() {
       it('Changing index and then undo and redo', function() {
          var as = enrich(arrays);
          as.a[2] = 100;
          as.nested.c[0] = 5;
          expect(as.a[2]).to.equal(100);
          expect(as.nested.c[0]).to.equal(5);
          as.undo().undo().redo();
          expect(as.a[2]).to.equal(100);
          expect(as.nested.c[0]).to.equal(11);
       });
       it('Apply array method then undo and redo', function() {
          var as = enrich(arrays);
          as.a.push(6);
          expect(as.a.length).to.equal(6);
          as.a.shift();
          expect(as.a[0]).to.equal(2);
          as.undo().undo().redo();
          expect(as.a[0]).to.equal(1);
          expect(as.a[5]).to.equal(6);
       });
       it('Changing prop to array', function() {
          
       });
    });
    
    describe('Pure array objects', function() {
       it('Changing index and then undo and redo', function() {
          
       });
       it('Apply array method then undo and redo', function() {
          
       });
       it('Changing whole array', function() {
          
       });
    });
});
