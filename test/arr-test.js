var enrich = require('../enrich.js');
var expect = require('chai').expect;

var arrays = {
    a: [1, 2, 3, 4, 5],
    nested: {
        b: [10, 20, 30],
        c: [11, 99, 242]
    }
};

var arr = [2, 4, 8, 16, 999];

describe('Array behaviour', function() {
    describe('Arrays as props of standard objects', function() {
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
            expect(as.a).to.have.length(6);
            as.a.shift();
            expect(as.a[0]).to.equal(2);
            as.undo().undo().redo();
            expect(as.a[0]).to.equal(1);
            expect(as.a[5]).to.equal(6);
        });

        //would fail due to new nested object not having a history

        //   it('Changing prop to new array', function() {

        //   });
    });

    describe('Pure array objects', function() {
        it('Changing index and then undo and redo', function() {
            var a = enrich(arr);
            a[2] = 100;
            a[0] = 5;
            expect(a[2]).to.equal(100);
            expect(a[0]).to.equal(5);
            a.undo().undo().redo();
            expect(a[2]).to.equal(100);
            expect(a[0]).to.equal(2);
        });
        it('Apply array method then undo and redo', function() {
            var a = enrich(arr);
            a.push(6);
            expect(a).to.have.length(6);
            a.shift();
            expect(a[0]).to.equal(4);
            a.undo().undo().redo();
            expect(a[0]).to.equal(2);
            expect(a[5]).to.equal(6);
        });

        //could not work as there can be no setter or getter for top level variable

        //   it('Changing whole array', function() {

        //   });

        it('Standard objects as array entries behave correctly', function() {
            var a = enrich(arr);
            var entry = {
                num: 23,
                stuff: 'Stuff',
                b: [1, 2, 3, 4]
            };
            a.push(entry);
            a.push({
                yay: 'Yay'
            });
            a.undo();
            expect(a).to.have.length(6);
            a[5].num++;
            a[5].b.push(5);
            a.undo().undo().redo();
            expect(a[5].num).to.equal(24);
        });
    });
});