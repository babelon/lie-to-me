
var urlutils, path, async, Mongoose, facebook, Fragment, Entity, Person, Vote;

urlutils = require('url');
path = require('path');

async = require('async');
Mongoose = require('mongoose');

Mongoose.connect('mongodb://localhost/lietome');
require( path.resolve( __dirname, '../lib/models') ).define(null);

facebook = require( path.resolve( __dirname, '../lib/facebook') );

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

// 'http://www.facebook.com/zahanm'
// 'http://www.facebook.com/profile.php?id=221692'

function transform_url_fbid (person) {
  var url = urlutils.parse(person.profile_page, true);
  if (url.pathname.match(/profile\.php/)) {
    person.fb_id = url.query['id'];
  } else {
    person.fb_id = url.pathname.slice(1);
  }
  return true;
}

function transform_username_id (person, callback) {
  if (!person.fb_id.match(/\d+/)) {
    facebook.get_profile_info(person.fb_id, ['id'], person.oauth_access_token, function(err, body) {
      if (err) { callback(err, null); }
      console.log(body);
      person.fb_id = body['id'];
      callback(null, person);
    });
  } else {
    callback({ msg: 'No transform needed' }, null);
  }
}

Person.find({}, function(err, people) {
  async.forEachSeries(people, function(person, next) {
    transform_username_id(person, function(err, transformed) {
      if (err) { console.error(err); next(); return; }
      transformed.save(function(err, saved) {
        if (err) { console.error(err); next(); return; }
        next();
      });
    });
  }, function(err) {
    if (err) { console.error(err); }
    else { console.log('All done'); }
    process.exit(0);
  });
});
