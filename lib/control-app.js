
var fs, Mongoose, Mustache, Fragment, Entity, Person, Vote, Sitevars, Store;

fs = require('fs');

Mongoose = require('mongoose');
Mustache = require('mustache');
Store = require('redis').createClient();

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
    var vote, guessed_truth, onwards;
    guessed_truth = req.param('truth').match( /true/i ) ? true : false;
    vote = new Vote({
      truth: guessed_truth,
      fragment: req.param('fragment_id'),
      time: new Date(),
      voter: req.session.person._id
    });
    vote.save(function(err) {
      if (err) { res.json( { msg: 'db saving error', err: err }, 500); return; }
      Fragment.findById(vote.fragment, function(err, fragment) {
        if (guessed_truth === fragment.truth) {
          Store.get('points_correct_guess', function(err, points) {
            if (err) { res.json( { msg: 'store fetch error', err: err }, 500); return; }
            req.session.person.points += Number(points);
            Person.update(
              { _id: req.session.person._id },
              { points: req.session.person.points },
              function (err) {
                if (err) { res.json( { msg: 'db points saving error', err: err }, 500); return; }
                compose_reply('guess', vote, function(err, reply) {
                  if (err) { res.json( { msg: 'reply composing error', err: err }, 500); return; }
                  continuation_flow(reply, req, res);
                });
              });
          });
        } else {
          compose_reply('guess', vote, function(err, reply) {
            if (err) { res.json( { msg: 'reply composing error', err: err }, 500); return; }
            continuation_flow(reply, req, res);
          });
        }
      });
    });
  });

  server.get('/compose', function(req, res) {
    if (req.query['experience'] && req.query['entity_id']) {
      fs.readFile( 'views/compose.html', function(err, contents) {
        if (err) { res.json( { msg: 'fs error', err: err }, 500); return; }
        // answered and we know ground truth, time to write statement
        Entity.findById( req.query['entity_id'], function(err, entity) {
          var statement_requested, statement_key, statement_truth, star_rating;
          if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
          if ( req.query['experience'].match( /true/i ) ) {
            statement_truth = true;
            statement_key = 'true_statement_request';
            star_rating = 0;
          } else {
            statement_truth = false;
            // uses uniform probability for now
            star_rating = Utilities.pickOne([1,2,3,4,5]);
            statement_key = 'star_' + String(star_rating) + '_statement_request';
          }
          Store.get(statement_key, function(err, statement_templ) {
            if (err) { res.json( { msg: 'store fetch error', err: err }, 500); return; }
            statement_requested = Mustache.to_html(statement_templ,
              { entity: entity.html_snippet, actioned: entity.type_actioned });
            render_stars(statement_truth, star_rating, function(err, stars_snippet) {
              if (err) { res.json( { msg: 'render stars error', err: err }, 500); return; }
              res.contentType('text/html');
              res.send( Mustache.to_html( String(contents), {
                truthknown: true,
                title: statement_truth ? 'Describe': 'Deceive',
                statement_truth: statement_truth,
                statement_requested: statement_requested,
                stars: stars_snippet,
                entity_id: entity._id,
                points: req.session.person.points
              }) );
            });
          });
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
      truth = req.param('truth').match( /true/i ) ? true : false;
      fragment = new Fragment({
        author: req.session.person._id,
        entity: entity,
        truth: truth,
        text: req.param('fragment'),
        rating: req.param('star-rating'),
        created: new Date()
      });
      fragment.save(function(err) {
        if (err) { res.json( { msg: 'db saving error', err: err }, 500); return; }
        req.session.person.points += Sitevars.points_compose;
        Person.update(
          { _id: req.session.person._id },
          { points: req.session.person.points },
          function (err) {
            if (err) { res.json( { msg: 'db points saving error', err: err }, 500); return; }
            compose_reply('compose', fragment.truth, function(err, reply) {
              if (err) { res.json( { msg: 'reply composing error', err: err }, 500); return; }
              continuation_flow(reply, req, res);
            });
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

function compose_reply (from, what, callback) {
  var reply = {};
  if (from === 'exhausted') {
    reply.alert_type = Sitevars.reply_alert_type['exhausted'];
    reply.leader = Utilities.pickOne( Sitevars.leaders_exhausted );
    reply.tweener = Utilities.pickOne( Sitevars.tweeners_transition );
    if (what === 'guesses') {
      reply.text = Utilities.pickOne( Sitevars.exhausted_guesses );
    } else if (what === 'composes') {
      reply.text = Utilities.pickOne( Sitevars.exhausted_composes );
    } else {
      callback({ msg: 'invalid what in compose_reply' }, null);
    }
    callback(null, reply);
    return;
  } else if (from === 'compose') {
    reply.alert_type = Sitevars.reply_alert_type['composed'];
    reply.leader = Utilities.pickOne( Sitevars.leaders_composed );
    if (what) {
      reply.text = Utilities.pickOne( Sitevars.composed_authentic_fragment );
    } else {
      reply.text = Utilities.pickOne( Sitevars.composed_deceptive_fragment );
    }
    callback(null, reply);
    return;
  }
  // come from guess flow
  var vote = what;
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
          { author: author.html_snippet, entity: entity.html_snippet, actioned: entity.type_actioned });
        callback(null, reply);
      });
    });
  });
}

function continuation_flow (reply, req, res) {
  if (Math.random() < Sitevars.prob_continuation_compose) {
    if ( !req.path.match(/compose/) ) {
      if (reply) { reply.tweener = Utilities.pickOne( Sitevars.tweeners_transition ); }
    }
    respond_with_compose(reply, req, res);
  } else {
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
        if ( reply && Sitevars.leaders_exhausted.indexOf(reply.leader) !== -1 ) {
          res.send('Resource not found.', 404); return;  // HACK AWFUL FIXME
        }
        compose_reply( 'exhausted', 'guesses', function(err, reply) {
          if (err) { res.json( { msg: 'reply composing error', err: err }, 500); return; }
          respond_with_compose( reply, req, res );
        });
        return;
      }
      fragment = Utilities.pickOne( fragments );
      Entity.findById( fragment.entity, function(err, entity) {
        if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
        render_stars(false, fragment.rating, function(err, stars_snippet) {
          if (err) { res.json({ msg: 'star snippet error', err: err}, 500); return; }
          res.contentType('text/html');
          res.send( Mustache.to_html( String(contents), {
            fragment: fragment.text,
            fragment_id: fragment._id,
            entity: entity.html_snippet,
            entity_type: entity.type_snippet,
            stars: stars_snippet,
            points: req.session.person.points,
            reply: reply
          }) );
        });
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
            if ( reply && Sitevars.leaders_exhausted.indexOf(reply.leader) !== -1 ) {
              res.send('Resource not found.', 404); return;  // HACK AWFUL FIXME
            }
            compose_reply( 'exhausted', 'composes', function(err, reply) {
              if (err) { res.json( { msg: 'reply composing error', err: err }, 500); return; }
              respond_with_guess( reply, req, res );
            });
            return;
          }
          entity = Utilities.pickOne( entities );
          res.contentType('text/html');
          res.send( Mustache.to_html( String(contents), {
            truthknown: false,
            entity_id: entity._id,
            entity: entity.html_snippet,
            actioned: entity.type_actioned,
            points: req.session.person.points,
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

function render_stars (enabled, rating, callback) {
  var snippet, star, range, fetches;
  snippet = '<span class=star-rating-group>\n';
  if (enabled) {
    // render editable snippet
    stars = Utilities.rangeReplicate({}, 'rating', 1, 6);
  } else {
    // disabled snippet
    stars = Utilities.rangeReplicate( { disabled: 'disabled' }, 'rating', 1, 6);
    if (rating > 0) { stars[ rating - 1 ]['hidden'] = { rating: rating }; }
  }
  if (rating > 0) { stars[ rating - 1 ]['checked'] = 'checked'; }
  fetches = Store.multi()
  fetches.get('star_filled_snippet');
  fetches.get('star_empty_snippet');
  fetches.exec(function(err, replies) {
    if (err) { callback(err, null); return; }
    star_filled_snippet = replies[0];
    star_empty_snippet = replies[1];
    snippet += Mustache.to_html( star_filled_snippet,
      { range: stars.slice(0, rating) });
    snippet += Mustache.to_html( star_empty_snippet,
      { range: stars.slice(rating) });
    snippet += '</span>';
    callback(null, snippet);
  });
}
