
var Storage, Promise;

Storage = require('./storage');
Promise = require('./defers').Promise;

function fetch_points_middleware (req, res, next) {
  res.metastore = res.metastore || {};
  if (!req.session.person) { next(); return; }
  Storage.redis('get', String(req.session.person._id) + '_points', function(err, reply) {
    if (err) { next(); return; }
    res.metastore.points = Number(reply);
    next();
  });
}
exports.fetch_points_middleware = fetch_points_middleware;

function add_points (req, res, vote, fragment) {
  var promise, key, points;
  promise = new Promise();
  if (vote && vote.truth === fragment.truth) { key = 'points_correct_guess' }
  else { key = 'points_compose' }
  Storage.redis('get', key, function(err, reply) {
    if (err) { promise.stalled(req, res, err); return; }
    points = res.metastore.points;
    points += Number(reply);
    res.metastore.points = points;
    Storage.redis('set', String(req.session.person._id) + '_points', points, function(err) {
      if (err) { promise.stalled(req, res, err); return; }
      promise.onward(req, res, vote, fragment);
    });
  });
  return promise;
}
exports.add_points = add_points;
