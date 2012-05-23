
var fs, Mongoose, Mustache, Underscore, Fragment, Entity, Person, Vote, Debug, Auth;

fs = require('fs');

Mongoose = require('mongoose');
Mustache = require('mustache');
Underscore = require('underscore');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Debug = require('./debug');
Auth = require('./auth');

exports.configure = function(server) {

  server.get('/', function(req, res) {
    fs.readFile( 'views/index.html', function(err, contents) {
      var now = new Date();
      if (err) { res.json( { msg: 'fs error', err: err }, 500); return; }
      if (Auth.is_logged_in(req)) {
        // logged in
        res.send( Mustache.to_html(String(contents), {
          person: {
            name: res.metastore.person.name,
            email: res.metastore.person.email,
            sendupdates: res.metastore.person.sendupdates,
            postactions: res.metastore.person.postactions,
            scores_url: res.metastore.person.scores_url,
            picture: res.metastore.person.picture('square')
          },
          points: res.metastore.points
        }) );
      } else {
        // prompt login
        res.send( Mustache.to_html(String(contents)) );
      }
    });
  });

  server.get('/profile', function(req, res) {
    res.redirect('/');
  });

  server.post('/profile', function(req, res) {
    var updates = {
      email: req.param('email'),
      sendupdates: !!req.param('sendupdates', ''),
      postactions: !!req.param('postactions', '')
    };
    Underscore.extend(req.session.person, updates);
    Person.update({ '_id': res.metastore.person._id }, updates, function(err) {
      if (err) { Debug.send_error(req, res, 'db saving error', err); return; }
      res.redirect('/');
    });
  });

};
