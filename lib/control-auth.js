
var fs, crypto, qs, Mongoose, request, Mustache, secrets, Person, siteurl;

fs = require('fs');
crypto = require('crypto');
qs = require('querystring');

Mongoose = require('mongoose');
request = require('request');
Mustache = require('mustache');

secrets = require('./secrets');

Person = Mongoose.model('Person');

if (process.env['NODE_ENV'] == 'production') {
  siteurl = 'http://lietome.babelon.co';
} else {
  siteurl = 'http://localhost:8080';
}

/**
 * Auth Flow
 */

exports.configure = function(server) {

  server.get('/', function(req, res) {
    fs.readFile( 'views/index.html', function(err, contents) {
      var now = new Date();
      if (err) { res.json( { msg: 'fs error', err: err }, 500); }
      else {
        if (is_logged_in(req)) {
          // logged in
          res.send( Mustache.to_html(String(contents), {
            person: true
          }) );
        } else {
          // prompt login
          res.send( Mustache.to_html(String(contents)) );
        }
      }
    });
  });

  server.get('/login', function(req, res) {
    var now = new Date();
    if (is_logged_in(req)) {
      res.redirect('/');
    } else if (req.query['code'] && req.query['state']) {
      // handle auth callback from facebook
      var state;
      state = req.session.oauth_state;
      delete req.session.oauth_state;
      if ( state == decodeURIComponent(req.query['state']) ) {
        request.get( 'https://graph.facebook.com/oauth/access_token?' +
            '&client_id=' + secrets.fb_app_id +
            '&redirect_uri=' + encodeURIComponent( siteurl + '/login' ) +
            '&client_secret=' + secrets.fb_app_secret +
            '&code=' + req.query['code'],
          function(err, response, body) {
            var response_body, oauth_provider, oauth_access_token, secs_to_expire, expires, oauth_token_expires;
            try {
              response_body = JSON.parse(body);
            } catch (e) {
              // if e instanceof SyntaxError
              response_body = qs.parse(body);
            }
            if (err || response_body['error']) { res.json( { msg: 'fb login error', err: err || response_body['error'] }, 500); }
            else {
              oauth_provider = 'facebook';
              oauth_access_token = response_body['access_token'];
              secs_to_expire = Number(response_body['expires']);
              expires = ( Date.now() / 1000 + secs_to_expire ) * 1000;
              oauth_token_expires = new Date( expires );
              request( 'https://graph.facebook.com/me?fields=id,name,email&' +
                  'access_token=' + oauth_access_token,
                function(err, response, body) {
                  var response_body;
                  response_body = {};
                  try {
                    response_body = JSON.parse(body);
                  } catch (e) {
                    // if e instanceof SyntaxError
                    response_body['error'] = { type: 'err', body: body };
                  }
                  if (err || response_body['error']) { res.json( { msg: 'fb graph api error', err: err || response_body['error'] }, 500); }
                  else {
                    Person.findOne({ email: response_body['email'] }, function(err, person) {
                      if (err) { res.json( { msg: 'db retrieval error', err:err }, 500 ); }
                      else {
                        if (!person) {
                          // Create new user
                          var person = new Person({
                            name: response_body['name'],
                            email: response_body['email'],
                            oauth_provider: oauth_provider,
                            oauth_access_token: oauth_access_token,
                            oauth_token_expires: oauth_token_expires
                          });
                        } else {
                          // Log access_token for existing user
                          person.oauth_provider = oauth_provider;
                          person.oauth_access_token = oauth_access_token;
                          person.oauth_token_expires = oauth_token_expires;
                        }
                        person.save(function(err, saved) {
                          if (err) { res.json( { msg: 'db saving error', err:err }, 500 ); }
                          else {
                            req.session.person = saved;
                            res.redirect('/');
                          }
                        });
                      }
                    });
                  }
                }
              );
            }
          }
        );
      } else {
        // may be a CSRF attack
        console.warn('Possible CSRF attack happening. Redirecting to homepage.')
        res.send('Possible CSRF attack happening.\n' + state);
      }
    } else {
      // redirect to authorization dialog
      var shasum;
      shasum = crypto.createHash('sha1');
      shasum.update( crypto.randomBytes(64) );
      req.session.oauth_state = shasum.digest('base64');
      res.redirect('https://www.facebook.com/dialog/oauth?' +
        'client_id=' + secrets.fb_app_id +
        '&redirect_uri=' + encodeURIComponent( siteurl + '/login' ) +
        '&scope=email,publish_actions' +
        '&state=' + encodeURIComponent(req.session.oauth_state) );
    }
  });

  server.get('/logout', function(req, res) {
    if (!!req.session.person) {
      delete req.session.person;
    }
    res.redirect('/');
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

/**
 * Helpers
 */

function is_logged_in (req) {
  if (!req.session.person) {
    return false;
  }
  var now = new Date();
  var expires = new Date(req.session.person.oauth_token_expires);
  return expires > now;
}

exports.is_logged_in = is_logged_in;
