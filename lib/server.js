
var express, Mongoose, invocation, path, fs, qs, crypto, request, secrets, Mustache, _, Fragment, Entity, Person, Vote;

fs = require('fs');
path = require('path');
express = require('express');
Mongoose = require('mongoose');
invocation = require('commander');
Mustache = require('mustache');
_ = require('underscore');
crypto = require('crypto');
request = require('request');
qs = require('querystring');

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
      Fragment.find({}, ['text', 'entity'], function(err, fragments) {
        if (err) { res.json( { msg: 'db error', err: err }, 500); }
        else {
          fragments = _.shuffle( fragments );
          fragment = fragments[0];
          Entity.findById( fragment.entity, function(err, entity) {
            if (err) { res.json( { msg: 'db error', err: err }, 500); }
            else {
              res.contentType('text/html');
              res.send( Mustache.to_html( String(contents), {
                fragment: fragment.text,
                fragment_id: fragment._id,
                entity_name: entity.name,
                entity_website: entity.website
              }) );
            }
          });
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

// Login flow

secrets = require('./secrets');

server.get('/login', function(req, res) {
  var now = new Date();
  if (req.session['fb_access_token'] && req.session['fb_ac_expires'] >= now) {
    res.redirect('/');
  } else if (req.query['code'] && req.query['state']) {
    // handle auth callback from facebook
    var state;
    state = req.session.fb_auth_state;
    delete req.session.fb_auth_state;
    if ( state == decodeURIComponent(req.query['state']) ) {
      request.get( 'https://graph.facebook.com/oauth/access_token?' +
          '&client_id=' + secrets.fb_app_id +
          '&redirect_uri=' + encodeURIComponent('http://localhost:8080/login') +
          '&client_secret=' + secrets.fb_app_secret +
          '&code=' + req.query['code']
        , function(err, response, body) {
          if (err) { res.json( { msg: 'fb login error', err: err }, 500); }
          else {
            var response_body;
            try {
              response_body = JSON.parse(body);
            } catch (JSONException) {
              response_body = qs.parse(body);
            }
            if (response_body['error']) { res.json( { msg: 'fb login error', err: response_body['error'] }, 500); }
            else {
              req.session['fb_access_token'] = response_body['access_token'];
              var secs_to_expire = Number(response_body['expires']);
              var expires = ( Date.now() / 1000 + secs_to_expire ) * 1000;
              req.session['fb_ac_expires'] = new Date( expires );
              request( 'https://graph.facebook.com/me?fields=id,name,email&' +
                'access_token=' + req.session['fb_access_token'],
                function(err, response, body) {
                  if (err) { res.json( { msg: 'fb graph api error', err: err }, 500); }
                  else {
                    res.send(body);
                  }
                }
              );
            }
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
    req.session.fb_auth_state = shasum.digest('base64');
    res.redirect('https://www.facebook.com/dialog/oauth?' +
      'client_id=' + secrets.fb_app_id +
      '&redirect_uri=' + encodeURIComponent('http://localhost:8080/login') +
      '&scope=email,publish_actions' +
      '&state=' + encodeURIComponent(req.session.fb_auth_state) );
  }
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

