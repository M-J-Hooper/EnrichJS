var enrich = require('../index.js');
var expect = require('chai').expect;

var me = {
    name: 'Matt',
    array: [
        {
            age: 23,
            eyes: 'blue',
            hair: 'brown'
        },
        'Stuff'
    ]
};

var arr = [
    1, 2, 3,
    {
        stuff: 'Stuff',
        other: 'Other'
    }
];

describe('Miscellaneous behaviour', function() {
    describe('Reverting', function() {
        it('Revert enriched object to unenriched object after changes/undos/redos', function() {
            var obj = enrich(me);
            obj.name = 'Matthew';
            obj.array[0].age++;
            obj.array.push('More stuff');
            obj.undo().undo().redo();
            var reverted = obj.revert();
            expect(reverted.name).to.equal('Matthew');
            expect(reverted.array[0].age).to.equal(24);
            expect(reverted.constructor).to.not.equal(enrich({}).constructor);
            expect(reverted.array.constructor).to.equal([].constructor);
            expect(reverted.array[0].constructor).to.not.equal(enrich({}).constructor);
        });
        it('Revert enriched array to unenriched array after methods/undos/redos', function() {
            var a = enrich(arr);
            a.push(99);
            a.push(100);
            a.shift();
            a.undo().undo().redo();
            var reverted = a.revert();
            expect(reverted).to.have.length(6);
            expect(reverted.constructor).to.equal([].constructor);
            expect(reverted[3].constructor).to.not.equal(enrich({}).constructor);
        });
    });
    
    describe('Undo/redo events', function() {
        it('Event propagate to parents', function() {
            var obj = enrich(me);
            var x = 0;
            obj.on('undo', function() { x++; });
            obj.on('redo', function() { x++; });
            
            obj.name = 'Matthew';
            obj.array[0].age++;
            obj.undo().redo();
            expect(x).to.equal(2);
        });
        it('Events can be disabled', function() {
            var obj = enrich(me);
            var x = 0;
            obj.on('undo', function() { x++; });
            obj.on('redo', function() { x++; });
            
            obj.name = 'Matthew';
            obj.array[0].age++;
            obj.undo(true).undo(false).redo(false);
            expect(x).to.equal(1);
            expect(obj.name).to.equal('Matthew');
            expect(obj.array[0].age).to.equal(23);
        });
    });
    
    describe('Changes using the change function', function() {
        it('Changes are included correctly', function() {
            var obj = enrich(me);
            var changeData = {
                propertyPath: ['age', '0', 'array'],
                oldValue: 23,
                newValue: 99,
            };
            obj.change(changeData);
            expect(obj.array[0].age).to.equal(99);
        });
        it('Change event not emitted', function() {
            var obj = enrich(me);
            var x = 0;
            obj.on('change', function() { x++; });
            var changeData = {
                propertyPath: ['age', '0', 'array'],
                oldValue: 23,
                newValue: 99,
            };
            obj.change(changeData);
            expect(x).to.equal(0);
        });
        it('Histories upstream and down are correct', function() {
            var obj = enrich(me);
            var changeData = {
                propertyPath: ['age', '0', 'array'],
                oldValue: 23,
                newValue: 99,
            };
            obj.change(changeData);
            expect(obj.array[0].age).to.equal(99);
            
            changeData = {
                propertyPath: ['age', '0'],
                oldValue: 99,
                newValue: 1,
            };
            obj.array.change(changeData);
            expect(obj.array[0].age).to.equal(1);
            
            changeData = {
                propertyPath: ['age'],
                oldValue: 1,
                newValue: 2,
            };
            obj.array[0].change(changeData);
            expect(obj.array[0].age).to.equal(2);
            
            
            expect(obj.history).to.have.length(3);
            expect(obj.array.history).to.have.length(3);
            expect(obj.array[0].history).to.have.length(3);
        });
    });
    
    //enrich a custom object with custom modifying methods
    
    //adding and deleting extra properties
});