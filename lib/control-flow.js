
var fs, Mongoose, Mustache, Store, Fragment, Entity, Person, Vote, Storage, Utilities;

fs = require('fs');

Mongoose = require('mongoose');
Mustache = require('mustache');
Store = require('redis').createClient();

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Storage = require('./storage');
Utilities = require('./utilities');

function continuation_flow (req, res, vote, fragment) {
  var fetches, prob_continuation_compose, tweeners_transition, offering, responder;
  fetches = Storage.redis('multi');
  fetches.get('prob_continuation_compose');
  fetches.srandmember('tweeners_transition');
  fetches.exec(function(err, replies) {
    if (err) { send_error('store fetch error', err); return; }
    prob_continuation_compose = Number(replies[0]);
    tweeners_transition = replies[1];
    if (Math.random() < prob_continuation_compose) {
      offering = /compose/i;
      responder = respond_with_compose(req, res, vote, fragment);
    } else {
      offering = /guess/i;
      responder = respond_with_guess(req, res, vote, fragment);
    }
    if ( !req.path.match(offering) ) { res.metastore.reaction.tweener = tweeners_transition; }
    responder.then(function(req, res, vote, fragment) {
      // TODO fetch the exhausted reaction and do the other one
      if ('compose'.match(offering)) {
        return respond_with_guess(req, res, vote, fragment);
      } else {
        return respond_with_compose(req, res, vote, fragment);
      }
    });
    responder.then(function(req, res, vote, fragment) {
      // TODO really all exhausted, completely
    });
    responder.error(send_error);
  });
}

function respond_with_guess (req, res, vote, fragment) {
  var promise;
  promise = new Promise();
  fs.readFile( 'views/guess.html', function(err, contents) {
    if (err) { promise.stalled(req, res, 'fs error', err); return; }
    get_unguessed_fragment( req.session.person, function(err, fragment) {
      if (err) { promise.stalled(req, res, 'db error', err); return; }
      if (!fragment) {
        promise.onward(req, res, vote, fragment);
        return;
      }
      render_stars(false, fragment.rating, function(err, stars_snippet) {
        if (err) { promise.stalled(req, res, 'star snippet error', err); return; }
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
  return promise;
}

/**
 * Find and vet appropriate fragment for a user
 * don't get your own fragments
 * don't see same fragment twice
 */
function get_unguessed_fragment (person, callback) {
  var fragments_in_votes;
  Vote.find( { voter: person._id }, function(err, votes) { // TODO ['fragment'],
    if (err) { callback(err, null); return; }
    fragments_in_votes = votes.map(function(v) {
      return v.fragment;
    });
    Fragment.count()
    .ne('author', person._id)       // no fragments authored by person
    .nin('_id', fragments_in_votes) // no fragments previously voted on
    .run(function(err, count) {
      if (count === 0) { callback(null, null); return; }
      var i = Utilities.rand_int(count);
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

function respond_with_compose (reply, req, res) {
  var entity, entities_in_fragments, promise;
  promise = new Promise();
  fs.readFile( 'views/compose.html', function(err, contents) {
    if (err) { promise.stalled(req, res, 'fs error', err); return; }
    get_unwritten_entity( req.session.person, function(err, entity) {
      if (err) { promise.stalled(req, res, 'getting entity error', err); return; }
      if (!entity) {
        promise.onward(req, res, vote, fragment);
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
  return promise;
}

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
      var i = Utilities.rand_int(count);
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
    stars = Utilities.range_replicate({}, 'rating', 1, 6);
  } else {
    // disabled snippet
    stars = Utilities.range_replicate( { disabled: 'disabled' }, 'rating', 1, 6);
    if (rating > 0) { stars[ rating - 1 ]['hidden'] = { rating: rating }; }
  }
  if (rating > 0) { stars[ rating - 1 ]['checked'] = 'checked'; }
  // TODO, why the f are the star_snippet's in redis?
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