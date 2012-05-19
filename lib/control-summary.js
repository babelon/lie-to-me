
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

exports.summary_since_accessed = function (res, req) {
  var promise, query, id_fragments_map, guesses;
  promise = new Promise();
  Fragment.find({ author: req.session.person._id }, [ '_id', 'entity' ])
  .populate('entity')
  .exec(function(err, fragments) {
    if (err) { promise.stalled(req, res, 'distinct db error', err); return; }
    id_entities_map = {};
    fragments.forEach(function(f) { id_fragments_map[ f._id ] = f; });
    fragment_ids = fragments.map(function(f) { return f._id; });
    Vote.find({
      time: { '$gt': res.metastore.access },      // since last accessed
      fragment: { '$in': fragment_ids }           // on fragment composed by person
    })
    .populate('voter')
    .limit( maxsummary )
    .exec(function(err, votes) {
      if (err) { promise.stalled(req, res, 'db votes error', err); return; }
      if (!votes || !votes.length) { promise.onward(req, req); return; }
      fs.readFile( 'views/summary.html', function(err, contents) {
        if (err) { promise.stalled(req, res, 'fs readFile error', err); return; }
        parts = votes.map(function(vote) {
          return {
            entity: id_fragments_map[ vote.fragment ].entity.html_snippet,
            voter: vote.voter.html_snippet,
            pronoun: Utilities.capitalize( vote.voter.pronoun ),
            picture: vote.voter.picture('square')
          };
        });
        fetch_summaries(parts, function(err, summaries) {
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

function fetch_summaries (parts, callback) {
  // body...
}
