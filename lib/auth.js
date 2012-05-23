
var Mongoose, Facebook, Person;

Mongoose = require('mongoose');
Facebook = require('./facebook');

Promise = require('./defers').Promise;

Person = Mongoose.model('Person');

function is_logged_in (req) {
  if (!req.session.person) {
    return false;
  }
  var now = new Date();
  var expires = new Date(req.session.person.oauth_token_expires);
  return expires > now;
}

exports.is_logged_in = is_logged_in;

exports.verify_oauth_callback = function(req, res) {
  var promise, createdNew;
  promise = new Promise();
  Facebook.get_oauth_token(req, res, function(err, access_token, token_expires, oauth_provider) {
    if (err) { promise.stalled(req, res, 'fb login error', err); return; }
    Facebook.get_profile_info(
    'me',
    ['id', 'first_name', 'last_name', 'gender', 'link', 'email'],
    access_token,
    function(err, info) {
      if (err) { promise.stalled(req, res, 'fb graph api error', err); return; }
      Person.findOne({ fb_id: info['id'] }, function(err, person) {
        if (err) { promise.stalled(req, res, 'db retrieval error', err); return; }
        if (!person) {
          // Create new user
          createdNew = true;
          var person = new Person({
            first_name: info['first_name'],
            last_name: info['last_name'],
            gender: info['gender'],
            email: info['email'],
            profile_page: info['link'],
            fb_id: info['id'],
            fb_friends: [],
            oauth_provider: oauth_provider,
            oauth_access_token: access_token,
            oauth_token_expires: token_expires
          });
        } else {
          // Log access_token for existing user
          createdNew = false;
          person.fb_id = info['id'];
          person.oauth_provider = oauth_provider;
          person.oauth_access_token = access_token;
          person.oauth_token_expires = token_expires;
        }
        person.save(function(err, saved) {
          if (err) { promise.stalled(req, res, 'db saving error', err); return; }
          req.session.person = saved;
          req.session.streak = req.session.streak || 0;
          res.redirect('/summary');
          if (createdNew) { Facebook.populate_friends(saved); }
          promise.onward(req, res, saved);
        });
      });
    });
  });
  return promise;
};

/**
 * Middleware
 */

exports.enforcer = function(options) {
  var whitelist, _patterns;
  whitelist = options['whitelist'] || [];
  _patterns = whitelist.map(function(w) { return new RegExp(w) });
  return function(req, res, next) {
    var excluded;
    if (is_logged_in(req)) return next();
    included = _patterns.every(function(pat) {
      // url doesn't match pat
      return !pat.exec(req.url);
    });
    if (!included) { return next(); }
    else {
      res.redirect('/');
    }
  };
};
