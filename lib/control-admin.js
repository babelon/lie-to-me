
var fs, Mongoose, Fragment, Entity, Person, Vote;

fs = require('fs');

Mongoose = require('mongoose');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

exports.configure = function(server) {

  server.get('/add', function(req, res) {
    res.sendfile('static/add.html');
  });

  server.get('/rmvotes', function(req, res) {
    Vote.remove( { voter: req.session.person._id }, function(err) {
      if (err) { res.json( { msg: 'db remove error', err: err }, 500); return; }
      res.send('Your votes were removed', 200);
    });
  });

};
