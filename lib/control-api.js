
var fs, Underscore, Mongoose, Mustache, Store, Fragment, Entity, Person, Vote, Debug, Facebook, one_week;

fs = require('fs');

Underscore = require('underscore');
Mongoose = require('mongoose');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Storage = require('./storage');
Debug = require('./debug');
Facebook = require('./facebook');

exports.configure = function(server) {

  server.get('/api/profiles/:id', function(req, res) {
    Person.findById(req.params.id, function(err, person) {
      if (err || !person) { Debug.send_error(req, res, 'No such person', err); return; }
      fs.readFile('views/profile.html', function(err, contents) {
        if (err) { Debug.send_error(req, res, 'reading file', err); return; }
        Storage.redis('get', 'fb_app_id', function(err, fb_app_id) {
          if (err || !fb_app_id) { Debug.send_error(req, res, 'fb_app_id fetch', err); return; }
          res.send( Mustache.to_html( String(contents), {
            fb_app_id: fb_app_id,
            object_url: person.open_graph_url,
            name: person.name,
            picture: person.picture('large'),
            first_name: person.first_name,
            last_name: person.last_name,
            description: 'A gullible chump',
            gender: person.gender,
            fb_id: person.fb_id
          }) );
        });
      });
    });
  });

  server.get('/api/canvas', function(req, res) {
    res.send('<script type="text/javascript" charset="utf-8">window.top.location.href = "http://lietome.babelon.co";</script>');
  });

  server.post('/api/canvas', function(req, res) {
    res.send('<script type="text/javascript" charset="utf-8">window.top.location.href = "http://lietome.babelon.co";</script>');
  });

  server.get('/api/close', function(req, res) {
    res.send('<script type="text/javascript" charset="utf-8">window.open("","_self","");window.close();</script>');
  });

};


