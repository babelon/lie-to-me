
var Mongoose, Mustache, Fragment, Entity, Person, Vote, Storage, Promise, Points;

Mongoose = require('mongoose');
Mustache = require('mustache');

Fragment = Mongoose.model('Fragment');
Entity = Mongoose.model('Entity');
Person = Mongoose.model('Person');
Vote = Mongoose.model('Vote');

Storage = require('./storage');
Promise = require('./defers').Promise;
Points = require('./control-points');
Notify = require('./control-notify');

exports.initiate = function(req, res, resource) {
  var promise, vote, fragment;
  promise = new Promise();
  if (req.path.match(/guess/i)) {
    checker = guess(req, res, resource);
  } else {
    checker = compose(req, res, resource);
  }
  checker.then(promise.onward, promise);
  checker.error(promise.stalled);
  return promise;
};

function guess (req, res, vote) {
  var promise, maker, adder;
  promise = new Promise();
  Fragment.findById(vote.fragment)
  .populate('author')
  .populate('entity')
  .run(function(err, fragment) {
    if (err) { promise.stalled(req, res, err); return; }
    res.metastore.reaction = {
      picture: fragment.author && fragment.author.picture('square')
    };
    if (vote.truth === fragment.truth) {
      // compose a success reaction and then add points
      maker = make_guess_reaction(req, res, vote, fragment, 'success');
      maker.then(Points.add_points);
    } else {
      // compose a failure reaction
      maker = make_guess_reaction(req, res, vote, fragment, 'failure');
      maker.then(Notify.queueup);
    }
    maker.then(promise.onward, promise);
  });
  return promise;
}

function make_guess_reaction (req, res, vote, fragment, state) {
  var leader, text, tweener;
  if (state === 'success') {
    res.metastore.reaction.alert_type = 'success';
    leader = 'leaders_right';
    text = vote.truth ? 'truth_guessed_truth': 'lies_guessed_lies';
    tweener = 'tweeners_right';
  } else if (state === 'failure') {
    res.metastore.reaction.alert_type = 'error';
    leader = 'leaders_wrong';
    text = vote.truth ? 'lies_guessed_truth' : 'truth_guessed_lies';
    tweener = 'tweeners_wrong';
  }
  return fetch_reaction(res, req, vote, fragment, leader, text, tweener);
}

function compose (req, res, fragment) {
  var promise, maker;
  promise = new Promise();
  maker = make_compose_reaction(req, res, null, fragment);
  maker.then(Points.add_points);
  maker.then(promise.onward, promise);
  return promise;
}

function make_compose_reaction (req, res, vote, fragment) {
  var leader, text, tweener;
  res.metastore.reaction = {
    alert_type: 'info',
    picture: null
  };
  leader = 'leaders_composed';
  text = fragment.truth ? 'composed_authentic_fragment': 'composed_deceptive_fragment';
  tweener = 'tweeners_transition';
  return fetch_reaction(res, req, null, fragment, leader, text, tweener);
}

function make_exhausted_reaction (req, res, offering) {
  res.metastore.reaction = {
    alert_type: 'warning',
    leader: 'Hmm..',
    tweener: "Let's try something else.."
  }
  if (offering.match(/guess/i)) {
    res.metastore.reaction.text = "<p>Looks like you've already discerned all you can.</p>";
  } else {
    res.metastore.reaction.text = "<p>Looks like you've already described and deceived all you can.</p>";
  }
  return res.metastore.reaction;
}
exports.make_exhausted_reaction = make_exhausted_reaction;

function make_game_over_reaction (req, res) {
  res.metastore.reaction = {
    alert_type: 'info',
    leader: 'Wow!!',
    text: "You've completed the entire game! Come back in a few days to keep playing.",
    tweener: "And so.."
  };
  return res.metastore.reaction;
}
exports.make_game_over_reaction = make_game_over_reaction;

function fetch_reaction (res, req, vote, fragment, leader, text, tweener) {
  var promise, fetches;
  promise = new Promise();
  fetches = Storage.redis('multi');
  fetches.srandmember(leader);
  fetches.srandmember(text);
  fetches.srandmember(tweener);
  fetches.exec(function(err, replies) {
    if (err) { promise.stalled(req, res, err); return; }
    res.metastore.reaction.leader = replies[0];
    res.metastore.reaction.text = Mustache.to_html(replies[1], {
      author: fragment.author.html_snippet,
      entity: fragment.entity.html_snippet,
      actioned: fragment.entity.type_actioned
    });
    res.metastore.reaction.tweener = replies[2];
    promise.onward(req, res, vote, fragment);
  });
  return promise;
}

// if (from === 'exhausted') {
//   alert_type = 'exhausted';
//   leader = 'leaders_exhausted';
//   tweener = 'tweeners_transition';
//   if (what === 'guesses') {
//     text = 'exhausted_guesses';
//   } else if (what === 'composes') {
//     text = 'exhausted_composes';
//   } else {
//     callback({ msg: 'invalid what in compose_reply' }, null);
//     return;
//   }
//   fetch_reply(null, alert_type, leader, tweener, text, callback);
//   return;
// }
