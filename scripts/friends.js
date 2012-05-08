var path, async, Mongoose, facebook, Fragment, Entity, Person, Vote;

path = require('path');

_ = require('underscore');
async = require('async');
Mongoose = require('mongoose');

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

facebook = require( path.resolve( __dirname, '../lib/facebook') );

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

function findforone (person, callback) {
  console.info('finding friends for:', person.name);
  facebook.populate_friends(person, function(err) {
    if (err) { console.error(err); }
    callback(null);
  });
}

function findall (callback) {
  console.info('finding all friends');
  Person.find({}, function(err, people) {
    async.forEachSeries(people, function(person, next) {
      findforone(person, next);
    }, function(err) {
      if (err) { callback(err); return; }
      callback(null);
    });
  });
}

if (require.main === module) {
  // called as a script
  if (process.argv.length === 2) {
    findall(function(err) {
      if (err) { console.error(err); process.exit(1); }
      console.info('All done');
      process.exit(0);
    });
  } else if (process.argv.length === 3) {
    Person.findById(process.argv[2], function(err, person) {
      if (err || !person) { console.error(err); process.exit(1); }
      findforone(person, function(err) {
        if(err) { process.exit(1); }
        console.log('All done');
        process.exit(0);
      });
    });
  } else {
    console.info('usage: node', path.basename(process.argv[1]), '[person_id]');
  }
}
