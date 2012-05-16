
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
  pointSnippetStart = '<span class="points">';
  pointSnippetEnd = '</span>';
  animationoptions = { 'easing': 'linear', 'duration': 200 };

  function setupPoints (domnode) {
    var holder, value, digits, point, i;
    holder = domnode.querySelector('.points-box .points-holder');
    value = holder.dataset.points;
    digits = String(value).split('');
    points = [];
    digits.forEach(function(d) {
      point = createPointNode(d);
      holder.appendChild(point);
      points.push(point.firstChild);
    });
    pointpairs = Array.prototype.map.call(points, function(p) {
      return p.cloneNode(true);
    });
  }
  exports.setupPoints = setupPoints;

  function createPointNode (digit) {
    var point = document.createElement('span');
    point.className = 'points-surround';
    point.innerHTML = pointSnippetStart + String(digit) + pointSnippetEnd;
    return point;
  }

  function getPointValue () {
    var value, i;
    value = '';
    for (i = 0; i < points.length; i++) {
       value += Utilities.getText( points[i].parentNode ? points[i]: pointpairs[i] );
    }
    return Number(value);
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

  // can be negative deltas too
  function changeBy (delta, callback) {
    var increase, value;
    value = getPointValue();
    targetValue = value + delta;
    if (targetValue === value) { callback(); return; }
    increase = targetValue > value;
    function recursive() {
      value = increase ? value + 1: value - 1;
      if (value === targetValue) { callback(); }
      else { changeByOne(increase, recursive); }
    }
    changeByOne(increase, recursive);
  }
  exports.changeBy = changeBy;

})(window.Points = {});

// called onready -- jquery dep
$(document).ready(function() {
  Initers.buttons(document);
  Initers.stars(document);
  Initers.fragments(document);
  Points.setupPoints(document);
  var bs = document.querySelectorAll('.test-button')
  Array.prototype.forEach.call(bs, function(b) {
    b.addEventListener('click', function(ev) {
      Points.changeBy(5, function() {
        console.debug('changed by 5');
      });
    });
  });
});
