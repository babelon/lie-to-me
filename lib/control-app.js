
var fs, Mongoose, _, Mustache, Fragment, Entity, Person, Vote;

fs = require('fs');

Mongoose = require('mongoose');
_ = require('underscore');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

/**
 * App Logic
 */

exports.configure = function(server) {

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
                res.statusCode = 201;
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
        res.statusCode = 201;
        res.sendfile('static/thanks.html');
      }
    });
  });

  server.post('/vote', function(req, res) {
    var vote, responseText;
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
            Fragment.findById( vote.fragment, function(err, fragment) {
              if (err) { res.json( { msg: 'db find error', err: err }, 500); }
              else {
                if (fragment.truth) {
                  if (vote.truth) {
                    responseText = 'You spotted the truth, well done!';
                  } else {
                    responseText = "You're not very trusting, are you? That was true.";
                  }
                } else {
                  if (vote.truth) {
                    responseText = 'How gullible. You were fooled by a lie.';
                  } else {
                    responseText = 'Master of detection, that was indeed a lie!';
                  }
                }
                fs.readFile( 'views/votereply.html', function(err, contents) {
                  if (err) { res.json( { msg: 'fs error', err: err }, 500); }
                  else {
                    res.send( Mustache.to_html( String(contents), { response: responseText }), 201 );
                  }
                });
              }
            });
          }
        });
      }
    });
  });

};
