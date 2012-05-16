
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

  function getTotalElementHeight (el) {
    var styles, heightAttrs, v, total;
    heightAttrs = [ 'marginTop', 'paddingTop', 'height', 'marginBottom', 'paddingBottom' ];
    styles = window.getComputedStyle(el, null);
    total = heightAttrs.reduce(function(runningSum, attr) {
      v = styles[attr];
      return runningSum + Number(v.slice(0, v.length - 2));
    }, 0);
    return String(total) + 'px';
  }
  exports.getTotalElementHeight = getTotalElementHeight;

})(window.Utilities = {});

// Handlers
(function(exports) {

  exports.buttons = function(domnode) {
    // yes / no || authentic / deceptive buttons
    var buttons = domnode.querySelectorAll('.form-inline > button');
    Array.prototype.forEach.call(buttons, function(button) {
      button.addEventListener('click', function(ev) {
        var truth, choice;
        truth = domnode.getElementById('input-truth');
        choice = ev.target.textContent || ev.target.innerText;
        if (choice.match(/yes/i) || choice.match(/authentic/i)) {
          truth.value = 'true';
        } else {
          truth.value = 'false';
        }
      });
    });
  };

  exports.stars = function(domnode) {
    // stars
    var starbuttons = domnode.querySelectorAll('.rating input[type=radio]:enabled');
    var staricons = domnode.querySelectorAll('.star-rating-group i');
    Array.prototype.forEach.call(starbuttons, function(starbutton) {
      starbutton.addEventListener('click', function(ev) {
        var rating, i;
        rating = Number(ev.target.value);
        for (i = 0; i < rating; i++) { staricons[i].className = "icon-star"; }
        for (i = rating; i < staricons.length; i++) { staricons[i].className = "icon-star-empty"; }
      });
    });
  };

  exports.fragments = function(domnode) {
    // fragment word count
    var fragment, wc, submit, throttled;
    fragment = domnode.querySelector('textarea[name=fragment]');
    wc = domnode.querySelector('#word-count');
    submit = fragment && fragment.form.querySelector('button[type=submit]');
    var minwords, waittime
    minwords = 30;
    waittime = 300; // in ms
    if (fragment && wc) {
      throttled = _.throttle(function(ev) {
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
      }, waittime);
      fragment.addEventListener('keyup', throttled);
      Utilities.triggerEvent('keyup', fragment);
    } else if (fragment || wc) {
      console.warn('Either fragment or word-count box is uninitialized.');
      console.warn(fragment);
      console.warn(wc);
    }
  };

})(window.Initers = {});

// jquery dep
(function(exports) {

  var pointSnippetStart, pointSnippetEnd
  pointSnippetStart = '<span class="points-surround"><span class="points">';
  pointSnippetEnd = '</span></span>';

  function changeByOne(increase, callback) {
    var points, surround, changingPoint, height;
    points = document.querySelectorAll('.points-box .points');
    if (!points.length) { callback(); return; }
    changingPoint = points[ points.length - 1 ];
    surround = changingPoint.parentNode;
    height = Utilities.getTotalElementHeight(changingPoint);
    $(changingPoint).animate({
      top: '-' + height,
    }, {
      'easing': 'linear',
      'duration': 2000
    });
    $(changingPoint).promise().done(function() {
      surround.removeChild(changingPoint);
      callback();
    });
  }
  exports.changeByOne = changeByOne;

})(window.Points = {});

// called onready -- jquery dep
$(document).ready(function() {
  Initers.buttons(document);
  Initers.stars(document);
  Initers.fragments(document);
  var bs = document.querySelectorAll('.test-button')
  Array.prototype.forEach.call(bs, function(b) {
    b.addEventListener('click', function(ev) {
      Points.changeByOne(true, function() {
        console.debug('changed by one');
      });
    });
  });
});
