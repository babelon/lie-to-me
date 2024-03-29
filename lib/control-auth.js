
var Auth, Facebook, Debug;

Auth = require('./auth');
Facebook = require('./facebook');
Debug = require('./debug');

/**
 * Auth Flow
 */

exports.configure = function(server) {

  server.get('/login', function(req, res) {
    var now = new Date();
    if ( Auth.is_logged_in(req) ) {
      res.redirect('/');
    } else if (req.query['code'] && req.query['state']) {
      var state = req.session.oauth_state;
      delete req.session.oauth_state;
      if ( state == decodeURIComponent(req.query['state']) ) {
        // handle auth callback from facebook
        Auth.verify_oauth_callback(req, res)
        .then(Facebook.cleanupRequests)
        .error(Debug.send_error);
      } else {
        // may be a CSRF attack
        console.warn('Possible CSRF attack happening. Redirecting to homepage.');
        res.redirect('/');
      }
    } else if (req.query['error'] && req.query['state']) {
      // user denied facebook login access
      res.redirect('/');
    } else {
      // redirect to authorization dialog
      Facebook.render_oauth_dialog(req, res)
      .error(Debug.send_error);
    }
  });

  server.get('/logout', function(req, res) {
    if (!!req.session.person) {
      delete req.session.person;
    }
    res.redirect('/');
  });

};
