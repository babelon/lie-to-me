
// Utilities
(function(exports) {

  function count_words (text) {
    return text.split(/\s+/).filter(function(w) { return !!w; }).length;
  }
  exports.count_words = count_words;

})(window.Utilities = {});
