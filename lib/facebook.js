
var qs, async, request, Mongoose, Utilities, Person, graph_url;

qs = require('querystring');

async = require('async');
request = require('request');
Mongoose = require('mongoose');

Utilities = require('./utilities');

Person = Mongoose.model('Person');

graph_url = "https://graph.facebook.com";

exports.populate_friends = function(person, callback) {
  callback = callback || Utilities.empty_fn;
  var now, response_body;
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
    if (!response_body.data) { callback({ name: person.name, msg: 'Empty response' }); return; }
    person.fb_friends = [];
    async.forEachSeries(response_body.data, function(fb_info, next) {
      Person.findOne({ fb_id: fb_info['id'] }, function(err, friend) {
        if (err) { return err; }
        if (friend) {
          person.fb_friends.push(friend._id);
        }
        next();
      });
    }, function(err) {
      if (err) { callback({ name: person.name, err: err}); return; }
      person.save(function(err) {
        if (err) { callback({ name: person.name, err: err }); return; }
        console.log('Success:', person.name)
        callback(null);
      });
    });
  });
};

exports.get_profile_info = function(id, fields, access_token, callback) {
  var response_body, url;
  url = graph_url + '/' + id + '/?fields=' + fields.join(',');
  if (access_token) { url += '&access_token=' + access_token; }
  request(url, function(err, response, body) {
    if (err) { callback(err, null); }
    response_body = parse_body(body);
    callback(null, response_body);
  });
};

function parse_body (body) {
  try {
    return JSON.parse(body);
  } catch(e) {
    return qs.parse(body);
  }
}
