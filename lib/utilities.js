
exports.pickOne = function(arrayLike) {
  var i, l;
  l = arrayLike.length;
  i = Math.floor( Math.random() * l );
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
};
exports.clone = clone;
