
var urlutils, path, async, Mongoose, Fragment, Entity, Person, Vote;

urlutils = require('url');
path = require('path');

async = require('async');
Mongoose = require('mongoose');

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

// 'http://www.facebook.com/zahanm'
// 'http://www.facebook.com/profile.php?id=221692'

Person.find({}, function(err, people) {
  async.forEachSeries(people, function(person, next) {
    var url = urlutils.parse(person.profile_page, true);
    if (url.pathname.match(/profile\.php/)) {
      person.fb_id = url.query['id'];
    } else {
      person.fb_id = url.pathname.slice(1);
    }
    person.save(function(err, saved) {
      if (err) { console.error(err); return; }
      console.log(saved);
      next();
    });
  });
});
