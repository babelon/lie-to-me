
var fs, Mongoose, Mustache, Store, Fragment, Entity, Person, Vote, Utilities;

fs = require('fs');

Mongoose = require('mongoose');
Mustache = require('mustache');
Store = require('redis').createClient();

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

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
                person: req.session.person
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
        Store.get('points_compose', function(err, points) {
          if (err) { res.json( { msg: 'store fetch error', err: err }, 500); return; }
          req.session.person.points += Number(points);
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

  server.on('close', function() {
    Store.quit();
  });

};

/**
 * Helpers
 */

function compose_reply (from, what, callback) {
  var alert_type, leader, tweener, text, fetches;
  if (from === 'exhausted') {
    alert_type = 'exhausted';
    leader = 'leaders_exhausted';
    tweener = 'tweeners_transition';
    if (what === 'guesses') {
      text = 'exhausted_guesses';
    } else if (what === 'composes') {
      text = 'exhausted_composes';
    } else {
      callback({ msg: 'invalid what in compose_reply' }, null);
      return;
    }
    fetch_reply(null, alert_type, leader, tweener, text, callback);
    return;
  } else if (from === 'compose') {
    alert_type = 'composed';
    leader = 'leaders_composed';
    tweener = 'tweeners_transition';
    if (what) {
      text = 'composed_authentic_fragment';
    } else {
      text = 'composed_deceptive_fragment';
    }
    fetch_reply(null, alert_type, leader, tweener, text, callback);
    return;
  }
  // come from POST /guess flow
  var vote = what;
  Fragment.findById(vote.fragment)
  .populate('author')
  .populate('entity')
  .run(function(err, fragment) {
    if (err) { callback(err, null); return; }
    if (fragment.truth) {
      if ( vote.truth ) {
        alert_type = 'true';
        leader = 'leaders_right';
        text = 'truth_guessed_truth';
        tweener = 'tweeners_right';
      } else {
        alert_type = 'false';
        leader = 'leaders_wrong';
        text = 'truth_guessed_lies';
        tweener = 'tweeners_wrong';
      }
    } else {
      if ( vote.truth ) {
        alert_type = 'false';
        leader = 'leaders_wrong';
        text = 'lies_guessed_truth';
        tweener = 'tweeners_wrong';
      } else {
        alert_type = 'true';
        leader = 'leaders_right';
        text = 'lies_guessed_lies';
        tweener = 'tweeners_right';
      }
    }
    fetch_reply(fragment.author, alert_type, leader, tweener, text, function(err, reply) {
      reply.text = Mustache.to_html(reply.text, {
        author: fragment.author.html_snippet,
        entity: fragment.entity.html_snippet,
        actioned: fragment.entity.type_actioned
      });
      callback(null, reply);
    });
  });
}

function fetch_reply (person, alert_type, leader, tweener, text, callback) {
  fetches = Store.multi();
  fetches.hget('reply_alert_type', alert_type);
  fetches.srandmember(leader);
  fetches.srandmember(tweener);
  fetches.srandmember(text);
  fetches.exec(function(err, replies) {
    if (err) { callback(err, null); return; }
    callback(null, {
      alert_type: replies[0],
      leader: replies[1],
      tweener: replies[2],
      text: replies[3],
      picture: person && person.picture('square')
    });
  });
}

function continuation_flow (reply, req, res) {
  var fetches, prob_continuation_compose, tweeners_transition;
  fetches = Store.multi();
  fetches.get('prob_continuation_compose');
  fetches.srandmember('tweeners_transition');
  fetches.exec(function(err, replies) {
    if (err) { res.json( { msg: 'store fetch error', err: err }, 500); return; }
    prob_continuation_compose = Number(replies[0]);
    tweeners_transition = replies[1];
    if (Math.random() < prob_continuation_compose) {
      if ( !req.path.match(/compose/) ) {
        if (reply) { reply.tweener = tweeners_transition; }
      }
      respond_with_compose(reply, req, res);
    } else {
      if ( !req.path.match(/guess/) ) {
        if (reply) { reply.tweener = tweeners_transition; }
      }
      respond_with_guess(reply, req, res);
    }
  });
}

function respond_with_guess (reply, req, res) {
  fs.readFile( 'views/guess.html', function(err, contents) {
    if (err) { res.json( { msg: 'fs error', err: err }, 500); return; }
    get_unguessed_fragment( req.session.person, function(err, fragment) {
      if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
      if (!fragment) {
        if ( reply && reply.text.indexOf("Looks like you've already") !== -1 ) {
          res.send('Resource not found.', 404); return;  // HACK AWFUL FIXME
        }
        compose_reply( 'exhausted', 'guesses', function(err, reply) {
          if (err) { res.json( { msg: 'reply composing error', err: err }, 500); return; }
          respond_with_compose( reply, req, res );
        });
        return;
      }
      render_stars(false, fragment.rating, function(err, stars_snippet) {
        if (err) { res.json({ msg: 'star snippet error', err: err}, 500); return; }
        res.contentType('text/html');
        res.send( Mustache.to_html( String(contents), {
          fragment: fragment.text,
          fragment_id: fragment._id,
          entity: fragment.entity.html_snippet,
          entity_type: fragment.entity.type_snippet,
          stars: stars_snippet,
          person: req.session.person,
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
    get_unwritten_entity( req.session.person, function(err, entity) {
      if (err) { res.json( { msg: 'getting entity error', err: err }, 500); return; }
      if (!entity) {
        if ( reply && reply.text.indexOf("Looks like you've already") !== -1 ) {
          res.send('Resource not found.', 404); return;  // HACK AWFUL FIXME
        }
        compose_reply( 'exhausted', 'composes', function(err, reply) {
          if (err) { res.json( { msg: 'reply composing error', err: err }, 500); return; }
          respond_with_guess( reply, req, res );
        });
        return;
      }
      res.contentType('text/html');
      res.send( Mustache.to_html( String(contents), {
        truthknown: false,
        entity_id: entity._id,
        entity: entity.html_snippet,
        actioned: entity.type_actioned,
        person: req.session.person,
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
function get_unguessed_fragment (person, callback) {
  var fragments_in_votes;
  Vote.find( { voter: person._id }, function(err, votes) {
    if (err) { callback(err, null); return; }
    fragments_in_votes = votes.map(function(v) {
      return v.fragment;
    });
    Fragment.count()
    .ne('author', person._id)       // no fragments authored by person
    .nin('_id', fragments_in_votes) // no fragments previously voted on
    .run(function(err, count) {
      if (count === 0) { callback(null, null); return; }
      var i = Utilities.randInt(count);
      Fragment.findOne()
      .ne('author', person._id)
      .nin('_id', fragments_in_votes)
      .skip(i)
      .populate('entity')
      .run(function(err, fragment) {
        if (err) { callback(err, null); return; }
        callback(null, fragment);
      });
    });
  });
}

/**
 * Find and vet appropriate entity for a user
 * don't get previously composed on entities
 */
function get_unwritten_entity (person, callback) {
  Fragment.find( { 'author': person._id }, function(err, fragments) {
    if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
    entities_in_fragments = fragments.map(function(f) {
      return f.entity;
    });
    Entity.count()
    .nin('_id', entities_in_fragments) // no entities previously composed for
    .run(function(err, count) {
      if (count === 0) { callback(null, null); return; }
      var i = Utilities.randInt(count);
      Entity.findOne()
      .nin('_id', entities_in_fragments)
      .skip(i)
      .run(function(err, entity) {
        if (err) { callback(err, null); return; }
        callback(null, entity);
      });
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
