
var fs, Mongoose, Mustache, Fragment, Entity, Person, Vote, Sitevars;

fs = require('fs');

Mongoose = require('mongoose');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Sitevars = require('./sitevars');
Utilities = require('./utilities');

/**
 * App Logic
 */

exports.configure = function(server) {

  server.get('/guess', function(req, res) {
    respond_with_guess (null, req, res);
  });

  server.post('/guess', function(req, res) {
    var vote;
    vote = new Vote({
      truth: req.param('truth').match( /true/i ) ? true : false,
      fragment: req.param('fragment_id'),
      time: new Date(),
      voter: req.session.person._id
    });
    vote.save(function(err) {
      if (err) { res.json( { msg: 'db saving error', err: err }, 500); return; }
      compose_reply(vote, null, function(err, reply) {
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
          var title, statement_requested, statement_truth;
          if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
          if ( req.query['experience'].match( /true/i ) ) {
            statement_truth = true;
            statement_requested = Mustache.to_html( Sitevars.true_statement_request,
              { entity: entity.html_snippet });
          } else {
            statement_truth = false;
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
            title: statement_truth ? 'Describe': 'Deceive',
            statement_truth: statement_truth,
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
    var fragment, truth;
    Entity.findById(req.param('entity_id'), function(err, entity) {
      if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
      truth = req.param('truth').match( /true/i ) ? true : false
      fragment = new Fragment({
        author: req.session.person._id,
        entity: entity,
        truth: truth,
        text: req.param('fragment'),
        created: new Date()
      });
      fragment.save(function(err) {
        if (err) { res.json( { msg: 'db saving error', err: err }, 500); return; }
        compose_reply(null, fragment.truth, function(err, reply) {
          if (err) { res.json( { msg: 'reply composing error', err: err }, 500); return; }
          continuation_flow(reply, req, res);
        });
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

function compose_reply (vote, authentic, callback) {
  var reply = {};
  if (!vote) {
    // come from compose flow
    reply.alert_type = Sitevars.reply_alert_type['compose'];
    reply.leader = Utilities.pickOne( Sitevars.leaders_composed );
    if (authentic) {
      reply.text = Utilities.pickOne( Sitevars.composed_authentic_fragment );
    } else {
      reply.text = Utilities.pickOne( Sitevars.composed_deceptive_fragment );
    }
    callback(null, reply);
    return;
  }
  // come from vote flow
  Fragment.findById( vote.fragment, function(err, fragment) {
    if (err) { callback(err, null); return; }
    Person.findById( fragment.author, function(err, author) {
      if (err) { callback(err, null); return; }
      Entity.findById( fragment.entity, function(err, entity) {
        if (err) { callback(err, null); return; }
        if (fragment.truth) {
          reply.alert_type = Sitevars.reply_alert_type[ String(vote.truth) ];
          if ( vote.truth ) {
            reply.leader = Utilities.pickOne( Sitevars.leaders_right );
            reply.text = Utilities.pickOne( Sitevars.truth_guessed_truth );
            reply.tweener = Utilities.pickOne( Sitevars.tweeners_right );
          } else {
            reply.leader = Utilities.pickOne( Sitevars.leaders_wrong );
            reply.text = Utilities.pickOne( Sitevars.truth_guessed_lies );
            reply.tweener = Utilities.pickOne( Sitevars.tweeners_wrong );
          }
        } else {
          reply.alert_type = Sitevars.reply_alert_type[ String(!vote.truth) ];
          if ( vote.truth ) {
            reply.leader = Utilities.pickOne( Sitevars.leaders_wrong );
            reply.text = Utilities.pickOne( Sitevars.lies_guessed_truth );
            reply.tweener = Utilities.pickOne( Sitevars.tweeners_wrong );
          } else {
            reply.leader = Utilities.pickOne( Sitevars.leaders_right );
            reply.text = Utilities.pickOne( Sitevars.lies_guessed_lies );
            reply.tweener = Utilities.pickOne( Sitevars.tweeners_right );
          }
        }
        reply.text = Mustache.to_html(reply.text,
          { author: author.html_snippet, entity: entity.html_snippet, actioned: Sitevars.actioned_types[ entity.etype ] });
        callback(null, reply);
      });
    });
  });
}

function continuation_flow (reply, req, res) {
  console.log(req.path);
  if (Math.random() < Sitevars.prob_continuation_compose) {
    console.log('choosing compose');
    if ( !req.path.match(/compose/) ) {
      if (reply) { reply.tweener = Utilities.pickOne( Sitevars.tweeners_transition ); }
    }
    respond_with_compose(reply, req, res);
  } else {
    console.log('choosing guess');
    if ( !req.path.match(/guess/) ) {
      if (reply) { reply.tweener = Utilities.pickOne( Sitevars.tweeners_transition ); }
    }
    respond_with_guess(reply, req, res);
  }
}

function respond_with_guess (reply, req, res) {
  fs.readFile( 'views/guess.html', function(err, contents) {
    if (err) { res.json( { msg: 'fs error', err: err }, 500); return; }
    get_unseen_fragments( req.session.person, function(err, fragments) {
      if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
      if (!fragments.length) {
        reply = {
          alert_type: Sitevars.reply_alert_type['exhaust'],
          text: Utilities.pickOne( Sitevars.exhausted_guesses ),
          tweener: Utilities.pickOne( Sitevars.tweeners_transition )
        };
        respond_with_compose( reply, req, res );
        return;
      }
      fragment = Utilities.pickOne( fragments );
      Entity.findById( fragment.entity, function(err, entity) {
        if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
        res.contentType('text/html');
        res.send( Mustache.to_html( String(contents), {
          fragment: fragment.text,
          fragment_id: fragment._id,
          entity: entity.html_snippet,
          entity_type: entity.type_snippet,
          reply: reply
        }) );
      });
    });
  });
}

function respond_with_compose (reply, req, res) {
  var entity, entities_in_fragments;
  fs.readFile( 'views/compose.html', function(err, contents) {
    if (err) { res.json( { msg: 'fs error', err: err }, 500); return; }
    Fragment.find( { 'author': req.session.person._id }, function(err, fragments) {
      if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
      entities_in_fragments = fragments.map(function(f) {
        return f.entity;
      });
      Entity.find()
        .nin('_id', entities_in_fragments) // no entities previously composed for
        .run( function(err, entities) {
          if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
          if (!entities.length) {
            reply = {
              alert_type: Sitevars.reply_alert_type['exhaust'],
              text: Utilities.pickOne( Sitevars.exhausted_composes ),
              tweener: Utilities.pickOne( Sitevars.tweeners_transition )
            };
            respond_with_guess( reply, req, res );
            return;
          }
          entity = Utilities.pickOne( entities );
          res.contentType('text/html');
          res.send( Mustache.to_html( String(contents), {
            truthknown: false,
            entity_id: entity._id,
            entity: entity.html_snippet,
            actioned: Sitevars.actioned_types[ entity.etype ],
            reply: reply
          }) );
      });
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
