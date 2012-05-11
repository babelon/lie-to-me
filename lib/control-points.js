
var Storage, Promise;

Storage = require('./storage');
Promise = require('./defers').Promise;

function add_points (req, res, vote, fragment) {
  var promise, fetches, points;
  promise = new Promise();
  fetches = Storage.redis('multi');
  fetches.get( String(req.session.person._id) + '_points' );
  if (vote && vote.truth === fragment.truth) { fetches.get( 'points_correct_guess' ); }
  else { fetches.get( 'points_compose' ); }
  fetches.exec(function(err, replies) {
    if (err) { promise.stalled(req, res, err); return; }
    points = Number(replies[0]);
    if (replies.length > 1) { points += Number(replies[1]); }
    res.metastore.points = points;
    Storage.redis('set', String(req.session.person._id) + '_points', points, function(err) {
      if (err) { promise.stalled(req, res, err); return; }
      promise.onward(req, res, vote, fragment);
    });
  });
  return promise;
}
exports.add_points = add_points;
