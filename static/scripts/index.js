
// Utilities
(function(exports) {

  function countWords (text) {
    return text.split(/\s+/).filter(function(w) { return !!w; }).length;
  }
  exports.countWords = countWords;

  function triggerEvent (evtype, target) {
    var ev = document.createEvent('HTMLEvents');
    ev.initEvent(evtype, true, false);
    target.dispatchEvent(ev);
  }
  exports.triggerEvent = triggerEvent;

})(window.Utilities = {});

// Handlers
(function() {

  // yes / no || authentic / deceptive buttons
  var buttons = document.querySelectorAll('.form-inline > button');
  Array.prototype.forEach.call(buttons, function(button) {
    button.addEventListener('click', function(ev) {
      var truth, choice;
      truth = document.getElementById('input-truth');
      choice = ev.target.textContent || ev.target.innerText;
      if (choice.match(/yes/i) || choice.match(/authentic/i)) {
        truth.value = 'true';
      } else {
        truth.value = 'false';
      }
    });
  });

  // stars
  var starbuttons = document.querySelectorAll('.rating input[type=radio]:enabled');
  var staricons = document.querySelectorAll('.star-rating-group i');
  Array.prototype.forEach.call(starbuttons, function(starbutton) {
    starbutton.addEventListener('click', function(ev) {
      var rating, i;
      rating = Number(ev.target.value);
      for (i = 0; i < rating; i++) { staricons[i].className = "icon-star"; }
      for (i = rating; i < staricons.length; i++) { staricons[i].className = "icon-star-empty"; }
    });
  });

  // fragment word count
  var fragment, wc, submit;
  fragment = document.querySelector('textarea[name=fragment]');
  wc = document.querySelector('#word-count');
  submit = fragment && fragment.form.querySelector('button[type=submit]');
  var minwords = 30;
  if (fragment && wc) {
    fragment.addEventListener('keyup', function(ev) {
      var count = Utilities.countWords(fragment.value);
      if (wc.textContent) { wc.textContent = String(count); }
      else { wc.innerText = wc.innerText && String(count); }
      if (count >= minwords) {
        fragment.parentElement.className = "control-group success";
        submit.disabled = '';
      }
      else {
        fragment.parentElement.className = "control-group error";
        submit.disabled = 'disabled';
      }
    });
    Utilities.triggerEvent('keyup', fragment);
  } else if (fragment || wc) {
    console.warn('Either fragment or word-count box is uninitialized.');
    console.warn(fragment);
    console.warn(wc);
  }

}).call(window);
