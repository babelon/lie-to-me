
var path, async, Mongoose, Fragment, Entity, Person, Vote;

path = require('path');

async = require('async');
Mongoose = require('mongoose');

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Fragment.find({})
.populate('entity')
.populate('author')
.run(function(err, fragments) {
  fragments.forEach(function(fragment) {
    if (!fragment.entity) {
      console.log('entity null:', fragment._id);
    }
    if (!fragment.author) {
      console.log('author null:', fragment._id);
    }
  });
  process.exit(0);
});
