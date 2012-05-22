var path, async, Mongoose, Fragment, Entity, Person, Vote, Facebook;

path = require('path');

_ = require('underscore');
async = require('async');
Mongoose = require('mongoose');

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Facebook = require( path.resolve( __dirname, '../lib/facebook') );

function quit () {
  Mongoose.disconnect();
  process.exit(0);
}

tests = {
  bag: function() {
    Person.findOne({})
    .run(function(err, p) {
      console.log(p.toObject({ virtuals: true }));
      quit();
    });
  },
  fillup: function() {
    Person.find({})
    .run(function(err, people) {
      async.forEachSeries(people, function(person, next) {
        Facebook.get_profile_info (
        person.fb_id,
        ['id', 'first_name', 'last_name', 'gender', 'link'],
        '',
        function(err, info) {
          if (err) { console.error(err); next(); return; }
          person.first_name = info['first_name'];
          person.last_name = info['last_name'];
          person.gender = info['gender'];
          person.profile_page = info['link'];
          person.fb_id = info['id'];
          person.save(function(err) {
            if (err) { console.error(err); next(); return; }
            console.log('Saved', person.name);
            next();
          });
        });
      }, function(err) {
        if (err) { console.error(err); quit(); return; }
        console.log('All done');
        quit();
      });
    });
  }
};

if (process.argv.length === 3 && process.argv[2] in tests) {
  tests[process.argv[2]]();
} else {
  console.log('usage:', process.argv[0], path.basename(process.argv[1]), '<operation>');
  process.exit(0);
}
