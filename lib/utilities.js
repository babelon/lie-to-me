
function randInt (offset, l) {
  if (!l) { l = offset; offset = 0; }
  return offset + Math.floor( Math.random() * l );
}
exports.randInt = randInt;

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

exports.modelToBag = function(model) {
  // HACK
  var bag = {};
  Object.keys(model.schema.paths).forEach(function(path) {
    bag[path] = this[path];
  }, model);
  Object.keys(model.schema.virtuals).forEach(function(path) {
    bag[path] = this[path];
  }, model);
  return bag;
};
