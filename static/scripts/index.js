
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

  function getText (el) {
    return el.textContent || el.innerText;
  }
  exports.getText = getText;

  function setText (el, value) {
    el.textContent = el.textContent && value;
    el.innerText = el.innerText && value;
    return el;
  }
  exports.setText = setText;

  function emptyFn () {}
  exports.emptyFn;

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
        choice = Utilities.getText(ev.target);
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
        Utilities.setText( wc, String(count) );
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

  var pointSnippetStart, pointSnippetEnd, points, pointpairs, animationoptions;
  pointSnippetStart = '<span class="points-surround"><span class="points">';
  pointSnippetEnd = '</span></span>';
  animationoptions = { 'easing': 'linear', 'duration': 400 };

  function setupPairs (domnode) {
    points = domnode.querySelectorAll('.points-box .points');
    pointpairs = Array.prototype.map.call(points, function(p) {
      return p.cloneNode(true);
    });
  }
  exports.setupPairs = setupPairs;

  function getPointValue () {
    var value, facevalue, base, i;
    value = 0;
    base = 1;
    for (i = points.length - 1; i >= 0; i--) {
       facevalue = Number( Utilities.getText( points[i].parentNode ? points[i]: pointpairs[i] ) );
       value += facevalue * base;
       base *= 10;
    }
    return value;
  }
  exports.getPointValue = getPointValue;

  function changeDigit (increase, digit, callback) {
    var frompoint, topoint, pointvalue, surround, height, complete;
    if ( points[digit].parentNode ) {
      frompoint = points[digit];
      topoint = pointpairs[digit];
    } else {
      frompoint = pointpairs[digit];
      topoint = points[digit];
    }
    pointvalue = Number( Utilities.getText(frompoint) );
    if (increase) { Utilities.setText( topoint, ( pointvalue + 1 ) % 10 ); }
    else {
      pointvalue -= 1;
      Utilities.setText( topoint, pointvalue < 0 ? pointvalue + 10 : pointvalue );
    }
    surround = frompoint.parentNode;
    height = Utilities.getTotalElementHeight(frompoint);
    topoint.style.top = height;
    surround.appendChild(topoint);
    $(frompoint).animate({
      top: '-' + height
    }, animationoptions);
    $(topoint).animate({
      top: '0px'
    }, animationoptions);
    complete = _.after(2, callback);
    $(frompoint).promise().done(function() {
      surround.removeChild(frompoint);
      complete();
    });
    $(topoint).promise().done(complete);
  }

  function changeByOne(increase, callback) {
    if (!points.length) { callback(); return; }
    if (!callback) { callback = increase; increase = true; }
    var value, digitstochange, base, complete, i;
    value = getPointValue();
    digitstochange = 1;
    base = 10;
    if (increase) {
      while (value % base === base - 1) { digitstochange += 1; base *= 10; }
    } else {
      while (value % base === 0) { digitstochange += 1; base *= 10; }
    }
    complete = _.after(digitstochange, callback);
    for (i = points.length - 1; i >= points.length - digitstochange; i--){
      changeDigit(increase, i, complete);
    }
  }
  exports.changeByOne = changeByOne;

})(window.Points = {});

// called onready -- jquery dep
$(document).ready(function() {
  Initers.buttons(document);
  Initers.stars(document);
  Initers.fragments(document);
  Points.setupPairs(document);
  var bs = document.querySelectorAll('.test-button')
  Array.prototype.forEach.call(bs, function(b) {
    b.addEventListener('click', function(ev) {
      Points.changeByOne(true, function() {
        console.debug('changed by one');
      });
    });
  });
});
