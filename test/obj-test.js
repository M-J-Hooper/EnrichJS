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

describe('Standard object behaviour', function() {
    describe('Undos and redos', function() {
        it('Undoes first level prop change', function() {
            var obj = enrich(me);
            obj.name = 'Matthew';
            expect(obj.name).to.equal('Matthew');
            obj.undo();
            expect(obj.name).to.equal('Matt');
        });
        it('Undoes nested level prop change', function() {
            var obj = enrich(me);
            obj.details.age++;
            expect(obj.details.age).to.equal(24);
            obj.undo();
            expect(obj.details.age).to.equal(23);
        });
        it('Multiple undos', function() {
            var obj = enrich(me);
            obj.name = 'Matthew';
            obj.details.age++;
            obj.details.eyes = 'X';
            obj.details.hair = 'Y';
            obj.undo().undo();
            obj.undo();
            expect(obj.name).to.equal('Matthew');
            expect(obj.details.eyes).to.equal('blue');
            expect(obj.details.age).to.equal(23);
            expect(obj.details.hair).to.equal('brown');
        });
        it('Single undo then redo', function() {
            var obj = enrich(me);
            obj.details.age++;
            expect(obj.details.age).to.equal(24);
            obj.undo();
            expect(obj.details.age).to.equal(23);
            obj.redo();
            expect(obj.details.age).to.equal(24);
        });
        it('Single undo then change to deactivate', function() {
            var obj = enrich(me);
            obj.details.age++;
            obj.undo();
            obj.name = 'Matthew';
            expect(obj.details.age).to.equal(23);
            expect(obj.history[0].active).to.equal(false);
        });
        it('Single undo then change to deactivate', function() {
            var obj = enrich(me);
            obj.details.age++;
            obj.undo();
            obj.name = 'Matthew';
            expect(obj.details.age).to.equal(23);
            expect(obj.history[0].active).to.equal(false);
        });
        it('Nested object change and undo', function() {
            var obj = enrich(me);
            obj.details = {
                age: 12,
                hair: 'black',
                eyes: 'red'
            };
            expect(obj.details.age).to.equal(12);
            obj.undo();
            expect(obj.details.hair).to.equal('brown');
        });

        //fails due to new nested object not having a history

        //   it('Nested object change then specific undo', function() {
        //       var obj = enrich(me);
        //       obj.details = {
        //           age: 12,
        //           hair: 'black',
        //           eyes: 'red'
        //       };
        //       expect(obj.details.age).to.equal(12);
        //       obj.details.undo();
        //       expect(obj.details.hair).to.equal('brown');
        //   });
        it('Undo specific branch of object out of order', function() {
            var obj = enrich(me);
            obj.details.age = 30;
            obj.name = 'Matthew';
            expect(obj.details.age).to.equal(30);
            obj.details.undo();
            expect(obj.details.age).to.equal(23);
            expect(obj.name).to.equal('Matthew');
        });
        it('Redo specific branch of object out of order', function() {
            var obj = enrich(me);
            obj.name = 'Matthew';
            obj.details.age = 30;
            expect(obj.details.age).to.equal(30);
            obj.undo().undo();
            expect(obj.name).to.equal('Matt');
            obj.details.redo();
            expect(obj.details.age).to.equal(30);
            expect(obj.name).to.equal('Matt');
        });
    });

    describe('History checks', function() {
        it('Correct top level history length', function() {
            var obj = enrich(me);
            obj.name = 'Matthew';
            obj.details.age = 30;
            obj.details.eyes = 'X';
            obj.undo().undo().redo();
            expect(obj.history).to.have.length(3);
        });
        it('Correct nested history length', function() {
            var obj = enrich(me);
            obj.name = 'Matthew';
            obj.details.age = 30;
            obj.details.eyes = 'X';
            obj.undo().undo().redo();
            expect(obj.details.history).to.have.length(2);
        });
    });
});