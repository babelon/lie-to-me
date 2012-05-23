
function randInt (offset, l) {
  if (!l) { l = offset; offset = 0; }
  return offset + Math.floor( Math.random() * l );
}
exports.randInt = randInt;

function weightedRandInt (offset, weights) {
  if (!weights) { weights = offset; offset = 0; }
  var sum, r, i;
  sum = weights.reduce(function(a, b) { return a + b; });
  r = Math.floor( Math.random() * sum );
  for (i = 0; i < weights.length; ++i) {
    r -= weights[i];
    if (r < 0) { return offset + i; }
  }
}
exports.weightedRandInt = weightedRandInt;

exports.pickOne = function(arrayLike) {
  var i, l;
  l = arrayLike.length;
  i = randInt(l);
  return arrayLike[i];
};

exports.rangeReplicate = function(obj, attr, from, to) {
  var i, elem, r = [];
  if (!to) { to = from; from = 0; }
  for (i = from; i < to; ++i) {
    elem = clone(obj);
    elem[ attr ] = i;
    r.push(elem);
  }
  return r;
};

function clone (obj) {
  var copy = {};
  Object.keys(obj).forEach(function(k) {
    copy[k] = obj[k];
  });
  return copy;
}
exports.clone = clone;

exports.emptyFn = function() {};

function capitalize (s) {
  return s[0].toUpperCase() + s.slice(1);
}
exports.capitalize = capitalize;

function countWords (text) {
  return text.split(/\s+/).filter(function(w) { return !!w; }).length;
}
exports.countWords = countWords;

var ones, teens, tens;
ones = [ 'zero','one','two','three','four','five','six','seven','eight','nine' ];
teens = [ 'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen' ];
tens = [ '', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety' ];

exports.numberToWords = function(number) {
  if (typeof number !== 'number') { return ''; }
  var digits, words;
  digits = String(number).length;
  if ( digits > 2 ) { return String(number); }
  if (digits === 2) {
    if (number < 20) { return teens[number-10]; }
    return tens[ Math.floor( number/10 ) ] + ( number % 10 ? ' ' + ones[ number % 10 ]: '');
  }
  return ones[ number ];
};
