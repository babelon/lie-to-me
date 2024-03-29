
var fs, Underscore, Mongoose, Mustache, Store, Fragment, Entity, Person, Vote, Promise, Utilities, Facebook, one_week;

fs = require('fs');

Underscore = require('underscore');
Mongoose = require('mongoose');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Promise = require('./defers').Promise;
Storage = require('./storage');
Utilities = require('./utilities');
Facebook = require('./facebook');

one_week = 60 * 60 * 24 * 7;

exports.queueup = function(req, res, vote, fragment) {
  var promise, voter, key, value;
  promise = new Promise();
  if (fragment.truth || !vote.truth) {
    Underscore.defer(function() {
      promise.onward(req, res, vote, fragment);
    });
    return promise;
  }
  // only deceptive fragments that were voted true
  voter = new Person(req.session.person);
  key = String(fragment.author._id) + '_notification';
  fetch_notification(vote, voter, fragment, fragment.entity, function(err, notification) {
    if (err) { promise.stalled(req, res, 'notification fetch error', err); return; }
    value = JSON.stringify(notification);
    Storage.redis('setex', key, one_week, value, function(err, reply) {
      if (err) { promise.stalled(req, res, 'redis set error', err); return; }
      postToFacebook(fragment.author, voter);
      promise.onward(req, res, vote, fragment);
    });
  });
  return promise;
}

function fetch_notification (vote, voter, fragment, entity, callback) {
  var fetches = Storage.redis('multi');
  if (vote.truth === fragment.truth) {
    fetches.srandmember('leaders_notification_failure');
    fetches.srandmember('notification_failure');
  } else {
    fetches.srandmember('leaders_notification_success');
    fetches.srandmember('notification_success');
  }
  fetches.exec(function(err, replies) {
    if (err) { callback(err, null); }
    callback(null, {
      alert_type: vote.truth === fragment.truth ? 'error' : 'success',
      leader: Mustache.to_html(replies[0], {
        voter: voter.html_snippet
      }),
      text: Mustache.to_html(replies[1], {
        entity: entity.html_snippet,
        pronoun: Utilities.capitalize(voter.pronoun),
        voter: voter.html_snippet,
      }),
      picture: voter.picture('square')
    });
  });
}

function postToFacebook (deceiver, deceived) {
  if ( deceiver.postactions && deceived.postactions ) {
    Facebook.postAction(
    deceiver.fb_id,
    'veritaspace',
    'deceive',
    { profile: deceived.open_graph_url },
    function(err, actionid) {
      if (err) { console.error(err); return; }
    });
  }
}
