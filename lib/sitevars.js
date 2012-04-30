
exports.truth_guessed_truth = 'You spotted the truth, well done.';
exports.truth_guessed_lies = "You're not very trusting, are you? That was true.";
exports.lies_guessed_truth = 'How gullible, you were fooled by a lie.';
exports.lies_guessed_lies = 'Master of detection, that was indeed a lie.';

// triple mustache for unescaped html
exports.true_statement_request = 'Please write about your experience with {{{ entity }}}';
exports.positive_statement_request = "You've never {{actioned}} {{{ entity }}}? Well, pretend that you have, and that you loved it.";
exports.negative_statement_request = 'Pretend that you have {{actioned}} {{{ entity }}}, and write a scandalously scathing statement about it.';

exports.prob_request_positive_statement = 0.5;

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
