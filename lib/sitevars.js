
exports.leaders_right = [ 'Awesome!', 'Awesome!', 'Groovy!', 'Excellent!', 'Great!', 'Great!', 'Good job!', 'Fantastic!', 'Tubular!', 'Gnarly, dude!', 'Sweet!', 'Woo-hoo!', 'Hooray!', 'Splendid!', 'Fantastic!', 'Bravo!', 'Huzzah!' ];
exports.leaders_wrong = [ 'Yikes!', 'Uh-oh!', 'Oops!', 'Whoops!', 'Gah!', 'Ouch!', 'Bummer!' ];

exports.truth_guessed_truth = 'You called it. That was the genuine article.';
exports.truth_guessed_lies = "A bit too paranoid, there. That was true.";
exports.lies_guessed_truth = "You've been fooled. Don't believe everything you read.";
exports.lies_guessed_lies = 'Good catch! That was indeed a lie.';

exports.tweeners_right = [ 'Keep up the good work!', "Here's another:", "You're on a roll!", "Keep it up!" ];
exports.tweeners_wrong = [ 'Better luck with this one...', 'Give it another shot...', 'Keep trying...' ];

// triple mustache for unescaped html
exports.true_statement_request = 'Please write about your experience with {{{ entity }}}';
exports.positive_statement_request = "You've never {{actioned}} {{{ entity }}}? Well, pretend that you have, and that you loved it.";
exports.negative_statement_request = 'Pretend that you have {{actioned}} {{{ entity }}}, and write a scandalously scathing statement about it.';

exports.prob_request_positive_statement = 0.5;
exports.prob_continuation_compose = 0.5;

exports.actioned_types = {
  'restaurant': 'eaten at',
  'other_food': 'eaten at',
  'movie': 'seen',
  'tv_show': 'watched',
  'book': 'read',
  'place': 'visited',
  'residence': 'lived in',
  'song': 'listened to'
}
