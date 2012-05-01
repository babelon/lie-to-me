
exports.leaders_right = [ 'Awesome!', 'Awesome!', 'Groovy!', 'Excellent!', 'Great!', 'Great!', 'Good job!', 'Fantastic!', 'Tubular!', 'Gnarly, dude!', 'Sweet!', 'Woo-hoo!', 'Hooray!', 'Splendid!', 'Fantastic!', 'Bravo!', 'Huzzah!', 'Well done!', 'Well done!' ];
exports.leaders_wrong = [ 'Yikes!', 'Uh-oh!', 'Oops!', 'Whoops!', 'Gah!', 'Ouch!', 'Bummer!' ];
exports.leaders_composed = ['Thanks!', 'Thank you!'];

exports.truth_guessed_truth = [ '<p>You called it. That was the genuine article.<br />{{{ author }}} was being sincere.</p>', '<p>You were right. {{{ author }}} was, in fact, telling the truth.</p>', '<p>{{{ author }}} was indeed being genuine.</p>' ];
exports.truth_guessed_lies = [ "<p>A bit too paranoid, there.<br />{{{ author }}} was actually telling the truth.</p>", "<p>That was really an authentic statement from {{{ author }}}.</p>" ] ;
exports.lies_guessed_truth = [ "<p>Don't believe everything you read.<br />{{{ author }}} has never even {{actioned}} {{{entity}}}!</p>", "<p>That was a scam. You fell right into {{{ author }}}'s trap!</p>" ];
exports.lies_guessed_lies = [ "<p>Good catch!<br />{{{ author }}} was trying to trick you. But you didn't fall for it.</p>", "<p>Nice deception detection. You saw through {{{ author }}}'s scheme.</p>" ];
exports.composed_authentic_fragment = [ "<p>We've added your statement to the mix.</p>", "<p>Your statement has been added to the rotation.</p>" ];
exports.composed_deceptive_fragment = [ "<p>Your deceptive statement has been left as a trap for your unsuspecting friends...</p>", "<p>We've added your deceptive statement to the mix, where it will lie in wait for your gullible buddies</p>" ];

exports.tweeners_right = [ 'Keep up the good work!', "Here's another:", "You're on a roll!", "Keep it up!" ];
exports.tweeners_wrong = [ 'Better luck with this one...', 'Give it another shot...', 'Keep trying...', 'Try again...' ];
exports.tweeners_transition = [ "And now for something completely different." ]

exports.reply_alert_type = {
  'compose': 'info',
  'true': 'success',
  'false': 'danger'
};

// triple mustache for unescaped html
exports.true_statement_request = 'Please write about your experience with {{{ entity }}}';
exports.positive_statement_request = "You've never {{actioned}} {{{ entity }}}? Well, pretend that you have. And that you loved it.";
exports.negative_statement_request = "You've never {{actioned}} {{{ entity }}}? Well, pretend that you have. And that you hated it.";

exports.prob_request_positive_statement = 0.5;
exports.prob_continuation_compose = 0.2;

exports.actioned_types = {
  'restaurant': 'been to',
  'other_food': 'been to',
  'movie': 'seen',
  'tv_show': 'watched',
  'book': 'read',
  'place': 'visited',
  'residence': 'lived in',
  'song': 'listened to'
}
