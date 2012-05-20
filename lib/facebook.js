
var qs, request, Mongoose, Utilities, Storage, Person, graph_url;

qs = require('querystring');

request = require('request');
Mongoose = require('mongoose');

Utilities = require('./utilities');
Storage = require('./storage')

Person = Mongoose.model('Person');

graph_url = "https://graph.facebook.com";
permissions = [ 'email', 'publish_actions', 'user_location',
'user_hometown', 'user_education_history' ];

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

function parse_body (body) {
  try {
    return JSON.parse(body);
  } catch(e) {
    return qs.parse(body);
  }
}
