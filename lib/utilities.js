
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
