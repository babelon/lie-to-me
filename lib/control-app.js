
var fs, Mongoose, _, Mustache, Fragment, Entity, Person, Vote, Sitevars;

fs = require('fs');

Mongoose = require('mongoose');
_ = require('underscore');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Sitevars = require('./sitevars');

/**
 * App Logic
 */

exports.configure = function(server) {

  server.get('/guess', function(req, res) {
    respond_with_guess (null, req, res);
  });

  server.post('/vote', function(req, res) {
    var vote;
    vote = new Vote({
      truth: req.param('truth') == 'true' ? true : false,
      fragment: req.param('fragment_id'),
      time: new Date(),
      voter: req.session.person._id
    });
    vote.save(function(err) {
      if (err) { res.json( { msg: 'db saving error', err: err }, 500); return; }
      compose_reply(vote, function(err, reply) {
        if (err) { res.json( { msg: 'reply composing error', err: err }, 500); return; }
        continuation_flow(reply, req, res);
      });
    });
  });

  server.get('/compose', function(req, res) {
    if (req.query['experience'] && req.query['entity_id']) {
      fs.readFile( 'views/compose.html', function(err, contents) {
        if (err) { res.json( { msg: 'fs error', err: err }, 500); return; }
        // answered and we know ground truth, time to write statement
        Entity.findById( req.query['entity_id'], function(err, entity) {
          var title, statement_requested;
          if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
          if ( req.query['experience'].match( /true/i ) ) {
            title = 'Describe';
            statement_requested = Mustache.to_html( Sitevars.true_statement_request,
              { entity: entity.html_snippet });
          } else {
            title = 'Deceive';
            if (Math.random() < Sitevars.prob_request_positive_statement) {
              statement_requested = Mustache.to_html( Sitevars.positive_statement_request,
                { entity: entity.html_snippet, actioned: Sitevars.actioned_types[ entity.etype ] });
            } else {
              statement_requested = Mustache.to_html( Sitevars.negative_statement_request,
                { entity: entity.html_snippet, actioned: Sitevars.actioned_types[ entity.etype ] });
            }
          }
          res.contentType('text/html');
          res.send( Mustache.to_html( String(contents), {
            truthknown: true,
            title: title,
            statement_requested: statement_requested,
            entity_id: entity._id
          }) );
        });
      });
    } else {
      // we do not know ground truth, ask about it
      respond_with_compose (null, req, res);
    }
  });

  server.post('/compose', function(req, res) {
    var fragment;
    Entity.findById(req.param('entity_id'), function(err, entity) {
      if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
      fragment = new Fragment({
        author: req.session.person._id,
        entity: entity,
        truth: req.param('truth') == 'true' ? true : false,
        text: req.param('fragment'),
        created: new Date()
      });
      fragment.save(function(err, saved) {
        if (err) { res.json( { msg: 'db saving error', err: err }, 500); return; }
        continuation_flow(null, req, res);
      });
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
      res.sendfile('static/thanks.html');
    });
  });

};

/**
 * Helpers
 */

function compose_reply (vote, callback) {
  var reply = {};
  Fragment.findById( vote.fragment, function(err, fragment) {
    if (err) { callback(err, null); return; }
    Person.findById( fragment.author, function(err, author) {
      if (err) { callback(err, null); return; }
      Entity.findById( fragment.entity, function(err, entity) {
        if (err) { callback(err, null); return; }
        if (fragment.truth) {
          reply.success = vote.truth ? true : false;
          reply.text = vote.truth ? Sitevars.truth_guessed_truth : Sitevars.truth_guessed_lies;
        } else {
          reply.success = vote.truth ? false : true;
          reply.text = vote.truth ? Sitevars.lies_guessed_truth : Sitevars.lies_guessed_lies;
        }
        reply.text = Mustache.to_html(reply.text,
          { author: author.html_snippet, entity: entity.html_snippet, actioned: Sitevars.actioned_types[ entity.etype ] });
        callback(null, reply);
      });
    });
  });
}

function continuation_flow (reply, req, res) {
  if (Math.random() < Sitevars.prob_continuation_compose) {
    respond_with_compose(reply, req, res);
  } else {
    respond_with_guess(reply, req, res);
  }
}

function respond_with_guess (reply, req, res) {
  fs.readFile( 'views/guess.html', function(err, contents) {
    if (err) { res.json( { msg: 'fs error', err: err }, 500); return; }
    get_unseen_fragments( req.session.person, function(err, fragments) {
      if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
      if (!fragments.length) {
        respond_with_compose( reply, req, res );
        return;
      }
      fragments = _.shuffle( fragments );
      fragment = fragments[0];
      Entity.findById( fragment.entity, function(err, entity) {
        if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
        res.contentType('text/html');
        res.send( Mustache.to_html( String(contents), {
          fragment: fragment.text,
          fragment_id: fragment._id,
          entity: entity.html_snippet,
          reply: reply
        }) );
      });
    });
  });
}

function respond_with_compose (reply, req, res) {
  fs.readFile( 'views/compose.html', function(err, contents) {
    if (err) { res.json( { msg: 'fs error', err: err }, 500); return; }
    Entity.find({}, function(err, entities) {
      var entity;
      if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
      entities = _.shuffle( entities );
      res.contentType('text/html');
      entity = entities[0];
      res.send( Mustache.to_html( String(contents), {
        truthknown: false,
        entity_id: entity._id,
        entity: entity.html_snippet,
        actioned: Sitevars.actioned_types[ entity.etype ],
        reply: reply
      }) );
    });
  });
}

/**
 * Find and vet appropriate fragment for a user
 * don't get your own fragments
 * don't see same fragment twice
 */
function get_unseen_fragments (person, callback) {
  var fragments_in_votes;
  Vote.find( { voter: person._id }, function(err, votes) {
    if (err) { callback(err, null); return; }
    fragments_in_votes = votes.map(function(v) {
      return v.fragment;
    });
    Fragment.find()
      .ne('author', person._id)       // no fragments authored by person
      .nin('_id', fragments_in_votes) // no fragments previously voted on
      .run( function(err, fragments) {
        if (err) { callback(err, null); return; }
        callback(null, fragments);
    });
  });
}
