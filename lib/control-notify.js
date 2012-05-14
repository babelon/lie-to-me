
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
  var promise, voter, key, value;
  promise = new Promise();
  voter = new Person(req.session.person);
  key = String(fragment.author._id) + '_notification';
  fetch_notification(voter, fragment, fragment.entity, function(err, notification) {
    if (err) { promise.stalled(req, res, 'notification fetch error', err); return; }
    value = JSON.stringify(notification);
    Storage.redis('setex', key, one_week, value, function(err, reply) {
      if (err) { promise.stalled(req, res, 'redis set error', err); return; }
      promise.onward(req, res, vote, fragment);
    });
  });
  return promise;
}

function fetch_notification (voter, fragment, entity, callback) {
  var fetches = Storage.redis('multi');
  fetches.srandmember('leaders_notification');
  if (fragment.truth) {
    fetches.srandmember('notification_truth');
  } else {
    fetches.srandmember('notification_deception');
  }
  fetches.exec(function(err, replies) {
    if (err) { callback(err, null); }
    callback(null, {
      alert_type: 'success',
      leader: replies[0],
      text: Mustache.to_html(replies[1], {
        entity: entity.html_snippet,
        pronoun: Utilities.capitalize(voter.pronoun),
        voter: voter.html_snippet,
      }),
      picture: voter.picture('square')
    });
  });
}
