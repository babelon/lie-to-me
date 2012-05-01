
exports.pickOne = function(arrayLike) {
  var i, l;
  l = arrayLike.length;
  i = Math.floor( Math.random() * l );
  return arrayLike[i];
};
