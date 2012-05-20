
var Mongoose, Facebook, Person;

Mongoose = require('mongoose');
Facebook = require('./facebook');

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
  var oauth_provider, oauth_access_token, secs_to_expire, expires, oauth_token_expires;
  Facebook.get_oauth_token(req, res, function(err, access_token, token_expires, oauth_provider) {
    if (err) { res.json( { msg: 'fb login error', err: err }, 500); return; }
    Facebook.get_profile_info(
    'me',
    ['id', 'first_name', 'last_name', 'gender', 'link', 'email'],
    access_token,
    function(err, info) {
      if (err) { res.json( { msg: 'fb graph api error', err: err }, 500); return; }
      Person.findOne({ fb_id: info['id'] }, function(err, person) {
        if (err) { res.json( { msg: 'db retrieval error', err:err }, 500 ); return; }
        if (!person) {
          // Create new user
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
          person.fb_id = info['id'];
          person.oauth_provider = oauth_provider;
          person.oauth_access_token = access_token;
          person.oauth_token_expires = token_expires;
        }
        person.save(function(err, saved) {
          if (err) { res.json( { msg: 'db saving error', err:err }, 500 ); return; }
          req.session.person = saved;
          req.session.streak = req.session.streak || 0;
          res.redirect('/summary');
        });
      });
    });
  });
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
