
var fs, Mongoose, Mustache, Fragment, Entity, Person, Vote, Storage, Utilities, Debug, Promise, Reaction;

fs = require('fs');

Mongoose = require('mongoose');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Storage = require('./storage');
Utilities = require('./utilities');
Debug = require('./debug');
Promise = require('./defers').Promise;
Reaction = require('./control-reaction');

exports.initiate = function (req, res, vote, fragment) {
  var fetches, prob_continuation_compose, tweeners_transition, offering, responder;
  fetches = Storage.redis('multi');
  fetches.get('prob_continuation_compose');
  fetches.srandmember('tweeners_transition');
  fetches.exec(function(err, replies) {
    if (err) { Debug.send_error('store fetch error', err); return; }
    prob_continuation_compose = Number(replies[0]);
    tweeners_transition = replies[1];
    if (req.session.streak < 2 && Math.random() < prob_continuation_compose) {
      offering = /compose/i;
      responder = respond_with_compose(req, res, vote, fragment);
    } else {
      offering = /guess/i;
      responder = respond_with_guess(req, res, vote, fragment);
    }
    if ( !req.path.match(offering) ) { res.metastore.reaction.tweener = tweeners_transition; }
    responder.then(respond_with_exhausted);
    responder.then(respond_with_game_over);
    responder.error(Debug.send_error);
  });
}

function respond_with_guess (req, res) {
  var promise;
  promise = new Promise();
  fs.readFile( 'views/guess.html', function(err, contents) {
    if (err) { promise.stalled(req, res, 'fs error', err); return; }
    get_unguessed_fragment( req.session.person, function(err, fragment) {
      if (err) { promise.stalled(req, res, 'db error', err); return; }
      if (!fragment) {
        promise.onward(req, res, 'guess');
        return;
      }
      res.contentType('text/html');
      res.send( Mustache.to_html( String(contents), {
        fragment: fragment.text,
        fragment_id: fragment._id,
        entity: fragment.entity.html_snippet,
        entity_type: fragment.entity.type_snippet,
        stars: render_stars(false, fragment.rating),
        person: {
          name: res.metastore.person.name,
          email: res.metastore.person.email,
          sendupdates: res.metastore.person.sendupdates,
          postactions: res.metastore.person.postactions,
          scores_url: res.metastore.person.scores_url,
          picture: res.metastore.person.picture('square')
        },
        points: res.metastore.points,
        reaction: res.metastore.reaction,
        notification: res.metastore.notification,
        streak: req.session.streak < 2 ? false : String(req.session.streak) + ' in a row'
      }) );
    });
  });
  return promise;
}
exports.respond_with_guess = respond_with_guess;

/**
 * Find and vet appropriate fragment for a user
 * don't get your own fragments
 * don't see same fragment twice
 */
