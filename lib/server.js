
var express, Mongoose, invocation, path, fs, Mustache, _, Fragment, Entity, Person, Vote;

fs = require('fs');
path = require('path');
express = require('express');
Mongoose = require('mongoose');
invocation = require('commander');
Mustache = require('mustache');
_ = require('underscore');

server = express.createServer();

/*************************\
* Middleware Configuration
\*************************/

server.configure(function() {
  server.use(express.favicon(path.resolve(__dirname, '../static/favicon.ico')));
  server.use(express.logger('tiny'));
  server.use(express.cookieParser('babelonian secret'));
  server.use(express.session({
    secret: 'babelonian secret',
    cookie: { maxAge: 1000 * 60 * 60 * 6 }  // maxAge in ms => 6 hours
  }));
  server.use(express.bodyParser());
  server.use(server.router);
  server.use(express['static'](path.resolve(__dirname, '../static')));
});

server.configure('development', function() {
  server.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

/****************\
* Database config
\****************/

Mongoose.connect('mongodb://localhost/lietome');
require('./models').define(server);

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

/************\
* Controllers
\************/

server.get('/guess', function(req, res) {
  fs.readFile( 'views/guess.html', function(err, contents) {
    if (err) { res.json( { msg: 'fs error', err: err }, 500); }
    else {
      Fragment.find({}, ['text'], function(err, fragments) {
        if (err) { res.json( { msg: 'db error', err: err }, 500); }
        else {
          fragments = _.shuffle( fragments );
          res.contentType('text/html');
          res.send( Mustache.to_html( String(contents), {
            fragment: fragments[0].text,
            fragment_id: fragments[0]._id,
            entity: fragments[0].entity
          }) );
        }
      });
    }
  });
});

server.get('/compose', function(req, res) {
  fs.readFile( 'views/compose.html', function(err, contents) {
    if (err) { res.json( { msg: 'fs error', err: err }, 500); }
    else {
      Entity.find({}, ['name'], function(err, entities) {
        if (err) { res.json( { msg: 'db error', err: err }, 500); }
        else {
          entities = _.shuffle( entities );
          res.contentType('text/html');
          res.send( Mustache.to_html( String(contents), {
            entity: entities[0].name,
            entity_id: entities[0]._id
          }) );
        }
      });
    }
  });
});

server.post('/savefragment', function(req, res) {
  var fragment;
  Entity.findById(req.param('entity_id'), function(err, entity) {
    if (err) { res.json( { msg: 'db error', err: err }, 500); }
    else {
      Person.findOne(function(err, person) {
        if (err) { res.json( { msg: 'db error', err: err }, 500); }
        else {
          fragment = new Fragment({
            author: person,
            entity: entity,
            truth: req.param('truth') == 'true' ? true : false,
            text: req.param('fragment')
          });
          fragment.save(function(err, saved) {
            if (err) { res.json( { msg: 'db saving error', err: err }, 500); }
            else {
              res.sendfile('static/thanks.html');
            }
          });
        }
      });
    }
  });
});

server.post('/saveentity', function(req, res) {
  var entity;
  entity = new Entity({
    name: req.param('name'),
    website: req.param('website')
  });
  entity.save(function(err) {
    if (err) { res.json( { msg: 'db saving error', err: err }, 500); }
    else {
      res.sendfile('static/thanks.html');
    }
  });
});

server.post('/vote', function(req, res) {
  var vote;
  Person.findOne({}, function(err, person) {
    if (err) { res.json( { msg: 'db error', err: err }, 500); }
    else {
      vote = new Vote({
        truth: req.param('truth') == 'true' ? true : false,
        fragment: req.param('fragment_id'),
        time: new Date(),
        voter: person
      });
      vote.save(function(err) {
        if (err) { res.json( { msg: 'db saving error', err: err }, 500); }
        else {
          res.sendfile('static/thanks.html');
        }
      });
    }
  });
});

// Just for aesthetics
server.get('/add', function(req, res) {
  res.sendfile('static/add.html');
});

/******************\
* Command line args
\******************/

pkg_specs = JSON.parse( fs.readFileSync( path.resolve(__dirname, '../package.json') ) );

invocation.version(pkg_specs.version)
          .option('-p --port [port]', 'listening port for connections')
          .parse(process.argv);

/********\
* Listen
\********/

port = invocation.port || process.env.PORT || 8080;

server.listen(port, function() {
  console.info('Server running at ' + port);
});

