
var fs, Mongoose, Mustache, Store, Fragment, Entity, Person, Vote, Promise, Utilities, one_week;

fs = require('fs');

Mongoose = require('mongoose');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Promise = require('./defers').Promise;
Storage = require('./storage');
Utilities = require('./utilities');

one_week = 60 * 60 * 24 * 7;

exports.queueup = function(req, res, vote, fragment) {
  var promise, person, voter, notification, key, value;
  promise = new Promise();
  person = new Person(req.session.person);
  voter = person.toObject({ virtuals: true });
  voter.picture = person.picture('square');
  notification = {
    entity: fragment.entity.toObject({ virtuals: true }),
    voter: voter
  };
  key = String(fragment.author._id) + '_notification';
  value = JSON.stringify(notification);
  Storage.redis('setex', key, one_week, value, function(err, reply) {
    if (err) { promise.stalled(req, res, 'redis set error', err); return; }
    promise.onward(req, res, vote, fragment);
  });
  return promise;
}
