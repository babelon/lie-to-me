
var fs, Mongoose, Mustache, Fragment, Entity, Person, Vote, Debug, Auth, Flow, Reaction, Points, Notify, Summary;

fs = require('fs');

Mongoose = require('mongoose');
Mustache = require('mustache');

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

};
