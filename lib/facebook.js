
var crypto, qs, request, Mongoose, Underscore, async, Utilities, Storage, Promise, Person, graph_url, permissions, appaccesstoken;

crypto = require('crypto');
qs = require('querystring');

request = require('request');
Mongoose = require('mongoose');
Underscore = require('underscore');
async = require('async');

Utilities = require('./utilities');
Storage = require('./storage');
Promise = require('./defers').Promise;

Person = Mongoose.model('Person');

graph_url = "https://graph.facebook.com";
permissions = [ 'email', 'publish_actions', 'user_location',
'user_hometown', 'user_education_history' ];
appaccesstoken = null;

exports.populate_friends = function(person, callback) {
  callback = callback || Utilities.emptyFn;
  var now, response_body, fb_friends;
  now = new Date();
  if (!person.oauth_access_token || now >= person.oauth_token_expires) {
    callback({ name: person.name, msg: 'Expired oauth token' });
    return;
  }
  request({
    url: graph_url + '/' + person.fb_id + '/friends',
    qs: { access_token: person.oauth_access_token }
  }, function(err, res, body) {
    if (err) { callback({ name: person.name, err: err }); return; }
    response_body = parse_body(body);
    if (!response_body.data || !response_body.data.length) {
      callback({ name: person.name, msg: 'Empty response' });
      return;
    }
    friend_fb_ids = response_body.data.map(function(f) { return f.id });
    Person.distinct(
    '_id',                                            // selected fields
    { fb_id: { '$in': friend_fb_ids } },              // *costly* query
    function(err, friend_ids) {                       // callback
      if (err) { callback(err); return; }
      // update current person
      Person.update(
      { _id: person._id },                            // query
      { '$set': { fb_friends: friend_ids } },         // update
      function(err) {                                 // callback
        if (err) { callback(err); return; }
        // update all other people
        Person.update(
        { _id: { '$in': friend_ids } },               // query
        { '$addToSet': { fb_friends : person._id } }, // update
        { multi: true },                              // options
        function(err, numfriends) {                   // callback
          if (numfriends !== friend_ids.length) {
            callback({ msg: 'Did not update the correct number of friends' });
            return;
          }
          callback(null);
        });
      });
    });
  });
};

exports.get_profile_info = function (fb_id, fields, access_token, callback) {
  var response_body, url;
  url = graph_url + '/' + fb_id + '/?fields=' + fields.join(',');
  if (access_token) { url += '&access_token=' + access_token; }
  request(url, function(err, response, body) {
    if (err) { callback(err, null); }
    response_body = parse_body(body);
    callback(response_body['error'], response_body);
  });
};

/**
 * Open Graph
 */

exports.setup = function(server) {
  var fetches = Storage.redis('multi');
  fetches.get('fb_app_id');
  fetches.get('fb_app_secret');
  fetches.exec(function(err, replies) {
    if (err) { console.error('fb access token', err); return; }
    request({
      url: graph_url + '/oauth/access_token',
      qs: {
        client_id: replies[0],
        client_secret: replies[1],
        grant_type: 'client_credentials'
      }
    }, function(err, response, rawbody) {
      if (err) { console.error('fb access token', err); return; }
      appaccesstoken = parse_body(rawbody)['access_token'];
    });
  });
};

exports.postAction = function (fb_id, namespace, action, actioninfo, callback) {
  request({
    url: graph_url + '/' + fb_id + '/' + namespace + ':' + action,
    qs: Underscore.extend({ access_token: appaccesstoken }, actioninfo),
    method: 'POST'
  }, function(err, response, rawbody) {
    if (err) { callback(err, null); return; }
    callback(null, parse_body(rawbody)['id']);
  });
}

exports.cleanupRequests = function(req, res, person) {
  var promise, fb_id, access_token, body;
  promise = new Promise();
  fb_id = person.fb_id;
  access_token = person.oauth_access_token;
  request({
    url: graph_url + '/' + fb_id + '/apprequests',
    qs: { access_token: access_token }
  }, function(err, response, rawbody) {
    if (err) { promise.stalled(err); return; }
    var body = parse_body(rawbody);
    async.forEachSeries(body['data'], function(appreq, next) {
      request({
        url: graph_url + '/' + appreq['id'],
        qs: { access_token: access_token },
        method: 'DELETE'
      }, function(err) {
        if (err) { console.error(err); }
        next();
      });
    }, function(err) {
      if (err) { promise.stalled(err); return; }
      promise.onward(req, res, person);
    });
  });
  return promise;
};

/**
 * OAuth
 */

exports.render_oauth_dialog = function(req, res) {
  var promise, shasum;
  promise = new Promise();
  shasum = crypto.createHash('sha1');
  shasum.update( crypto.randomBytes(64) );
  req.session.oauth_state = shasum.digest('base64');
  Storage.redis('get', 'fb_app_id', function(err, fb_app_id) {
    if (err) { promise.stalled(req, res, 'Storage fetch error', err); return; }
    res.redirect('https://www.facebook.com/dialog/oauth?' +
      'client_id=' + fb_app_id +
      '&redirect_uri=' + encodeURIComponent( 'http://' + req.headers.host + '/login' ) +
      '&scope=' + permissions.join(',') +
      '&state=' + encodeURIComponent(req.session.oauth_state) );
  });
  return promise;
};

exports.get_oauth_token = function (req, res, callback) {
  var fetches, response_body, access_token, token_expires, oauth_provider;
  fetches = Storage.redis('multi');
  fetches.get('fb_app_id');
  fetches.get('fb_app_secret');
  fetches.exec(function(err, replies) {
    if (err) { res.json({ msg: 'Storage fetch error', err: err }); return; }
    request.get( graph_url + '/oauth/access_token?' +
      '&client_id=' + replies[0] +
      '&redirect_uri=' + encodeURIComponent( 'http://' + req.headers.host + '/login' ) +
      '&client_secret=' + replies[1] +
      '&code=' + req.query['code'],
    function(err, response, body) {
      response_body = parse_body(body);
      if (err || response_body['error']) { callback(err || response_body['error']); return; }
      access_token = response_body['access_token'];
      var secs_to_expire, expires;
      secs_to_expire = Number(response_body['expires']);
      expires = ( Date.now() / 1000 + secs_to_expire ) * 1000;
      token_expires = new Date( expires );
      oauth_provider = 'facebook';
      callback(null, access_token, token_expires, oauth_provider);
    });
  });
}

/**
 * Dialogs
 */

exports.requestDialog = function(fb_app_id) {
  return "https://www.facebook.com/dialog/apprequests" +
    "?app_id=" + fb_app_id +
    "&display=" + "popup" +
    "&message=" + encodeURIComponent("Think you can tell when I'm lying? I bet I can fool you.") +
    "&title=" + encodeURIComponent("The Deception Game") +
    "&redirect_uri=" + encodeURIComponent("http://lietome.babelon.co/api/close");
};

function parse_body (body) {
  try {
    return JSON.parse(body);
  } catch(e) {
    return qs.parse(body);
  }
}
