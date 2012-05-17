
var Storage, Promise, Underscore;

Storage = require('./storage');
Promise = require('./defers').Promise;

Underscore = require('underscore');

function add_points (req, res, vote, fragment) {
  var promise, key, points;
  promise = new Promise();
  if (!vote) { key = 'points_compose'; }
  else if (vote.truth === fragment.truth) {
    req.session.streak += 1;
    key = 'points_correct_guess';
  } else {
    // got the guess wrong, no points
    req.session.streak = 0;
    Underscore.defer(function() {
      promise.onward(req, res, vote, fragment);
    });
    return promise;
  }
  Storage.redis('get', key, function(err, reply) {
    if (err) { promise.stalled(req, res, err); return; }
    points = res.metastore.points;
    base_addition = Number(reply)
    points += vote ? scale_streak_points(base_addition, req.session.streak) : base_addition;
    res.metastore.points = points;
    Storage.redis('set', String(req.session.person._id) + '_points', points, function(err) {
      if (err) { promise.stalled(req, res, err); return; }
      promise.onward(req, res, vote, fragment);
    });
  });
  return promise;
}
exports.add_points = add_points;

function scale_streak_points (base, streak) {
  if (streak < 2) {
    return base;
  } else if (streak < 8) {
    return base * streak;
  }
  return base * 8;
}
