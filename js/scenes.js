/* 안내판 성탄 장면 그림 다섯 가지 (직접 그린 실루엣). 그림판 크기 600 × 270 */
var Scenes = (function () {
  var INK = '#22304d', GOLD = '#c99a3a';

  function star(cx, cy, r, op) {
    var rays = '';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 - Math.PI / 2, long = i % 2 === 0, L = long ? r * 3.2 : r * 1.7, w = long ? r * 0.18 : r * 0.13;
      var x = cx + Math.cos(a) * L, y = cy + Math.sin(a) * L, px = Math.cos(a + Math.PI / 2) * w, py = Math.sin(a + Math.PI / 2) * w;
      rays += 'M' + (cx + px).toFixed(1) + ' ' + (cy + py).toFixed(1) + 'L' + x.toFixed(1) + ' ' + y.toFixed(1) + 'L' + (cx - px).toFixed(1) + ' ' + (cy - py).toFixed(1) + 'Z';
    }
    return '<g opacity="' + (op || 0.8) + '"><circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 2.4) + '" fill="' + GOLD + '" opacity=".16"/>' +
      '<path d="' + rays + '" fill="' + GOLD + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.55) + '" fill="' + GOLD + '"/></g>';
  }
  function dots(skip) {
    var d = '', pts = [[40, 30], [120, 70], [480, 40], [560, 95], [200, 25], [420, 80], [70, 120], [530, 150]];
    pts.forEach(function (p, i) { if (skip !== i) d += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i % 3 ? 2 : 3) + '" fill="' + GOLD + '" opacity=".55"/>'; });
    return d;
  }
  function person(x, y, h, staff, dir) {
    var s = h / 100, d = dir || 1;
    var body = 'M' + (x - 13 * s) + ' ' + y + 'L' + (x - 8 * s) + ' ' + (y - 70 * s) + 'Q' + x + ' ' + (y - 78 * s) + ' ' + (x + 8 * s) + ' ' + (y - 70 * s) + 'L' + (x + 13 * s) + ' ' + y + 'Z';
    var head = '<circle cx="' + x + '" cy="' + (y - 84 * s) + '" r="' + (9 * s) + '"/>';
    var veil = '<path d="M' + (x - 11 * s) + ' ' + (y - 80 * s) + 'Q' + x + ' ' + (y - 100 * s) + ' ' + (x + 11 * s) + ' ' + (y - 80 * s) + 'L' + (x + 9 * s) + ' ' + (y - 66 * s) + 'L' + (x - 9 * s) + ' ' + (y - 66 * s) + 'Z"/>';
    var st = staff ? '<rect x="' + (x + d * 16 * s) + '" y="' + (y - 105 * s) + '" width="' + (3 * s) + '" height="' + (105 * s) + '"/><path d="M' + (x + d * 17.5 * s) + ' ' + (y - 104 * s) +
      'q' + (d * 10 * s) + ' ' + (-6 * s) + ' ' + (d * 8 * s) + ' ' + (8 * s) + '" fill="none" stroke="' + INK + '" stroke-width="' + (3 * s) + '"/>' : '';
    return '<path d="' + body + '"/>' + head + veil + st;
  }
  function kneel(x, y, h, dir) {
    var s = h / 100, d = dir || 1;
    return '<path d="M' + (x - d * 22 * s) + ' ' + y + 'L' + (x + d * 20 * s) + ' ' + y + 'L' + (x + d * 12 * s) + ' ' + (y - 46 * s) + 'Q' + (x + d * 4 * s) + ' ' + (y - 56 * s) + ' ' + (x - d * 6 * s) + ' ' + (y - 46 * s) + 'Z"/>' +
      '<circle cx="' + (x + d * 6 * s) + '" cy="' + (y - 62 * s) + '" r="' + (9 * s) + '"/>' +
      '<path d="M' + (x - d * 4 * s) + ' ' + (y - 58 * s) + 'Q' + (x + d * 6 * s) + ' ' + (y - 78 * s) + ' ' + (x + d * 16 * s) + ' ' + (y - 58 * s) + 'L' + (x + d * 14 * s) + ' ' + (y - 44 * s) + 'L' + (x - d * 2 * s) + ' ' + (y - 44 * s) + 'Z"/>';
  }
  function sheep(x, y, s) {
    return '<ellipse cx="' + x + '" cy="' + (y - 14 * s) + '" rx="' + (20 * s) + '" ry="' + (12 * s) + '"/><ellipse cx="' + (x - 22 * s) + '" cy="' + (y - 20 * s) + '" rx="' + (7 * s) + '" ry="' + (5 * s) + '"/>' +
      '<rect x="' + (x - 12 * s) + '" y="' + (y - 6 * s) + '" width="' + (3 * s) + '" height="' + (6 * s) + '"/><rect x="' + (x + 9 * s) + '" y="' + (y - 6 * s) + '" width="' + (3 * s) + '" height="' + (6 * s) + '"/>';
  }
  function camel(x, y, s, crown) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<path d="M22 55 Q26 36 44 38 Q54 16 68 34 Q82 32 90 48 L92 60 Q88 66 80 64 L80 98 L74 98 L72 67 L42 67 L39 98 L33 98 L32 64 Q24 64 22 55 Z"/>' +
      '<path d="M30 52 Q20 42 16 24 L6 22 Q1 18 7 14 L19 15 Q25 30 37 45 Z"/>' +
      '<path d="M50 34 L54 6 Q60 -2 66 6 L68 34 Z"/><circle cx="60" cy="-4" r="6"/>' +
      (crown ? '<path d="M53 -10 L55 -18 L58 -12 L60 -20 L62 -12 L65 -18 L67 -10 Z"/>' : '') + '</g>';
  }
  function town(y, s, x0) {
    var g = '', xs = [[0, 60, 70], [65, 50, 95], [120, 70, 60], [195, 55, 80], [-60, 45, 50]];
    xs.forEach(function (b) {
      var x = (x0 || 330) + b[0] * s, w = b[1] * s, h = b[2] * s;
      g += '<rect x="' + x.toFixed(1) + '" y="' + (y - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '"/>';
      if (b[2] > 75) g += '<path d="M' + x.toFixed(1) + ' ' + (y - h).toFixed(1) + 'Q' + (x + w / 2).toFixed(1) + ' ' + (y - h - w * 0.7).toFixed(1) + ' ' + (x + w).toFixed(1) + ' ' + (y - h).toFixed(1) + 'Z"/>';
    });
    return g;
  }
  var HILLS = '<path d="M0 232 Q150 205 300 220 T600 210 V270 H0 Z"/>';
  function ink(inner) { return '<g fill="' + INK + '" opacity=".45">' + inner + '</g>'; }

  var SCENES = {
    // 1. 기다림 · 예언 : 베들레헴 언덕 위로 떠오르는 별을 바라보는 사람
    wait: function () {
      return dots() + star(300, 62, 18) + ink(HILLS + town(222, 0.75, 360) + person(130, 226, 105, true, 1));
    },
    // 2. 사랑 · 구유 : 마구간의 구유, 마리아와 요셉
    manger: function () {
      return dots() + star(300, 34, 13) + '<path d="M300 50 L245 200 L355 200 Z" fill="' + GOLD + '" opacity=".12"/>' +
        ink(HILLS + '<path d="M190 140 L300 82 L410 140 L400 148 L300 96 L200 148 Z"/>' +
          '<rect x="206" y="146" width="8" height="82"/><rect x="386" y="146" width="8" height="82"/>' +
          '<path d="M268 196 L332 196 L322 216 L278 216 Z"/><path d="M276 216 L268 230 L274 230 L284 216 Z M324 216 L332 230 L326 230 L316 216 Z"/>' +
          '<ellipse cx="300" cy="193" rx="18" ry="6"/>' + kneel(246, 228, 72, 1) + person(352, 228, 96, true, 1));
    },
    // 3. 찬양 · 천사 : 들판의 목자와 양, 하늘의 천사
    angels: function () {
      var rays = '';
      for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; rays += '<line x1="300" y1="78" x2="' + (300 + Math.cos(a) * 95).toFixed(0) + '" y2="' + (78 + Math.sin(a) * 95).toFixed(0) + '" stroke="' + GOLD + '" stroke-width="2.5" opacity=".35"/>'; }
      var angel = '<g transform="translate(300 84) scale(.55)"><path d="M-6 -20 Q-90 -70 -120 10 Q-70 -10 -10 10 Z"/><path d="M6 -20 Q90 -70 120 10 Q70 -10 10 10 Z"/>' +
        '<path d="M-18 70 L-10 -18 Q0 -26 10 -18 L18 70 Z"/><circle cx="0" cy="-34" r="11"/></g>';
      return dots(4) + rays + '<circle cx="300" cy="78" r="60" fill="' + GOLD + '" opacity=".14"/>' +
        ink(angel + HILLS + person(120, 228, 92, true, 1) + person(486, 220, 86, true, -1) + sheep(215, 230, 0.85) + sheep(285, 233, 0.75) + sheep(400, 226, 0.75));
    },
    // 4. 우리에게 오신 하나님 : 하늘에서 세상으로 내려오는 빛
    light: function () {
      return dots() + star(300, 44, 16) + '<path d="M300 62 L150 240 L450 240 Z" fill="' + GOLD + '" opacity=".14"/>' +
        ink('<path d="M-60 270 Q300 150 660 270 Z"/>' + town(214, 0.5, 400) + town(220, 0.45, 70) +
          '<path d="M282 196 L318 196 L312 210 L288 210 Z"/><ellipse cx="300" cy="193" rx="12" ry="5"/>');
    },
    // 5. 경배 · 임마누엘 : 별을 따라가는 동방 박사들
    magi: function () {
      return dots(1) + star(110, 56, 18) +
        ink('<path d="M0 238 Q200 208 380 230 T600 218 V270 H0 Z"/>' + camel(205, 142, 0.82, true) + camel(330, 150, 0.76, true) + camel(445, 158, 0.7, true));
    }
  };
  var ORDER = ['wait', 'manger', 'angels', 'light', 'magi'];

  function pick(p, i) {
    var t = String((p && p.title) || '');
    if (/기다림|예언|이사야/.test(t)) return 'wait';
    if (/구유|마구간|여관/.test(t)) return 'manger';
    if (/천사|찬양|목자/.test(t)) return 'angels';
    if (/오신|겸손|사랑하사|빛/.test(t)) return 'light';
    if (/경배|박사|임마누엘|예물/.test(t)) return 'magi';
    if (/사랑/.test(t)) return 'manger';
    return ORDER[(i || 0) % ORDER.length];
  }
  function svg(key) {
    var f = SCENES[key] || SCENES.wait;
    return '<svg class="s-pic" viewBox="0 0 600 270" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + f() + '</svg>';
  }
  return { pick: pick, svg: svg, keys: ORDER };
})();
