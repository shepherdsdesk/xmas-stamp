/* 성도 화면 */
(function () {
  var $ = Api.$, esc = Api.esc;
  var cfg = null, me = null, photos = {}, pending = null;

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
    $('s-count').textContent = cfg.places.length + '';
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
    var s = me, pct = s.total ? Math.round(s.count / s.total * 100) : 0;
    var html = '';
    html += '<div class="stack-8"><p class="label">' + esc(cfg.title) + '</p>' +
      '<h1>' + esc(s.name) + ' 님의 스탬프</h1></div>';
    html += '<div class="card stack-8"><div style="display:flex;justify-content:space-between;align-items:baseline">' +
      '<span class="muted">받은 스탬프</span><span><b style="font-size:30px;color:var(--gold)">' + s.count + '</b> / ' + s.total + '</span></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div></div>';

    if (s.completed) html += doneBlock(s);

    html += '<div class="places">' + s.places.map(function (p) {
      var ph = photos[p.no];
      var thumb = ph ? '<span class="thumb" style="background-image:url(' + ph + ')"></span>' : '<span class="thumb">' + p.no + '</span>';
      return '<button type="button" class="place' + (p.stamped ? ' done' : '') + '" data-no="' + p.no + '">' + thumb +
        '<span class="txt"><span class="t1">' + p.no + '. ' + esc(p.title) + '</span>' +
        '<span class="t2">' + esc(p.name || p.floor || '사진 속 장소') + '</span>' +
        (p.floor && (p.name || '').indexOf(p.floor) < 0 ? '<span class="t3">' + esc(p.floor) + '</span>' : '') + '</span>' +
        '<span class="state" aria-label="' + (p.stamped ? '받음' : '아직') + '">' + (p.stamped ? '✓' : '') + '</span></button>';
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
    var h = '<div class="card paper voucher stack-8"><p class="label">완주를 축하합니다</p>' +
      '<p class="code">' + esc(s.voucher) + '</p>' +
      (s.giftReceived ? '<p><span class="badge ok">선물 받음</span></p>' : '<p>' + esc(cfg.giftNote) + '</p>') + '</div>';
    if (s.prayerDone) h += '<button class="btn quiet" id="b-word" type="button">함께 묵상할 말씀 다시 보기</button>';
    else h += '<div class="card stack-8"><h3>기도제목 나누기</h3><p class="muted small">성탄의 감사와 새해 기도제목을 나눠 주시면 교구가 함께 기도합니다. (선택)</p>' +
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
      (Scanner.supported() ? '<button class="btn quiet" type="button" id="b-cam">카메라로 QR 찍기</button>' : '') +
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
    loadJsQR().then(function () {
      Scanner.start($('cam'), function (text) { stampWith({ p_text: text }, null, $('e-cam')); },
        function (msg) { $('e-cam').textContent = msg; });
    });
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
    var p = r.place, done = r.justCompleted;
    Api.openModal(
      '<div class="stack">' +
      '<p class="label center">' + p.no + '. ' + esc(p.title) + '</p>' +
      '<h2 class="center">' + esc(r.message) + '</h2>' +
      (p.verse ? '<div class="card paper stack-8"><p class="ref">' + esc(p.ref) + '</p><p class="verse">' + Api.nl(p.verse) + '</p></div>' : '') +
      (done ? '<div class="card stack-8 center"><h3>모든 장소의 스탬프를 받으셨습니다</h3><p class="muted small">선물 교환권이 내 스탬프 화면에 나옵니다.</p></div>' : '') +
      '<button class="btn" type="button" id="b-ok">확인</button></div>', { dismiss: false });
    $('b-ok').onclick = function () { Api.closeModal(); if (done && !me.prayerDone) prayerForm(); };
  }

  /* ---------- 기도제목 ---------- */
  function prayerForm() {
    Api.openModal(
      '<form id="f-pray" class="stack" novalidate>' +
      '<div class="stack-8"><h2>기도제목 나누기</h2>' +
      '<p class="muted small">성탄의 감사와 새해 기도제목을 적어 주십시오. 담당 교역자만 보며 교구가 함께 기도합니다.</p></div>' +
      '<textarea id="i-pray" class="textarea" maxlength="1000" aria-label="기도제목"></textarea>' +
      '<div class="field"><label>연락 방법</label>' +
      ['기도만', '전화 상담', '심방 요청'].map(function (c, i) {
        var t = ['기도만 부탁드립니다', '전화로 이야기 나누고 싶습니다', '심방을 원합니다'][i];
        return '<label class="choice' + (i === 0 ? ' on' : '') + '"><input type="radio" name="care" value="' + c + '"' + (i === 0 ? ' checked' : '') + '>' + t + '</label>';
      }).join('') + '</div>' +
      '<p class="err" id="e-pray" role="alert"></p>' +
      '<button class="btn" type="submit" id="b-praysend">나누기</button>' +
      '<button class="btn line" type="button" id="b-praylater">다음에 하기</button></form>', { dismiss: false });
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
      '<div class="card paper stack-8"><p class="label">' + esc(me.name) + ' 님과 함께 묵상할 말씀</p>' +
      '<p class="ref">' + esc(b.ref) + '</p>' + (b.verse ? '<p class="verse">' + Api.nl(b.verse) + '</p>' : '') + '</div>' +
      (b.blessing ? '<div class="card stack-8"><p class="label">함께 드리는 기도</p><p>' + Api.nl(b.blessing) + '</p></div>' : '') +
      (b.notice ? '<p class="notice">' + Api.nl(b.notice) + '</p>' : '') +
      '<button class="btn" type="button" id="b-bok">확인</button></div>');
    $('b-bok').onclick = Api.closeModal;
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
