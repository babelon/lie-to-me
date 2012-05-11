
function Promise () {
  this.continuations = [];
  this.contexts = [];
  this.stalled = function() {};
};

Promise.prototype.then = function(f, c) {
  if (typeof f !== 'function') { throw new TypeError("You must pass a function as the 'then' handler"); }
  this.continuations.push(f);
  this.contexts.push(c || this);
};

Promise.prototype.error = function(f) {
  if (typeof f !== 'function') { throw new TypeError("You must pass a function as the 'error' handler"); }
  this.stalled = f;
};

/**
  God, this is beautiful.
  If you add a promise followon using .then(),
  the next .then() will be invoked after
  it finishes
*/
Promise.prototype.onward = function onward() {
  var next, c, ret;
  if (!this.continuations.length) { return; }
  next = this.continuations.shift();
  c = this.contexts.shift();
  ret = next.apply(c, arguments);
  if (ret instanceof Promise) {
    ret.then(this.onward, this);
  }
};

exports.Promise = Promise;
