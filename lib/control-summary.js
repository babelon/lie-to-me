
var fs, Mongoose, Mustache, Fragment, Entity, Person, Vote, Storage, Utilities, Debug, Promise, Reaction, maxsummary;

fs = require('fs');

Mongoose = require('mongoose');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Storage = require('./storage');
Utilities = require('./utilities');
Debug = require('./debug');
Promise = require('./defers').Promise;

maxsummary = 10;

exports.since_accessed = function (req, res) {
  var promise, query, id_fragments_map, guesses;
  promise = new Promise();
  Fragment.find({ author: req.session.person._id }, [ '_id', 'entity', 'truth' ])
  .populate('entity')
  .exec(function(err, fragments) {
    if (err) { promise.stalled(req, res, 'distinct db error', err); return; }
    id_fragments_map = {};
    fragments.forEach(function(f) { id_fragments_map[ f._id ] = f; });
    fragment_ids = fragments.map(function(f) { return f._id; });
    Vote.find({
      time: { '$gt': res.metastore.access },      // since last accessed
      fragment: { '$in': fragment_ids }           // on fragment composed by person
    })
    .populate('voter')
    .sort('time', '-1')
    .limit( maxsummary )
    .exec(function(err, votes) {
      if (err) { promise.stalled(req, res, 'db votes error', err); return; }
      if (!votes || !votes.length) { promise.onward(req, res); return; }
      fs.readFile( 'views/summary.html', function(err, contents) {
        if (err) { promise.stalled(req, res, 'fs readFile error', err); return; }
        fetch_summaries(votes, id_fragments_map, function(err, summaries) {
          if (err) { promise.stalled(req, res, 'redis fetches error', err); return; }
          res.send(Mustache.to_html( String(contents), {
            summaries: summaries,
            person: req.session.person,
            points: res.metastore.points,
            streak: req.session.streak < 2 ? false : req.session.streak
          }) );
        });
      });
    });
  });
  return promise;
};

function fetch_summaries (votes, id_fragments_map, callback) {
  var fetches, leaders, successes, failures, summaries;
  fetches = Storage.redis('multi');
  fetches.smembers('leaders_summary');
  fetches.smembers('notification_success');
  fetches.smembers('notification_failure');
  fetches.exec(function(err, replies) {
    if (err) { callback(err, null); return; }
    leaders = replies[0];
    successes = replies[1];
    failures = replies[2];
    summaries = votes.map(function(v) {
      successful = v.truth !== id_fragments_map[ v.fragment ].truth;
      return {
        feedback: successful ? 'success': 'failure',
        leader: Utilities.pickOne(leaders),
        text: Mustache.to_html( Utilities.pickOne(successful ? successes: failures), {
          entity: id_fragments_map[ v.fragment ].entity.html_snippet,
          voter: v.voter.html_snippet,
          pronoun: Utilities.capitalize( v.voter.pronoun )
        }),
        picture: v.voter.picture('square')
      };
    });
    callback(null, summaries);
  });
}
