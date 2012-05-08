var path, async, Mongoose, Fragment, Entity, Person, Vote;

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

tests = {
  bag: function() {
    Person.findOne({})
    .run(function(err, p) {
      console.log(p.toObject({ virtuals: true }));
      process.exit(0);
    });
  }
};

if (process.argv.length === 3 && process.argv[2] in tests) {
  tests[process.argv[2]]();
} else {
  console.log('usage:', process.argv[0], path.basename(process.argv[1]), '<operation>');
  process.exit(0);
}
