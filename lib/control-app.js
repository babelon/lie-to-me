
var fs, Mongoose, Mustache, Fragment, Entity, Person, Vote, Debug, Flow, Reaction, Points, Notify, Summary;

fs = require('fs');

Mongoose = require('mongoose');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Debug = require('./debug');

Flow = require('./control-flow');
Reaction = require('./control-reaction');
Points = require('./control-points');
Notify = require('./control-notify');
Summary = require('./control-summary');

/**
 * App Logic
 */

exports.configure = function(server) {

  server.get('/summary', function(req, res) {
    var responder;
    responder = Summary.since_accessed(req, res);
    responder.then(function(req, res) {
      res.redirect('/');
    });
  });

  server.get('/guess', function(req, res) {
    var responder;
    responder = Flow.respond_with_guess(req, res);
    responder.then(Flow.respond_with_exhausted);
    responder.then(Flow.respond_with_game_over);
    responder.error(Debug.send_error);
  });

  server.post('/guess', function(req, res) {
    var vote, truth, reactor;
    truth = req.param('truth').match( /true/i ) ? true : false;
    vote = new Vote({
      truth: truth,
      fragment: req.param('fragment_id'),
      time: new Date(),
      voter: req.session.person._id
    });
    vote.save(function(err) {
      if (err) { Debug.send_error(req, res, 'db saving error', err); return; }
      reactor = Reaction.initiate(req, res, vote);
      reactor.then(Points.add_points);
      reactor.then(Notify.queueup);
      reactor.then(Flow.initiate);
      reactor.error(Debug.send_error);
    });
  });

  server.get('/compose', function(req, res) {
    var responder;
    if (req.query['truth'] && req.query['entity_id']) {
      responder = Flow.respond_with_compose_writing (req, res);
    } else {
      responder = Flow.respond_with_compose (req, res);
      responder.then(Flow.respond_with_exhausted);
      responder.then(Flow.respond_with_game_over);
    }
    responder.error(Debug.send_error);
  });

  server.post('/compose', function(req, res) {
    var fragment, truth, reactor;
    truth = req.param('truth').match( /true/i ) ? true : false;
    fragment = new Fragment({
      author: req.session.person._id,
      entity: req.param('entity_id'),
      truth: truth,
      text: req.param('fragment'),
      rating: req.param('star-rating'),
      created: new Date()
    });
    fragment.save(function(err) {
      if (err) { res.json( { msg: 'db saving error', err: err }, 500); return; }
      reactor = Reaction.initiate(req, res, fragment);
      reactor.then(Points.add_points);
      reactor.then(Flow.initiate);
      reactor.error(Debug.send_error);
    });
  });

  server.post('/add', function(req, res) {
    var entity;
    entity = new Entity({
      name: req.param('name'),
      website: req.param('website')
    });
    entity.save(function(err) {
      if (err) { res.json( { msg: 'db saving error', err: err }, 500); return; }
      res.statusCode = 201;
      res.sendfile('views/thanks.html');
    });
  });

}