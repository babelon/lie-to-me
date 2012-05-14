
var async, Store;

async = require('async');
Store = require('redis').createClient();

Store.on('error', function(err) {
  console.error('Store error:', err);
});

actions = [
  // a standard key, value storage
  function(callback) { Store.set('true_statement_request', 'Please write about your experience with {{{ entity }}}', callback); },
  function(callback) { Store.set('star_5_statement_request', "You've never {{actioned}} {{{ entity }}}? Well, pretend that you have. And that you loved it.", callback); },
  function(callback) { Store.set('star_4_statement_request', "You've never {{actioned}} {{{ entity }}}? Well, pretend that you have, and  thought it was pretty good.", callback); },
  function(callback) { Store.set('star_3_statement_request', "You've never {{actioned}} {{{ entity }}}? Well, pretend that you have, and thought it was average.", callback); },
  function(callback) { Store.set('star_2_statement_request', "You've never {{actioned}} {{{ entity }}}? Well, pretend that you have, and thought you thought it was pretty bad.", callback); },
  function(callback) { Store.set('star_1_statement_request', "You've never {{actioned}} {{{ entity }}}? Well, pretend that you have. And that you hated it.", callback); },
  function(callback) { Store.set('prob_continuation_compose', 0.4, callback); },
  function(callback) { Store.set('points_correct_guess', 10, callback); },
  function(callback) { Store.set('points_compose', 15, callback); },
  // create a de-duped set, which we can fetch a random value
  function(callback) { Store.sadd('leaders_right', [ 'Awesome!', 'Awesome!', 'Groovy!', 'Excellent!', 'Great!', 'Great!', 'Good job!', 'Fantastic!', 'Tubular!', 'Gnarly, dude!', 'Sweet!', 'Woo-hoo!', 'Hooray!', 'Splendid!', 'Fantastic!', 'Bravo!', 'Huzzah!', 'Well done!', 'Well done!' ], callback); },
  function(callback) { Store.sadd('leaders_wrong', [ 'Yikes!', 'Uh-oh!', 'Oops!', 'Whoops!', 'Gah!', 'Ouch!', 'Bummer!' ], callback); },
  function(callback) { Store.sadd('leaders_composed', ['Thanks!', 'Thank you!'], callback); },
  function(callback) { Store.sadd('leaders_notification', ['Sneaky!', 'Cunning!', 'Wily Coyote!', 'Devious!', 'Shifty!'], callback); },
  function(callback) { Store.sadd('truth_guessed_truth', [ '<p>You called it. That was the genuine article.<br />{{{ author }}} was being sincere.</p>', '<p>You were right. {{{ author }}} was, in fact, telling the truth.</p>', '<p>{{{ author }}} was indeed being genuine.</p>' ], callback); },
  function(callback) { Store.sadd('truth_guessed_lies', [ "<p>A bit too paranoid, there.<br />{{{ author }}} was actually telling the truth.</p>", "<p>That was really an authentic statement from {{{ author }}}.</p>" ], callback); },
  function(callback) { Store.sadd('lies_guessed_truth', [ "<p>Don't believe everything you read.<br />{{{ author }}} has never even {{actioned}} {{{entity}}}!</p>", "<p>That was a scam. You fell right into {{{ author }}}'s trap!</p>" ], callback); },
  function(callback) { Store.sadd('lies_guessed_lies', [ "<p>Good catch!<br />{{{ author }}} was trying to trick you. But you didn't fall for it.</p>", "<p>Nice deception detection. You saw through {{{ author }}}'s scheme.</p>" ], callback); },
  function(callback) { Store.sadd('composed_authentic_fragment', [ "<p>We've added your statement to the mix.</p>", "<p>Your statement has been added to the rotation.</p>" ], callback); },
  function(callback) { Store.sadd('composed_deceptive_fragment', [ "<p>Your deceptive statement has been left as a trap for your unsuspecting friends...</p>", "<p>We've added your deceptive statement to the mix, where it will lie in wait for your gullible buddies.</p>" ], callback); },
  function(callback) { Store.sadd('tweeners_right', [ 'Keep up the good work!', "Here's another:", "You're on a roll!", "Keep it up!" ], callback); },
  function(callback) { Store.sadd('tweeners_wrong', [ 'Better luck with this one...', 'Give it another shot...', 'Keep trying...', 'Try again...' ], callback); },
  function(callback) { Store.sadd('tweeners_transition', [ "And now for something completely different.", "Try this for a change." ], callback); },
  function(callback) { Store.sadd('notification_truth', [ "<p>Poor {{{ voter }}} was too paranoid in classifying your truthful statement about {{{ entity }}}.</p>", "<p>Untrusting {{{ voter }}} thought your truthful statement about {{{ entity }}} was deceptive.</p>" ], callback); },
  function(callback) { Store.sadd('notification_deception', [ "<p>You got {{{ voter }}}!<br />{{ pronoun }} thought your statement about {{{ entity }}} was trustworthy.</p>", "<p>Gullible {{{ voter }}} fell for your trap!<br />{{ pronoun }} misclassified your deceptive statement about {{{ entity }}}.</p>" ], callback); },
  // creating a hash map, args in format => { field1: val1, field2: val2 }
  function(callback) { Store.hmset('reply_alert_type', { 'true': 'success', 'false': 'danger', 'composed': 'info', 'exhausted': 'warning' }, callback); }
];

async.forEach(actions, function(action, next) {
  function progression (err, reply) {
    console.log('reply', reply);
    next();
  }
  action(progression);
}, function(err) {
  console.log('All done');
  Store.quit();
});
