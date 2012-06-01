
var path, async, Mongoose, Store, Fragment, Entity, Person, Vote, Facebook, operations;

path = require('path');

Underscore = require('underscore');
async = require('async');
Mongoose = require('mongoose');

Store = require('redis').createClient();

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Facebook = require( path.resolve( __dirname, '../lib/facebook') );

function quit () {
  Mongoose.disconnect();
  Store.quit();
  process.exit(0);
}

function clearLogins () {
  Store.keys('sess:*', function(err, replies) {
    if (err) { console.error(err); quit(); return; }
    async.forEachSeries(replies, function(key, next) {
      Store.del(key, next);
    }, function(err) {
      if (err) { console.error(err); quit(); return; }
      console.log('Removed all');
      quit();
    });
  });
}

function removeUser (userid) {
  if (!userid) { quit(); }
  Person.findById(userid, ['_id', 'fb_friends'], function(err, person) {
    if (err) { console.error(err); quit(); return; }
    // remove person from others' friendlists
    Person.find(
    { _id: { '$in': person.fb_friends } },
    ['_id', 'fb_friends'],
    function(err, friends) {
      if (err) { console.error(err); quit(); return; }
      async.forEachSeries(friends, function(friend, next) {
        var i = friend.fb_friends.indexOf(person._id);
        if (i >= 0) { friend.fb_friends.splice(i, 1); }
        Person.update({ _id: friend._id }, { fb_friends: friend.fb_friends }, function(err) {
          if (err) { console.error(err); }
          next();
        });
      }, function(err) {
        if (err) { console.error(err); quit(); return; }
        // remove fragments authored
        Fragment.distinct('_id', { author: person._id }, function(err, fragment_ids) {
          if (err) { console.error(err); quit(); return; }
          Fragment.remove({ author: person._id }, function(err) {
            if (err) { console.error(err); }
            // remove votes made on removed fragments
            Vote.remove({ fragment: { '$in': fragment_ids }}, function(err) {
              if (err) { console.error(err); }
              // remove votes made by person
              Vote.remove({ voter: person._id }, function(err) {
                if (err) { console.error(err); }
                // remove Person model itself
                Person.remove({ _id: person._id }, function(err) {
                  if (err) { console.error(err); }
                  quit();
                });
              });
            });
          });
        });
      });
    });
  });
}

operations = {
  clearlogins: clearLogins,
  removeuser: removeUser
};

if (require.main === module && process.argv.length >= 3 && process.argv[2] in operations) {
  operations[process.argv[2]].apply(this, process.argv.slice(3));
} else {
  console.log('usage:', process.argv[0], path.basename(process.argv[1]), '<operation>');
  console.log('valid operations:');
  console.log(Object.keys(operations));
  process.exit(0);
}
