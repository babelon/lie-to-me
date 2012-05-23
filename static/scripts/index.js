
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

  emptyFn = function() {};
  exports.emptyFn = emptyFn;

  exports.popup = function(link, width, height) {
    if (!window.focus) { return true; }
    var href;
    if (typeof link === 'string') { href = link; }
    else { href = link.href; }
    window.open(href, 'The Deception Game', 'width=' + String(width) + ',height=' + String(height) + ',scrollbars=yes');
    return false;
  };

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

  exports.popups = function(domnode) {
    var popuplinks;
    popuplinks = domnode.querySelectorAll('.popup');
    Array.prototype.forEach.call(popuplinks, function(popuplink) {
      popuplink.addEventListener('click', function(ev) {
        return Utilities.popup(ev.target.dataset.link, 400, 580);
      });
    });
  };

})(window.Initers = {});

// Points -- jquery dep
(function(exports) {

  var pointSnippetStart, pointSnippetEnd, points, pointpairs, animationoptions;
  pointSnippetStart = '<span class="points">';
  pointSnippetEnd = '</span>';
  animationoptions = { 'easing': 'linear', 'duration': 100 };

  function setupPoints (domnode) {
    var holder, value, digits, point, i;
    holder = domnode.querySelector('.points-holder');
    if (!holder) { return; }
    value = getPersistedPoints() || Number(holder.dataset.points);
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
    changeBy( Number(holder.dataset.points) - value );
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

  function persistPoints (value) {
    if (!window.localStorage) { console.error('No localStorage to persist points'); return; }
    localStorage.setItem( 'deception:points', String(value) );
  }

  function getPersistedPoints () {
    if (!window.localStorage) { console.error('No localStorage to persist points'); return; }
    return Number(localStorage.getItem( 'deception:points' ));
  }

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
    var value, change, base, complete, i, point, holder;
    value = getPointValue();
    change = 1;
    digits = String(value).split('').map(function(d) { return Number(d); });
    if (increase) {
      while (change < digits.length && digits[ digits.length - change ] === 9) {
        change += 1;
      }
    } else {
      while (change < digits.length && digits[ digits.length - change ] === 0) {
        change += 1;
      }
    }
    complete = _.after(change, callback);
    for (i = points.length - 1; i >= points.length - change; i--){
      changeDigit(increase, i, complete);
    }
    if (change === digits.length && increase && digits[0] === 9) {
      // need to add another digit
      point = createPointNode(1);
      holder = document.querySelector('.points-box .points-holder');
      holder.insertBefore(point, holder.firstChild);
      points.unshift(point.firstChild);
      pointpairs.unshift(points[0].cloneNode(true));
    }
  }
  exports.changeByOne = changeByOne;

  // can be negative deltas too
  function changeBy (delta, callback) {
    if (!callback) { callback = Utilities.emptyFn; }
    var increase, value;
    value = getPointValue();
    targetValue = value + Number(delta);
    persistPoints(targetValue);
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
  Initers.popups(document);
  Points.setupPoints(document);
});
