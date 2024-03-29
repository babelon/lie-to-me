
var Storage, Promise, Underscore;

Storage = require('./storage');
Promise = require('./defers').Promise;

Underscore = require('underscore');

function add_points (req, res, vote, fragment) {
  var promise, key, beneficiary, points;
  promise = new Promise();
  if (!vote) {
    key = 'points_compose';
    beneficiary = String(req.session.person._id) + '_points';
  } else if (vote.truth === fragment.truth) {
    req.session.streak += 1;
    key = 'points_correct_guess';
    beneficiary = String(req.session.person._id) + '_points';
  } else {
    req.session.streak = 0;
    if (!fragment.truth) {
      // got the guess wrong, deceitful fragment, points for author
      key = 'points_deceive';
      beneficiary = String(fragment.author._id) + '_points';
    } else {
      // got the guess wrong, truthful fragment, no points
      Underscore.defer(function() {
        promise.onward(req, res, vote, fragment);
      });
      return promise;
    }
  }
  Storage.redis('get', key, function(err, reply) {
    if (err) { promise.stalled(req, res, err); return; }
    base_addition = Number(reply);
    if (!vote || vote.truth === fragment.truth) {
      // benefit current user
      points = res.metastore.points;
      points += vote ? scale_streak_points(base_addition, req.session.streak) : base_addition;
      res.metastore.points = points;
      Storage.redis('set', beneficiary, points, function(err) {
        if (err) { promise.stalled(req, res, err); return; }
        promise.onward(req, res, vote, fragment);
      });
    } else {
      // benefit fragment author
      Storage.redis('incrby', beneficiary, base_addition, function(err) {
        if (err) { promise.stalled(req, res, err); return; }
        promise.onward(req, res, vote, fragment);
      });
    }
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
