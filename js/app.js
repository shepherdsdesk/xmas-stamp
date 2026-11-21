/* 성도 화면 */
(function () {
  var $ = Api.$, esc = Api.esc;
  var cfg = null, me = null, photos = {}, pending = null;
  var STAR = 'M50 4 L61 37 L96 38 L68 59 L78 93 L50 73 L22 93 L32 59 L4 38 L39 37 Z';

  /* ---------- 그림 조각 ---------- */
  function starSvg(fill, stroke) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="' + STAR + '" fill="' + (fill || '#f3cf7a') + '" stroke="' +
      (stroke || 'rgba(255,255,255,.7)') + '" stroke-width="2" stroke-linejoin="round"/></svg>';
  }
  function bigStarSvg() {
    return '<svg class="star" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="sg" cx="50%" cy="40%" r="60%">' +
      '<stop offset="0" stop-color="#fff6d6"/><stop offset=".55" stop-color="#f3cf7a"/><stop offset="1" stop-color="#c9973a"/></radialGradient></defs>' +
      '<circle cx="50" cy="50" r="46" fill="none" stroke="#f3cf7a" stroke-width="2.5" stroke-dasharray="4 5"/>' +
      '<path d="M50 12 L59.5 39.5 L88.5 40.5 L65.5 58 L74 86 L50 69.5 L26 86 L34.5 58 L11.5 40.5 L40.5 39.5 Z" fill="url(#sg)" stroke="#fff3c9" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  }
  function giftSvg() {
    return '<svg class="gift-ico" viewBox="0 0 100 100" aria-hidden="true">' +
      '<path d="' + STAR + '" transform="translate(41 0) scale(.18)" fill="#ffe39e"/>' +
      '<rect x="18" y="40" width="64" height="16" rx="3" fill="#f3cf7a"/><rect x="22" y="56" width="56" height="34" rx="3" fill="#e2b75a"/>' +
      '<rect x="45" y="40" width="10" height="50" fill="#9a3b2e"/><path d="M50 40 C40 26 26 30 34 38 Z M50 40 C60 26 74 30 66 38 Z" fill="#9a3b2e"/></svg>';
  }
  function barcodeSvg(code) {
    var x = 0, bars = '', t = '*' + String(code || '') + '*';
    for (var i = 0; i < t.length; i++) {
      var c = t.charCodeAt(i);
      for (var b = 0; b < 7; b++) {
        var w = ((c >> b) & 1) ? 3 : 1.4;
        if (b % 2 === 0) bars += '<rect x="' + x.toFixed(1) + '" y="0" width="' + w + '" height="60" fill="#111a2c"/>';
        x += w + 1.2;
      }
      x += 2;
    }
    return '<svg viewBox="0 0 ' + x.toFixed(1) + ' 60" preserveAspectRatio="none" aria-hidden="true">' + bars + '</svg>';
  }
  function theme(p) { return String(p.title || '').split('·')[0].trim(); }

  // 표어를 장소 수만큼 나눕니다. '/'로 나눠 두었으면 그대로, 아니면 글자 수가 고르게 나뉘도록.
  function mottoWords(n) {
    var m = String((cfg && cfg.motto) || '').trim();
    if (!m || !n) return [];
    if (m.indexOf('/') >= 0) {
      var parts = m.split('/').map(function (x) { return x.trim(); }).filter(Boolean);
      return parts.length === n ? parts : [];
    }
    var w = m.split(/\s+/);
    if (w.length < n) return [];
    var len = w.map(function (x) { return x.length; }), total = len.reduce(function (a, b) { return a + b; }, 0) + w.length - n, avg = total / n;
    var memo = {};
    function best(i, k) { // w[i..] 를 k 조각으로
      var key = i + ',' + k; if (memo[key]) return memo[key];
      if (k === 1) { var l = 0; for (var j = i; j < w.length; j++) l += len[j] + (j > i ? 1 : 0); return memo[key] = { c: (l - avg) * (l - avg), cut: [w.length] }; }
      var r = null, l2 = 0;
      for (var e = i; e <= w.length - k; e++) {
        l2 += len[e] + (e > i ? 1 : 0);
        var rest = best(e + 1, k - 1), c = (l2 - avg) * (l2 - avg) + rest.c;
        if (!r || c < r.c) r = { c: c, cut: [e + 1].concat(rest.cut) };
      }
      return memo[key] = r;
    }
    var cuts = best(0, n).cut, out = [], st = 0;
    cuts.forEach(function (e) { out.push(w.slice(st, e).join(' ')); st = e; });
    return out;
  }
  function mottoHtml(places, justNo, all) {
    var words = mottoWords(places.length);
    if (!words.length) return '';
    return '<div class="motto" role="img" aria-label="성탄 표어">' + places.map(function (p, i) {
      var on = all || p.stamped;
      return '<span class="piece' + (on ? ' on' : '') + (p.no === justNo ? ' just' : '') + '">' + esc(words[i]) +
        '<span class="ph">' + p.no + ' · ' + esc(theme(p)) + '</span></span>';
    }).join('') + '</div>';
  }
  function progressHtml(s) {
    var pct = s.total ? Math.round(s.count / s.total * 100) : 0;
    return '<div class="stack-8"><div class="progress-text"><span>나의 별 여정</span><span><b>' + s.count + '</b> / ' + s.total + ' 완료</span></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div></div>';
  }
  function countWord(n) { return ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'][n] || String(n); }

  // 장소 QR로 열었을 때: ?s=3.키
  (function readQr() {
    var m = location.search.match(/[?&]s=(\d+)\.([A-Za-z0-9]+)/);
    if (m) {
      pending = { loc: Number(m[1]), key: m[2] };
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
    }
  })();

  function show(id) {
    ['v-loading', 'v-start', 'v-home'].forEach(function (v) { $(v).hidden = v !== id; });
    window.scrollTo(0, 0);
  }

  function fail(msg) {
    show('v-loading');
    $('v-loading').innerHTML = '<div class="wrap center stack"><p>' + esc(msg) + '</p><button class="btn" onclick="location.reload()">다시 열기</button></div>';
  }

  /* ---------- 시작 ---------- */
  function boot() {
    Api.rpc('app_config').then(function (c) {
      cfg = c;
      document.title = c.title;
      Api.rpc('place_photos').then(function (p) { photos = p || {}; if (me) renderHome(); }).catch(function () {});
      var t = Api.getToken();
      if (!t) { startView(); return; }
      Api.rpc('my_status', { p_token: t }).then(function (r) {
        if (!r.ok) { Api.clearToken(); startView(); return; }
        me = r.status; renderHome();
        if (pending) stampWith({ p_loc: pending.loc, p_key: pending.key });
        pending = null;
      }).catch(function (e) { fail(e.message); });
    }).catch(function (e) { fail(e.message); });
  }

  function startView() {
    $('s-church').textContent = cfg.church;
    $('s-title').textContent = cfg.title;
    $('s-sub').textContent = cfg.subtitle;
    $('s-count').textContent = countWord(cfg.places.length);
    $('s-motto').innerHTML = mottoHtml(cfg.places.map(function (p) { return { no: p.no, title: p.title || '' }; }), 0, true);
    $('s-agree').textContent = '스탬프 기록과 선물 전달, 기도제목 연락에만 쓰고 ' + cfg.retention + '에 지웁니다.';
    $('s-qrnote').hidden = !pending;
    if (!cfg.window.open) { $('e-start').textContent = cfg.window.message; }
    show('v-start');
  }

  $('i-phone').addEventListener('input', function () { this.value = Api.phoneFormat(this.value); });
  $('f-start').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var err = $('e-start'), btn = $('b-start');
    var name = $('i-name').value.trim(), digits = $('i-phone').value.replace(/\D/g, '');
    err.textContent = '';
    if (!name) { err.textContent = '이름을 넣어 주십시오.'; $('i-name').focus(); return; }
    if (!/^01\d{8,9}$/.test(digits)) { err.textContent = '휴대폰 번호를 다시 확인해 주십시오.'; $('i-phone').focus(); return; }
    if (!$('i-agree').checked) { err.textContent = '개인정보 수집·이용 동의에 체크해 주십시오.'; return; }
    Api.busy(btn, true, '확인하는 중입니다');
    Api.rpc('register', { p_name: name, p_phone: digits, p_agree: true }).then(function (r) {
      Api.busy(btn, false);
      if (!r.ok) { err.textContent = r.message; return; }
      Api.setToken(r.token);
      me = r.status; renderHome();
      if (r.recovered) Api.toast('지난 기록을 이어서 보여 드립니다.');
      if (pending) { stampWith({ p_loc: pending.loc, p_key: pending.key }); pending = null; }
    }).catch(function (e) { Api.busy(btn, false); err.textContent = e.message; });
  });

  /* ---------- 내 스탬프 ---------- */
  function renderHome() {
    var s = me;
    var html = '';
    html += '<div class="stack-8"><p class="label">' + esc(cfg.subtitle || cfg.title) + '</p>' +
      '<h1>' + esc(s.name) + ' 님의 별 여정</h1></div>';
    var motto = mottoHtml(s.places, 0, false);
    html += '<div class="card stack">' + (motto ? '<p class="label">성탄 표어</p>' + motto : '') + progressHtml(s) + '</div>';

    if (s.completed) html += doneBlock(s);

    html += '<div class="places">' + s.places.map(function (p) {
      var ph = photos[p.no];
      var thumb = ph ? '<span class="thumb" style="background-image:url(' + ph + ')"></span>' : '<span class="thumb">' + p.no + '</span>';
      return '<button type="button" class="place' + (p.stamped ? ' done' : '') + '" data-no="' + p.no + '">' + thumb +
        '<span class="txt"><span class="t1">' + p.no + '. ' + esc(p.title) + '</span>' +
        '<span class="t2">' + esc(p.name || p.floor || '사진 속 장소') + '</span>' +
        (p.floor && (p.name || '').indexOf(p.floor) < 0 ? '<span class="t3">' + esc(p.floor) + '</span>' : '') + '</span>' +
        '<span class="state" aria-label="' + (p.stamped ? '받음' : '아직') + '">' + (p.stamped ? starSvg('#fff6d6', '#9a6b00') : p.no) + '</span></button>';
    }).join('') + '</div>';

    html += '<div class="stack-8 center" style="padding-top:8px">' +
      '<p class="muted small">궁금한 점은 ' + esc(cfg.contact) + '에게 연락해 주십시오.</p>' +
      '<button class="link" id="b-switch" type="button">다른 분이 이 휴대폰으로 참여하기</button></div>';

    $('home').innerHTML = html;
    show('v-home');
    $('dock').hidden = s.completed;

    Array.prototype.forEach.call(document.querySelectorAll('.place'), function (b) {
      b.onclick = function () { placeInfo(Number(b.getAttribute('data-no'))); };
    });
    var bp = $('b-pray'); if (bp) bp.onclick = prayerForm;
    var bw = $('b-word'); if (bw) bw.onclick = function () { showBlessing(me.blessing, ''); };
    $('b-switch').onclick = switchUser;
  }

  function doneBlock(s) {
    var locked = s.prayerRequired && !s.prayerDone;
    var h = '<div class="card gold celebrate stack-8">' + starSvg() + '<h2 class="big-title">완주를 축하합니다</h2>' +
      '<p class="muted">별을 따라 베들레헴까지 ' + countWord(s.total) + ' 곳을 모두 다녀오셨습니다.</p></div>';
    if (locked) {
      h += '<div class="card gold center stack-8">' + giftSvg() + '<p class="label">마지막 순서 · 보배합 열기</p><h3>성탄 감사와 새해 기도제목</h3>' +
        '<p class="muted small">동방 박사들이 보배합을 열었듯, 한 해의 감사와 새해 기도제목을 나눠 주십시오. 기도제목을 나누시면 <b>선물 교환권</b>이 나옵니다.</p>' +
        '<button class="btn" id="b-pray" type="button">기도제목 나누기</button></div>';
      return h;
    }
    h += '<div class="ticket' + (s.giftReceived ? ' used' : '') + '">' + (s.giftReceived ? '<div class="t-done">선물 받음</div>' : '') +
      '<div class="t-label">선물 교환권</div><div class="t-code">' + esc(s.voucher) + '</div>' +
      '<div class="barcode">' + barcodeSvg(s.voucher) + '</div>' +
      '<p>' + (s.giftReceived ? '선물을 받으셨습니다. 함께해 주셔서 감사합니다.' : esc(cfg.giftNote)) + '</p></div>';
    if (s.prayerDone) h += '<button class="btn quiet" id="b-word" type="button">하나님의 말씀 다시 보기</button>';
    else h += '<div class="card gold center stack-8">' + giftSvg() + '<p class="label">보배합 열기</p><h3>성탄 감사와 새해 기도제목</h3>' +
      '<p class="muted small">동방 박사들이 보배합을 열었듯, 한 해의 감사와 새해 기도제목을 나눠 주십시오. 교구가 함께 기도합니다.</p>' +
      '<button class="btn" id="b-pray" type="button">기도제목 나누기</button></div>';
    return h;
  }

  function placeInfo(no) {
    var p = me.places.filter(function (x) { return x.no === no; })[0]; if (!p) return;
    var ph = photos[no];
    Api.openModal(
      '<div class="stack">' +
      (ph ? '<img class="photo-lg" src="' + ph + '" alt="' + no + '번 장소 사진">' : '') +
      '<div class="stack-8"><p class="label">' + no + '. ' + esc(p.title) + '</p>' +
      '<h2>' + esc(p.name || '사진 속 장소를 찾아가십시오') + '</h2>' + (p.floor ? '<p class="muted">' + esc(p.floor) + '</p>' : '') + '</div>' +
      '<p class="muted">' + (p.stamped ? '이미 스탬프를 받으셨습니다.' : '이 장소의 안내판에 적힌 숫자 4자리를 [스탬프 찍기]에 넣으십시오.') + '</p>' +
      (p.stamped ? '' : '<button class="btn" id="m-stamp" type="button">스탬프 찍기</button>') +
      '<button class="btn line" id="m-close" type="button">닫기</button></div>');
    $('m-close').onclick = Api.closeModal;
    if ($('m-stamp')) $('m-stamp').onclick = stampForm;
  }

  /* ---------- 스탬프 찍기 ---------- */
  $('b-stamp').onclick = stampForm;

  function stampForm() {
    Api.openModal(
      '<form id="f-code" class="stack" novalidate>' +
      '<h2 class="center">안내판의 숫자 4자리</h2>' +
      '<input id="i-code" class="input digits" type="tel" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="숫자 4자리">' +
      '<p class="err center" id="e-code" role="alert"></p>' +
      '<button class="btn" type="submit" id="b-code">확인</button>' +
      '<button class="btn quiet" type="button" id="b-cam">카메라로 QR 찍기</button>' +
      '<button class="btn line" type="button" id="b-cancel">닫기</button></form>');
    var input = $('i-code');
    input.addEventListener('input', function () { input.value = input.value.replace(/\D/g, '').slice(0, 4); });
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 200);
    $('b-cancel').onclick = Api.closeModal;
    if ($('b-cam')) $('b-cam').onclick = cameraForm;
    $('f-code').onsubmit = function (ev) {
      ev.preventDefault();
      if (input.value.length !== 4) { $('e-code').textContent = '숫자 4자리를 넣어 주십시오.'; return; }
      stampWith({ p_text: input.value }, $('b-code'), $('e-code'));
    };
  }

  function loadJsQR() {
    if (window.BarcodeDetector || window.jsQR) return Promise.resolve();
    return new Promise(function (res) {
      var s = document.createElement('script'); s.src = 'js/vendor/jsQR.js'; s.onload = res; s.onerror = res;
      document.head.appendChild(s);
    });
  }

  function cameraForm() {
    Api.openModal(
      '<div class="stack"><h2 class="center">안내판의 QR을 비춰 주십시오</h2>' +
      '<video class="scan" id="cam" muted playsinline></video>' +
      '<p class="err center" id="e-cam" role="alert"></p>' +
      '<button class="btn quiet" type="button" id="b-tonum">숫자로 넣기</button>' +
      '<button class="btn line" type="button" id="b-camclose">닫기</button></div>');
    $('b-camclose').onclick = Api.closeModal;
    $('b-tonum').onclick = function () { Scanner.stop(); stampForm(); };
    // 버튼을 누른 바로 그 순간 카메라를 엽니다 (아이폰은 늦게 열면 막습니다). 판독 도구는 함께 불러옵니다.
    loadJsQR();
    Scanner.start($('cam'), function (text) { stampWith({ p_text: text }, null, $('e-cam')); },
      function (msg) { $('e-cam').textContent = msg; $('cam').hidden = true; });
  }

  function stampWith(args, btn, errEl) {
    args.p_token = Api.getToken();
    if (btn) Api.busy(btn, true, '확인하는 중입니다');
    Api.rpc('stamp', args).then(function (r) {
      if (btn) Api.busy(btn, false);
      if (r.my) { me = r.my; renderHome(); }
      if (r.status === 'OK' || r.status === 'ALREADY') { stampResult(r); return; }
      if (r.status === 'NEED_REGISTER') { Api.closeModal(); Api.clearToken(); startView(); return; }
      if (errEl) { errEl.textContent = r.message; var i = $('i-code'); if (i) { i.value = ''; i.focus(); } }
      else { Api.closeModal(); Api.toast(r.message, 4000); }
    }).catch(function (e) {
      if (btn) Api.busy(btn, false);
      if (errEl) errEl.textContent = e.message; else Api.toast(e.message, 4000);
    });
  }

  function stampResult(r) {
    var p = r.place, done = r.justCompleted, fresh = r.status === 'OK';
    var motto = mottoHtml(me.places, fresh ? p.no : 0, false);
    Api.openModal(
      '<div class="stack">' +
      (fresh ? '<div class="stamp-fx">' + bigStarSvg() + '<div class="ring"></div></div>' : '') +
      '<div class="stack-8 center"><p class="label">' + p.no + '번 별 · ' + esc(theme(p)) + '</p>' +
      '<h2 class="big-title">' + (done ? '성탄 표어를 완성했습니다' : fresh ? p.no + '번 별을 찾았습니다' : esc(r.message)) + '</h2></div>' +
      motto + '<div class="card">' + progressHtml(me) + '</div>' +
      (p.verse ? '<div class="card gold stack-8"><p class="label">오늘의 묵상</p><p class="ref">' + esc(p.ref) + '</p><p class="verse">' + Api.nl(p.verse) + '</p></div>' : '') +
      (p.question && !p.shared ? '<div class="card stack-8" id="sh-card"><p class="label">한 줄 나눔 (선택)</p><h3>' + esc(p.question) + '</h3>' +
        '<textarea id="sh-in" class="textarea" maxlength="60" style="min-height:104px" placeholder="60자 안으로 적어 주십시오"></textarea>' +
        '<p class="muted small" style="text-align:right"><span id="sh-n">0</span> / 60</p>' +
        '<p class="muted small">이름 없이 내용만 로비 성탄 트리 화면에 별로 걸립니다. 기도제목은 완주한 뒤 따로 받습니다.</p>' +
        '<p class="err" id="sh-e" role="alert"></p><button class="btn quiet" type="button" id="sh-b">트리에 걸기</button></div>' : '') +
      (done ? '<div class="card stack-8 center"><h3>모든 별을 찾으셨습니다</h3><p class="muted small">' + (me.prayerRequired && !me.prayerDone ? '이제 마지막으로 기도제목을 나눠 주십시오. 나누시면 선물 교환권이 나옵니다.' : '선물 교환권이 내 별 여정 화면에 나옵니다.') + '</p></div>' : '') +
      '<button class="btn" type="button" id="b-ok">확인</button></div>', { dismiss: false });
    $('b-ok').onclick = function () { Api.closeModal(); if (done && !me.prayerDone) prayerForm(); };
    if ($('sh-b')) {
      $('sh-in').oninput = function () { $('sh-n').textContent = this.value.length; };
      $('sh-b').onclick = function () {
        var t = $('sh-in').value.trim(), btn = $('sh-b');
        if (t.length < 2) { $('sh-e').textContent = '나눔을 적어 주십시오.'; return; }
        Api.busy(btn, true, '보내는 중입니다');
        Api.rpc('add_share', { p_token: Api.getToken(), p_loc: p.no, p_text: t }).then(function (r) {
          Api.busy(btn, false);
          if (!r.ok) { $('sh-e').textContent = r.message; return; }
          $('sh-card').innerHTML = '<p class="label">한 줄 나눔</p><p>' + esc(r.message) + '</p>';
        }).catch(function (e) { Api.busy(btn, false); $('sh-e').textContent = e.message; });
      };
    }
  }

  /* ---------- 기도제목 ---------- */
  function prayerForm() {
    Api.openModal(
      '<form id="f-pray" class="stack" novalidate>' +
      '<div class="stack-8 center">' + giftSvg() + '<p class="label">보배합 열기</p><h2>성탄 감사와 새해 기도제목</h2>' +
      '<p class="muted small">동방 박사들이 보배합을 열었듯, 한 해의 감사와 새해 기도제목을 적어 주십시오. 담당 교역자만 보며 교구가 함께 기도합니다.</p></div>' +
      '<textarea id="i-pray" class="textarea" maxlength="1000" aria-label="기도제목"></textarea>' +
      '<div class="field"><label>연락 방법</label>' +
      ['기도만', '전화 상담', '심방 요청'].map(function (c, i) {
        var t = ['기도만 부탁드립니다', '전화로 이야기 나누고 싶습니다', '심방을 원합니다'][i];
        return '<label class="choice' + (i === 0 ? ' on' : '') + '"><input type="radio" name="care" value="' + c + '"' + (i === 0 ? ' checked' : '') + '>' + t + '</label>';
      }).join('') + '</div>' +
      '<p class="err" id="e-pray" role="alert"></p>' +
      '<button class="btn" type="submit" id="b-praysend">나누기</button>' +
      '<button class="btn line" type="button" id="b-praylater">' + (me.prayerRequired ? '조금 뒤에 쓰기' : '다음에 하기') + '</button></form>', { dismiss: false });
    var radios = document.querySelectorAll('input[name=care]');
    Array.prototype.forEach.call(radios, function (r) {
      r.onchange = function () { Array.prototype.forEach.call(radios, function (x) { x.parentNode.classList.toggle('on', x.checked); }); };
    });
    $('b-praylater').onclick = Api.closeModal;
    $('f-pray').onsubmit = function (ev) {
      ev.preventDefault();
      var text = $('i-pray').value.trim(), btn = $('b-praysend');
      if (text.length < 2) { $('e-pray').textContent = '기도제목을 적어 주십시오.'; return; }
      var care = (document.querySelector('input[name=care]:checked') || {}).value || '기도만';
      Api.busy(btn, true, '보내는 중입니다');
      Api.rpc('submit_prayer', { p_token: Api.getToken(), p_text: text, p_care: care }).then(function (r) {
        Api.busy(btn, false);
        if (!r.ok) { $('e-pray').textContent = r.message; return; }
        if (r.my) { me = r.my; renderHome(); }
        showBlessing(r.blessing, r.message);
      }).catch(function (e) { Api.busy(btn, false); $('e-pray').textContent = e.message; });
    };
  }

  function showBlessing(b, message) {
    if (!b) return;
    Api.openModal(
      '<div class="stack">' +
      (message ? '<p class="center">' + esc(message) + '</p>' : '') +
      '<div class="card paper stack-8"><p class="label">' + esc(me.name) + ' 님께 드리는 하나님의 말씀</p>' +
      '<p class="ref">' + esc(b.ref) + '</p>' + (b.verse ? '<p class="verse">' + Api.nl(b.verse) + '</p>' : '') + '</div>' +
      (b.blessing ? '<div class="card stack-8"><p class="label">함께 드리는 기도</p><p>' + Api.nl(b.blessing) + '</p></div>' : '') +
      (b.notice ? '<p class="notice">' + Api.nl(b.notice) + '</p>' : '') +
      (window.CardMaker ? '<button class="btn quiet" type="button" id="b-bcard">말씀 카드 이미지로 저장</button>' : '') +
      '<button class="btn" type="button" id="b-bok">확인</button></div>');
    $('b-bok').onclick = Api.closeModal;
    if ($('b-bcard')) $('b-bcard').onclick = function () { CardMaker.open(me.name, b, cfg || {}); };
  }

  function switchUser() {
    Api.openModal('<div class="stack"><h2>다른 분이 참여합니까?</h2>' +
      '<p class="muted">지금 기록은 지워지지 않습니다. 같은 이름과 번호를 넣으면 언제든 다시 이어집니다.</p>' +
      '<button class="btn" id="b-swyes" type="button">네, 다른 분이 참여합니다</button>' +
      '<button class="btn line" id="b-swno" type="button">취소</button></div>');
    $('b-swno').onclick = Api.closeModal;
    $('b-swyes').onclick = function () { Api.closeModal(); Api.clearToken(); me = null; $('f-start').reset(); startView(); };
  }

  boot();
})();
