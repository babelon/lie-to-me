var path, async, Mongoose, Fragment, Entity, Person, Vote, Store;

path = require('path');

_ = require('underscore');
async = require('async');
Mongoose = require('mongoose');

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

Store = require('redis').createClient();

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

function done () {
  Mongoose.disconnect();
  Store.quit();
}

function clearPoints (callback) {
  Store.keys('*_points', function(err, replies) {
    if (err) { console.error(err); return; }
    async.forEachSeries(replies, function(point, next) {
      Store.del(point, next);
    }, function(err) {
      if (err) { console.error(err); return; }
      callback();
    });
  });
}

function addUpPoints () {
  Person.find({}, ['id', 'first_name', 'last_name'], function(err, people) {
    if (err) { console.error(err); done(); return; }
    async.forEachSeries(people, function(person, next) {
      var points = 0;
      // find all correct guesses
      Vote.find({ voter: person._id })
      .populate('fragment')
      .run(function(err, votes) {
        if (err) { console.error(err); done(); return; }
        var correct = votes.filter(function(v) {
          return v.truth === v.fragment.truth;
        });
        Store.get('points_correct_guess', function(err, reply) {
          if (err) { console.error(err); done(); return; }
          points += correct.length * Number(reply);
          // find all fragments made
          Fragment.count({ author: person._id }, function(err, numfragments) {
            if (err) { console.error(err); done(); return; }
            Store.get('points_compose', function(err, reply) {
              if (err) { console.error(err); done(); return; }
              points += numfragments * Number(reply);
              Store.set(String(person._id) + '_points', points, function(err) {
                if (err) { console.error(err); done(); return; }
                console.info('Populated points for:', person.name);
                next();
              });
            });
          });
        });
      });
    }, function(err) {
      console.info('Populated all points');
      done();
    });
  });
}

if (require.main === module) {
  clearPoints(addUpPoints);
}
