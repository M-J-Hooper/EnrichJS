!function(t){"object"==typeof exports?module.exports=t():this.enrich=t()}(function(){"use strict";function t(t,r,e,o,n){r&&!this.propertyName&&Object.defineProperty(this,"propertyName",{value:r}),e&&!this.parent&&Object.defineProperty(this,"parent",{writable:!0,value:e}),Object.defineProperty(this,"handlers",{writable:!0,value:o||{}}),Object.defineProperty(this,"history",{writable:!0,value:n||[]}),Object.defineProperty(this,"obj",{writable:!0,value:new t.constructor});for(var a in t)this.obj[a]=i(t[a],a,this,t[a].handlers,t[a].history),Object.defineProperty(this,a,{enumerable:!0,configurable:!0,set:this.setterFactory(a),get:this.getterFactory(a)});for(var s=Object.getOwnPropertyNames(t),h=0;h<s.length;h++)this[s[h]]||Object.defineProperty(this,s[h],{configurable:!0,set:this.setterFactory(s[h]),get:this.getterFactory(s[h])});for(s=Object.getOwnPropertyNames(t.constructor.prototype),h=0;h<s.length;h++)!this[s[h]]&&t.constructor.prototype[s[h]]&&t.constructor.prototype[s[h]].constructor===Function&&Object.defineProperty(this,s[h],{value:this.modifierFactory(s[h])})}function r(t){for(var r={},e=t.length-1;e>=0;e--){var o=t[e];if(o.active&&!o.undone)return r.data=o,r.index=e,r}}function e(t){for(var r={},e=0;e<t.length;e++){var o=t[e];if(o.active&&o.undone)return r.data=o,r.index=e,r}}function o(t){for(var r=[],e=0;e<t.length;e++){var o=t[e];o.undone&&o.active&&(o.active=!1),r.push(o)}return r}function n(t,r){return JSON.stringify(t)===JSON.stringify(r)}var i=function(r,e,o,n,i){var a=r.constructor===Object,s=r.constructor===Array;return r.enriched?r:a||s?new t(r,e,o,n,i):r};return i.globalHistory=[],i.undo=function(){var t=r(i.globalHistory);return t?t.data.source.undo():console.log("Nothing to undo"),this},i.redo=function(){var t=e(i.globalHistory);return t?t.data.source.redo():console.log("Nothing to redo"),this},t.prototype.enriched=!0,t.prototype.on=function(t,r){return this.handlers[t]||(this.handlers[t]=[]),this.handlers[t].push(r),this},t.prototype.emit=function(t,r){var e,n=this.handlers[t];if(n)for(e=0;e<n.length;e++)n[e](r);var a={};for(var s in r)a[s]=r[s];if("change"===t){for(a.propertyPath=[],e=0;e<r.propertyPath.length;e++)a.propertyPath[e]=r.propertyPath[e];if(r.undone=!1,r.active=!0,this.parent)r.upstreamIndex=this.parent.history.length;else{r.upstreamIndex=i.globalHistory.length;var h={source:this,undone:!1,active:!0};i.history=o(i.globalHistory),i.globalHistory.push(h)}this.history=o(this.history),this.history.push(r),this.propertyName&&a.propertyPath.push(this.propertyName)}return this.parent&&this.parent.emit(t,a),this},t.prototype.undo=function(){var t=this.unredo(!0,r);return t?this.emit("undo",t):console.log("Nothing to undo"),this},t.prototype.redo=function(){var t=this.unredo(!1,e);return t?this.emit("redo",t):console.log("Nothing to redo"),this},t.prototype.unredo=function(r,e){var o,n,a,s=this,h=!0;do{var p=e(s.history);if(!p)return!1;if(h){n=p.index,h=!1,a={};for(var u in p.data)a[u]=p.data[u]}p.data.undone=r;var y=r?p.data.oldValue:p.data.newValue;if((o=p.data.propertyPath).length>1)s=s[o[o.length-1]];else if(1===o.length){var l=p.data.propertyPath[0];s[l].history&&s[l].history.length&&(e(s[l].history).data.undone=r),s.obj[l]=i(y,s[l].propertyName,s[l].parent,s[l].handlers,s[l].history)}else 0===o.length&&t.call(s,y,s.propertyName,s.parent,s.handlers,s.history)}while(o.length>1);for(var c=(s=this).history[n].upstreamIndex;s.parent;)(s=s.parent).history[c].undone=r,c=s.history[c].upstreamIndex;return i.globalHistory[c].undone=r,a},t.prototype.modifierFactory=function(r){return function(){var e=new this.obj.constructor;for(var o in this.obj)e[o]=this.obj[o];var i=this.obj.constructor.prototype[r].apply(this.obj,arguments),a={propertyPath:[],oldValue:e,newValue:this.obj};return n(a.oldValue,a.newValue)||(t.call(this,this.obj,this.propertyName,this.parent,this.handlers,this.history),this.emit("change",a)),i}},t.prototype.setterFactory=function(t){return function(r){var e={propertyPath:[t],oldValue:this.obj[t],newValue:r};n(e.oldValue,e.newValue)||(this.obj[t]=i(r),this.emit("change",e))}},t.prototype.getterFactory=function(t){return function(){return this.obj[t]}},t.prototype.followPropertyPath=function(t){for(var r=this,e=t.length-1;e>=0;e--)r=r[t[e]];return r},t.prototype.stringFromChangeEvent=function(t,r){for(var e=r||this.propertyName||"this",o=t.propertyPath.length-1;o>=0;o--)isNaN(t.propertyPath[o])?e+="."+t.propertyPath[o]:e+="["+t.propertyPath[o]+"]";return e+=" changed from "+JSON.stringify(t.oldValue),e+=" to "+JSON.stringify(t.newValue)},t.prototype.stringFromUndoEvent=function(t,r){for(var e=r||this.propertyName||"this",o=t.propertyPath.length-1;o>=0;o--)isNaN(t.propertyPath[o])?e+="."+t.propertyPath[o]:e+="["+t.propertyPath[o]+"]";return e+=" undone from "+JSON.stringify(t.newValue),e+=" to "+JSON.stringify(t.oldValue)},t.prototype.stringFromRedoEvent=function(t,r){for(var e=r||this.propertyName||"this",o=t.propertyPath.length-1;o>=0;o--)isNaN(t.propertyPath[o])?e+="."+t.propertyPath[o]:e+="["+t.propertyPath[o]+"]";return e+=" redone from "+JSON.stringify(t.oldValue),e+=" to "+JSON.stringify(t.newValue)},t.prototype.revert=function(){var t=new this.obj.constructor;for(var r in this.obj)this.obj[r].revert?t[r]=this.obj[r].revert():t[r]=this.obj[r];return t},i});