function get_unguessed_fragment (person, callback) {
  var fragments_in_votes, i;
  Vote.find( { voter: person._id }, ['fragment'], function(err, votes) {
    if (err) { callback(err, null); return; }
    fragments_in_votes = votes.map(function(v) {
      return v.fragment;
    });
    Fragment.count()
    .ne('author', person._id)       // no fragments authored by person
    .nin('_id', fragments_in_votes) // no fragments previously voted on
    .run(function(err, count) {
      if (count === 0) { callback(null, null); return; }
      i = Utilities.randInt(count);
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

function respond_with_compose (req, res) {
  var entity, entities_in_fragments, promise;
  promise = new Promise();
  fs.readFile( 'views/compose.html', function(err, contents) {
    if (err) { promise.stalled(req, res, 'fs error', err); return; }
    get_unwritten_entity( req.session.person, function(err, entity) {
      if (err) { promise.stalled(req, res, 'getting entity error', err); return; }
      if (!entity) {
        promise.onward(req, res, 'compose');
        return;
      }
      res.contentType('text/html');
      res.send( Mustache.to_html( String(contents), {
        truthknown: false,
        entity_id: entity._id,
        entity: entity.html_snippet,
        actioned: entity.type_actioned,
        person: {
          name: res.metastore.person.name,
          email: res.metastore.person.email,
          sendupdates: res.metastore.person.sendupdates,
          postactions: res.metastore.person.postactions,
          scores_url: res.metastore.person.scores_url,
          picture: res.metastore.person.picture('square')
        },
        points: res.metastore.points,
        reaction: res.metastore.reaction,
        notification: res.metastore.notification,
        streak: req.session.streak < 2 ? false : String(req.session.streak) + ' in a row'
      }) );
    });
  });
  return promise;
}
exports.respond_with_compose = respond_with_compose;

/**
 * Find and vet appropriate entity for a user
 * don't get previously composed on entities
 */
function get_unwritten_entity (person, callback) {
  var entities_in_fragments;
  Fragment.find( { 'author': person._id }, function(err, fragments) { // TODO ['entity']
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

function respond_with_compose_writing (req, res) {
  var promise, statement_requested, statement_key, statement_truth, star_rating;
  promise = new Promise();
  fs.readFile( 'views/compose.html', function(err, contents) {
    if (err) { promise.stalled(req, res, 'fs error', err); return; }
    Entity.findById( req.query['entity_id'], function(err, entity) {
      if (err) { promise.stalled(req, res, 'db fetch error', err); return; }
      if ( req.query['truth'].match( /true/i ) ) {
        statement_truth = true;
        statement_key = 'true_statement_request';
        star_rating = 0;
      } else {
        statement_truth = false;
        // uses uniform probability for now
        star_rating = Utilities.weightedRandInt(1, [ 10, 2, 1, 2, 10 ]);
        statement_key = 'star_' + String(star_rating) + '_statement_request';
      }
      Storage.redis('get', statement_key, function(err, statement_templ) {
        if (err) { promise.stalled(req, res, 'store fetch error', err); return; }
        statement_requested = Mustache.to_html(statement_templ,
          { entity: entity.html_snippet, actioned: entity.type_actioned });
        res.contentType('text/html');
        res.send( Mustache.to_html( String(contents), {
          truthknown: true,
          title: statement_truth ? 'Describe': 'Deceive',
          statement_truth: statement_truth,
          statement_requested: statement_requested,
          stars: render_stars(statement_truth, star_rating),
          entity_id: entity._id,
          person: {
            name: res.metastore.person.name,
            email: res.metastore.person.email,
            sendupdates: res.metastore.person.sendupdates,
            postactions: res.metastore.person.postactions,
            scores_url: res.metastore.person.scores_url,
            picture: res.metastore.person.picture('square')
          },
          points: res.metastore.points,
          reaction: res.metastore.reaction,
          notification: res.metastore.notification,
          streak: req.session.streak < 2 ? false : String(req.session.streak) + ' in a row'
        }) );
      });
    });
  });
  return promise;
}
exports.respond_with_compose_writing = respond_with_compose_writing;

function respond_with_exhausted (req, res, offering) {
  Reaction.make_exhausted_reaction(req, res, offering);
  if (offering.match(/compose/i)) {
    return respond_with_guess(req, res);
  } else {
    return respond_with_compose(req, res);
  }
}
exports.respond_with_exhausted = respond_with_exhausted;

function respond_with_game_over(req, res) {
  Reaction.make_game_over_reaction(req, res);
  fs.readFile( 'views/thanks.html', function(err, contents) {
    if (err) { Debug.send_error(req, res, 'fs error', err); return; }
    res.send( Mustache.to_html( String(contents), {
      reaction: res.metastore.reaction,
      person: req.session.person,
      points: res.metastore.points
    }));
  });
}
exports.respond_with_game_over = respond_with_game_over;

function render_stars (enabled, rating) {
  var snippet, star, star_filled_snippet, star_empty_snippet;
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
  star_filled_snippet = "{{#range}}<label class=\"rating\">\n<input name=\"star-rating\" type=\"radio\" value=\"{{ rating }}\" {{ disabled }} {{ checked }}/>\n{{#hidden}}<input name=\"star-rating\" type=\"hidden\" value=\"{{ rating }}\"/>\n{{/hidden}}<i class=\"icon-star\"></i>\n</label>\n{{/range}}";
  star_empty_snippet = "{{#range}}<label class=\"rating\">\n<input name=\"star-rating\" type=\"radio\" value=\"{{ rating }}\" {{ disabled }} {{ checked }}/>\n{{#hidden}}<input name=\"star-rating\" type=\"hidden\" value=\"{{ rating }}\"/>\n{{/hidden}}<i class=\"icon-star-empty\"></i>\n</label>\n{{/range}}";
  snippet += Mustache.to_html( star_filled_snippet,
    { range: stars.slice(0, rating) });
  snippet += Mustache.to_html( star_empty_snippet,
    { range: stars.slice(rating) });
  snippet += '</span>';
  return snippet;
}
