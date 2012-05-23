
var path, async, Mongoose, Fragment, Entity, Person, Vote, Facebook, wordlimit;

path = require('path');

_ = require('underscore');
async = require('async');
Mongoose = require('mongoose');

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

Utilities = require( path.resolve( __dirname, '../lib/utilities') );

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

wordlimit = 20;

function quit () {
  Mongoose.disconnect();
  process.exit(0);
}

function rmthem () {
  Fragment.find({})
  .run(function(err, fragments) {
    if (err) { console.error(err); return; quit(); }
    var todeletefragments = [];
    var todeletevotes = [];
    async.forEachSeries(fragments, function(fragment, next) {
      if ( Utilities.countWords(fragment.text) < wordlimit) {
        todeletefragments.push(fragment._id);
        Vote.find({ fragment: fragment._id }, function(err, votes) {
          if (err) { console.error(err); return; }
          Array.prototype.push.apply(todeletevotes, votes.map(function(v) { return v._id; }));
          next();
        });
      } else {
        next();
      }
    }, function(err) {
      if (err) { console.error(err); return; quit(); }
      console.log('fragments to delete:', todeletefragments.length);
      Fragment.remove({ _id: { '$in': todeletefragments }}, function(err) {
        if (err) { console.error(err); }
        console.log('votes to delete:', todeletevotes.length);
        Vote.remove({ _id: { '$in': todeletevotes }}, function(err) {
          if (err) { console.error(err); }
          quit();
        })
      });
    });
  });
}

if (require.main === module) {
  rmthem();
}
