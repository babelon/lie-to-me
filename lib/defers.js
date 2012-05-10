
function Promise () {
  this.onward = function() {};
  this.stalled = function() {};
};

Promise.prototype.then = function(f) {
  if (typeof f !== 'function') { throw new TypeError("You must pass a function as the 'then' handler"); }
  this.onward = f;
};

Promise.prototype.error = function(f) {
  if (typeof f !== 'function') { throw new TypeError("You must pass a function as the 'error' handler"); }
  this.stalled = f;
};

exports.Promise = Promise;
