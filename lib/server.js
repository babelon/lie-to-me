
var express, Mongoose, invocation, path, fs, Mustache, Review, _, Business, Author;

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
  server.use(express.logger('tiny'));
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

Review = Mongoose.model('Review');
Business = Mongoose.model('Business');
Author = Mongoose.model('Author');

/************\
* Controllers
\************/

server.get('/guess', function(req, res) {
  fs.readFile( 'views/guess.html', function(err, contents) {
    if (err) { res.json('fs error', 500); }
    else {
      Review.find({}, ['text'], function(err, reviews) {
        if (err) { re.json('db error', 500); }
        else {
          reviews = _.shuffle( reviews );
          res.contentType('text/html');
          res.send( Mustache.to_html( String(contents), { review: reviews[0].text }) );
        }
      });
    }
  });
});

server.get('/compose', function(req, res) {
  fs.readFile( 'views/compose.html', function(err, contents) {
    if (err) { res.json('fs error', 500); }
    else {
      Business.find({}, ['name'], function(err, businesses) {
        if (err) { re.json('db error', 500); }
        else {
          console.log(businesses);
          businesses = _.shuffle( businesses );
          res.contentType('text/html');
          res.send(
            Mustache.to_html( String(contents), {
              business: businesses[0].name,
              business_id: businesses[0]._id
            })
          );
        }
      });
    }
  });
});

server.post('/savereview', function(req, res) {
  var review;
  Business.findById(req.param('business_id'), function(err, business) {
    if (err) { res.json('db error', 500); }
    else {
      Author.findOne(function(err, author) {
        if (err) { res.json('db error', 500); }
        else {
          review = new Review({
            author: author,
            about: business,
            text: req.param('review')
          });
          review.save(function(err, saved) {
            if (err) { res.json('db saving error', 500); }
            else {
              res.redirect('/');
            }
          });
        }
      });
    }
  });
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

