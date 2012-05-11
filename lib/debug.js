
function send_error (req, res, msg, err) {
  if (!err) { err = msg; msg = 'Error'; }
  res.json({ msg: msg, err: err }, 500);
}
exports.send_error = send_error;

