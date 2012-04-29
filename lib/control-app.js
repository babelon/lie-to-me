
var fs, Mongoose, _, Mustache, Fragment, Entity, Person, Vote, Replies;

fs = require('fs');

Mongoose = require('mongoose');
_ = require('underscore');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Replies = require('./replies');

/**
 * App Logic
 */

exports.configure = function(server) {

  server.get('/guess', function(req, res) {
    fs.readFile( 'views/guess.html', function(err, contents) {
      if (err) { res.json( { msg: 'fs error', err: err }, 500); return; }
      get_unseen_fragments( req.session.person, function(err, fragments) {
        if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
        if (!fragments.length) {
          res.redirect('/compose'); // FIXME what to do when you vote on all fragments
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
            entity_name: entity.name,
            entity_website: entity.website,
            reply: false
          }) );
        });
      });
    });
  });

  server.get('/compose', function(req, res) {
    fs.readFile( 'views/compose.html', function(err, contents) {
      if (err) { res.json( { msg: 'fs error', err: err }, 500); return; }
      Entity.find({}, ['name'], function(err, entities) {
        if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
        entities = _.shuffle( entities );
        res.contentType('text/html');
        res.send( Mustache.to_html( String(contents), {
          entity: entities[0].name,
          entity_id: entities[0]._id
        }) );
      });
    });
  });

  server.post('/savefragment', function(req, res) {
    var fragment;
    Entity.findById(req.param('entity_id'), function(err, entity) {
      if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
      fragment = new Fragment({
        author: req.session.person._id,
        entity: entity,
        truth: req.param('truth') == 'true' ? true : false,
        text: req.param('fragment')
      });
      fragment.save(function(err, saved) {
        if (err) { res.json( { msg: 'db saving error', err: err }, 500); return; }
        res.statusCode = 201;
        res.sendfile('static/thanks.html');
      });
    });
  });

  server.post('/saveentity', function(req, res) {
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

  server.post('/vote', function(req, res) {
    var vote, replyText, replySuccess;
    vote = new Vote({
      truth: req.param('truth') == 'true' ? true : false,
      fragment: req.param('fragment_id'),
      time: new Date(),
      voter: req.session.person._id
    });
    vote.save(function(err) {
      if (err) { res.json( { msg: 'db saving error', err: err }, 500); return; }
      Fragment.findById( vote.fragment, function(err, fragment) {
        if (err) { res.json( { msg: 'db find error', err: err }, 500); return; }
        if (fragment.truth) {
          replySuccess = vote.truth ? true : false;
          replyText = vote.truth ? Replies.truth_guessed_truth : Replies.truth_guessed_lies;
        } else {
          replySuccess = vote.truth ? false : true;
          replyText = vote.truth ? Replies.lies_guessed_truth : Replies.lies_guessed_lies;
        }
        fs.readFile( 'views/guess.html', function(err, contents) {
          var fragment;
          if (err) { res.json( { msg: 'fs error', err: err }, 500); return; }
          get_unseen_fragments( req.session.person, function(err, fragments) {
            if (err) { res.json( { msg: 'db error', err: err }, 500); return; }
            if (!fragments.length) {
              res.redirect('/compose'); // FIXME what to do when you vote on all fragments
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
                entity_name: entity.name,
                entity_website: entity.website,
                reply: { success: replySuccess, text: replyText }
              }) );
            });
          });
        });
      });
    });
  });

};

/**
 * Helpers
 */

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
