/* 관리자 화면 */
(function () {
  var $ = Api.$, esc = Api.esc, rpc = Api.rpc;
  var KEY = 'hcc_stamp_admin', pin = null, tab = 'stats', data = null;
  try { pin = sessionStorage.getItem(KEY); } catch (e) {}

  function show(id) { ['a-setup', 'a-login', 'a-main'].forEach(function (v) { $(v).hidden = v !== id; }); }
  function guard(r) {
    if (r && r.ok === false && /PIN/.test(r.message || '')) { lock(); Api.toast(r.message, 4000); return false; }
    if (r && r.ok === false) { Api.toast(r.message, 4000); return false; }
    return true;
  }
  function lock() { pin = null; try { sessionStorage.removeItem(KEY); } catch (e) {} $('lg-p').value = ''; show('a-login'); }
  function siteBase() { return location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, ''); }
  function stationUrl(p) { return siteBase() + '?s=' + p.no + '.' + p.qkey; }

  /* ---------- 시작 ---------- */
  rpc('admin_state').then(function (s) {
    if (!s.ready) { show('a-setup'); return; }
    if (pin) rpc('admin_login', { p_pin: pin }).then(function (r) { if (r.ok) enter(); else lock(); }); else show('a-login');
  }).catch(function (e) { document.body.innerHTML = '<div class="wrap"><p>' + esc(e.message) + '</p></div>'; });

  $('su-b').onclick = function () {
    var a = $('su-a').value.trim(), g = $('su-g').value.trim(), b = this;
    Api.busy(b, true);
    rpc('admin_setup', { p_admin_pin: a, p_gift_pin: g }).then(function (r) {
      Api.busy(b, false);
      if (!r.ok) { $('su-e').textContent = r.message; return; }
      pin = a; try { sessionStorage.setItem(KEY, a); } catch (e) {} enter();
    }).catch(function (e) { Api.busy(b, false); $('su-e').textContent = e.message; });
  };
  function login() {
    var p = $('lg-p').value.trim(), b = $('lg-b');
    Api.busy(b, true);
    rpc('admin_login', { p_pin: p }).then(function (r) {
      Api.busy(b, false);
      if (!r.ok) { $('lg-e').textContent = r.message; return; }
      pin = p; try { sessionStorage.setItem(KEY, p); } catch (e) {} enter();
    }).catch(function (e) { Api.busy(b, false); $('lg-e').textContent = e.message; });
  }
  $('lg-b').onclick = login;
  $('lg-p').addEventListener('keydown', function (e) { if (e.key === 'Enter') login(); });
  $('m-lock').onclick = lock;
  $('m-refresh').onclick = function () { load(); };

  Array.prototype.forEach.call(document.querySelectorAll('#tabs button'), function (b) {
    b.onclick = function () {
      tab = b.getAttribute('data-t');
      Array.prototype.forEach.call(document.querySelectorAll('#tabs button'), function (x) { x.classList.toggle('on', x === b); });
      ['stats', 'care', 'shares', 'places', 'answers', 'people', 'signs', 'settings'].forEach(function (t) { $('t-' + t).hidden = t !== tab; });
      load();
    };
  });

  var timer = null;
  function enter() {
    show('a-main'); load();
    clearInterval(timer);
    timer = setInterval(function () { if (tab === 'stats') loadStats(); else badge(); }, 60000);
  }
  function load() {
    if (tab === 'stats') loadStats();
    else if (tab === 'care') loadCare('care');
    else if (tab === 'people') loadPeople('');
    else if (tab === 'shares') loadShares();
    else loadData();
  }
  function badge() {
    rpc('admin_stats', { p_pin: pin }).then(function (s) {
      if (!s.ok) return;
      $('care-dot').hidden = !s.newCare; $('care-dot').textContent = s.newCare;
    }).catch(function () {});
  }

  /* ---------- 현황 ---------- */
  function tile(k, v, alert) { return '<div class="tile' + (alert ? ' alert' : '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div></div>'; }
  function loadStats() {
    rpc('admin_stats', { p_pin: pin }).then(function (s) {
      if (!guard(s)) return;
      $('care-dot').hidden = !s.newCare; $('care-dot').textContent = s.newCare;
      var max = Math.max.apply(null, s.perPlace.map(function (p) { return p.count; }).concat([1]));
      var dmax = Math.max.apply(null, s.daily.map(function (d) { return d.count; }).concat([1]));
      $('t-stats').innerHTML =
        (s.newCrisis ? '<div class="card stack-8" style="border-color:var(--alert);margin-bottom:16px"><h3 style="color:var(--alert)">마음이 많이 힘든 분의 기도제목이 ' + s.newCrisis + '건 있습니다</h3><p>[돌봄 요청]에서 확인하고 먼저 연락해 주십시오.</p></div>' : '') +
        '<div class="tiles">' + tile('참가', s.joined + '명') + tile('완주 (선물 준비 수)', s.completed + '명') + tile('선물 전달', s.gifts + '명') +
        tile('기도제목', s.prayers + '건') + tile('새 돌봄 요청', s.newCare + '건', s.newCare > 0) + '</div>' +
        '<p class="muted" style="margin:16px 0">행사 상태: ' + esc(s.window.open ? '진행 중' : s.window.message) + '</p>' +
        '<div class="grid2"><div class="card stack"><h3>장소별 스탬프</h3><div class="rows">' +
        s.perPlace.map(function (p) {
          return '<div class="row"><span>' + p.no + '. ' + esc(p.name || p.title) + '</span><span class="track"><i style="width:' + Math.round(p.count / max * 100) + '%"></i></span><span class="n">' + p.count + '</span></div>';
        }).join('') + '</div></div>' +
        '<div class="card stack"><h3>날짜별 완주</h3>' + (s.daily.length ? '<div class="rows">' + s.daily.map(function (d) {
          return '<div class="row"><span>' + esc(d.date) + '</span><span class="track"><i style="width:' + Math.round(d.count / dmax * 100) + '%"></i></span><span class="n">' + d.count + '</span></div>';
        }).join('') + '</div>' : '<p class="muted">아직 완주한 분이 없습니다.</p>') + '</div></div>';
    }).catch(function (e) { Api.toast(e.message); });
  }

  /* ---------- 돌봄 요청 ---------- */
  function loadCare(filter) {
    var box = $('t-care');
    box.innerHTML = '<div class="acts" style="margin:0 0 16px"><button class="btn ' + (filter === 'care' ? '' : 'quiet') + '" data-f="care" type="button">전화·심방·위기</button>' +
      '<button class="btn ' + (filter === 'new' ? '' : 'quiet') + '" data-f="new" type="button">새 요청</button><button class="btn ' + (filter === 'all' ? '' : 'quiet') + '" data-f="all" type="button">모든 기도제목</button></div><div id="care-list" class="stack"><p class="muted">불러오는 중입니다</p></div>';
    Array.prototype.forEach.call(box.querySelectorAll('[data-f]'), function (b) { b.onclick = function () { loadCare(b.getAttribute('data-f')); }; });
    rpc('admin_prayers', { p_pin: pin, p_filter: filter }).then(function (r) {
      if (!guard(r)) return;
      badge();
      var list = $('care-list');
      if (!r.items.length) { list.innerHTML = '<p class="muted">해당하는 기도제목이 없습니다.</p>'; return; }
      list.innerHTML = r.items.map(function (p) {
        return '<div class="card pr stack-8 ' + (p.crisis ? 'crisis' : p.care !== '기도만' ? 'care' : '') + '">' +
          '<div class="meta">' + (p.crisis ? '<span class="badge alert">마음이 많이 힘든 분</span>' : '') +
          '<span class="badge ' + (p.care === '기도만' ? 'dim' : 'gold') + '">' + esc(p.care) + '</span>' +
          '<b>' + esc(p.name) + '</b> <a href="tel:' + esc(p.phone.replace(/\D/g, '')) + '">' + esc(p.phone) + '</a><span class="muted">' + esc(p.time) + '</span></div>' +
          '<p>' + Api.nl(p.body) + '</p>' +
          '<div class="form"><label>처리</label><select class="select" data-st="' + p.id + '">' +
          ['새 요청', '연락함', '심방함', '기도 중'].map(function (s) { return '<option' + (s === p.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
          '<label>메모</label><input class="input" data-memo="' + p.id + '" value="' + esc(p.memo) + '" maxlength="500"></div>' +
          '<div class="acts"><button class="btn quiet" data-save="' + p.id + '" type="button">저장</button></div></div>';
      }).join('');
      Array.prototype.forEach.call(list.querySelectorAll('[data-save]'), function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-save');
          rpc('admin_update_prayer', { p_pin: pin, p_id: Number(id), p_status: list.querySelector('[data-st="' + id + '"]').value, p_memo: list.querySelector('[data-memo="' + id + '"]').value })
            .then(function (r) { if (guard(r)) { Api.toast('저장했습니다.'); badge(); } });
        };
      });
    }).catch(function (e) { Api.toast(e.message); });
  }

  /* ---------- 한 줄 나눔 (로비 TV 트리) ---------- */
  function loadShares() {
    var box = $('t-shares');
    box.innerHTML = '<p class="muted" style="margin-bottom:16px">성도가 스탬프를 받고 남긴 한 줄 나눔입니다. 이름 없이 내용만 로비 TV 성탄 트리에 걸립니다. ' +
      '전화번호·주소처럼 보이는 글과 마음이 힘든 신호가 있는 글은 자동으로 숨겨지고, 힘든 신호가 있는 글은 [돌봄 요청]에도 올라갑니다.</p><div id="sh-list" class="stack"><p class="muted">불러오는 중입니다</p></div>';
    rpc('admin_shares', { p_pin: pin }).then(function (r) {
      if (!guard(r)) return;
      var list = $('sh-list');
      if (!r.items.length) { list.innerHTML = '<p class="muted">아직 나눔이 없습니다.</p>'; return; }
      list.innerHTML = r.items.map(function (it) {
        return '<div class="card pr stack-8' + (it.visible ? '' : ' care') + '"><div class="meta"><span class="badge ' + (it.visible ? 'ok' : 'dim') + '">' + (it.visible ? '트리에 보임' : '숨김') + '</span>' +
          '<span class="badge dim">' + it.loc + '번 장소</span><b>' + esc(it.name || '') + '</b><span class="muted">' + esc(it.at) + '</span></div>' +
          '<p>' + esc(it.text) + '</p><div class="acts"><button class="btn quiet" type="button" data-vis="' + it.id + '" data-to="' + (!it.visible) + '">' + (it.visible ? '트리에서 숨기기' : '트리에 보이기') + '</button></div></div>';
      }).join('');
      Array.prototype.forEach.call(list.querySelectorAll('[data-vis]'), function (b) {
        b.onclick = function () {
          rpc('admin_share_visible', { p_pin: pin, p_id: Number(b.getAttribute('data-vis')), p_visible: b.getAttribute('data-to') === 'true' })
            .then(function (r) { if (guard(r)) { Api.toast(r.message); loadShares(); } });
        };
      });
    }).catch(function (e) { Api.toast(e.message); });
  }

  /* ---------- 장소·기도 말씀·설정·안내판 (같은 자료 사용) ---------- */
  function loadData() {
    rpc('admin_data', { p_pin: pin }).then(function (d) {
      if (!guard(d)) return;
      data = d;
      $('m-church').textContent = d.settings.church || '';
      if (tab === 'places') renderPlaces();
      if (tab === 'answers') renderAnswers();
      if (tab === 'settings') renderSettings();
      if (tab === 'signs') renderSigns();
      badge();
    }).catch(function (e) { Api.toast(e.message); });
  }

  function renderPlaces() {
    var box = $('t-places');
    box.innerHTML = '<p class="muted" style="margin-bottom:16px">장소를 바꾸면 성도 화면에 바로 반영됩니다. 사진을 올리면 성도가 사진을 보고 장소를 찾아갑니다. 숫자를 비워 두고 저장하면 자동으로 정해집니다.</p>' +
      '<div class="stack">' + data.places.map(placeCard).join('') + '</div>' +
      '<div class="acts"><button class="btn" id="p-add" type="button">장소 추가</button></div>';
    Array.prototype.forEach.call(box.querySelectorAll('[data-pno]'), bindPlace);
    $('p-add').onclick = function () {
      rpc('admin_save_place', { p_pin: pin, p_data: { name: '새 장소', title: '', floor: '', ref: '', verse: '' } })
        .then(function (r) { if (guard(r)) { Api.toast(r.message); loadData(); } });
    };
  }
  function placeCard(p) {
    return '<div class="card pcard' + (p.active ? '' : ' off') + '" data-pno="' + p.no + '">' +
      '<div class="stack-8"><div class="ph" style="' + (p.photo ? 'background-image:url(' + p.photo + ')' : '') + '">' + (p.photo ? '' : '사진 없음') + '</div>' +
      '<label class="btn quiet" style="min-height:48px;font-size:16px">사진 올리기<input type="file" accept="image/*" hidden data-file></label>' +
      (p.photo ? '<button class="btn line" style="min-height:48px;font-size:16px" type="button" data-nophoto>사진 빼기</button>' : '') + '</div>' +
      '<div><h3 style="margin-bottom:16px">' + p.no + '번 장소</h3><div class="form">' +
      '<label>사용</label><select class="select" data-k="active"><option value="true"' + (p.active ? ' selected' : '') + '>사용함</option><option value="false"' + (p.active ? '' : ' selected') + '>사용 안 함</option></select>' +
      '<label>장소 이름</label><input class="input" data-k="name" value="' + esc(p.name) + '" maxlength="80">' +
      '<label>층·위치</label><input class="input" data-k="floor" value="' + esc(p.floor) + '" maxlength="40" placeholder="예: 2층">' +
      '<label>성탄 장면</label><input class="input" data-k="title" value="' + esc(p.title) + '" maxlength="80" placeholder="예: 사랑 · 구유에 누인 아기">' +
      '<label>말씀 출처</label><input class="input" data-k="ref" value="' + esc(p.ref) + '" maxlength="40" placeholder="예: 눅 2:7">' +
      '<label>말씀 본문</label><textarea class="textarea" data-k="verse" maxlength="1000">' + esc(p.verse) + '</textarea>' +
      '<label>한 줄 나눔 질문</label><input class="input" data-k="question" value="' + esc(p.question || '') + '" maxlength="80" placeholder="비우면 이 장소에서는 나눔을 받지 않습니다">' +
      '<label>안내판 숫자</label><input class="input" data-k="code" value="' + esc(p.code) + '" maxlength="4" inputmode="numeric" style="max-width:160px;font-weight:800;letter-spacing:4px">' +
      '</div><div class="acts"><button class="btn" type="button" data-save>저장</button><button class="btn quiet" type="button" data-newqr>QR 새로 만들기</button></div></div></div>';
  }
  function bindPlace(card) {
    var no = Number(card.getAttribute('data-pno'));
    var p = data.places.filter(function (x) { return x.no === no; })[0];
    var photo = p.photo;
    card.querySelector('[data-file]').onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      shrink(f, 900, 0.72).then(function (url) {
        photo = url; var ph = card.querySelector('.ph'); ph.style.backgroundImage = 'url(' + url + ')'; ph.textContent = '';
        Api.toast('사진을 넣었습니다. [저장]을 눌러 주십시오.');
      }).catch(function () { Api.toast('사진을 읽지 못했습니다.'); });
    };
    var np = card.querySelector('[data-nophoto]');
    if (np) np.onclick = function () { photo = ''; var ph = card.querySelector('.ph'); ph.style.backgroundImage = ''; ph.textContent = '사진 없음'; };
    card.querySelector('[data-save]').onclick = function () {
      var o = { no: no, photo: photo };
      Array.prototype.forEach.call(card.querySelectorAll('[data-k]'), function (el) { o[el.getAttribute('data-k')] = el.value; });
      o.active = o.active === 'true';
      rpc('admin_save_place', { p_pin: pin, p_data: o }).then(function (r) { if (guard(r)) { Api.toast(r.message); loadData(); } });
    };
    card.querySelector('[data-newqr]').onclick = function () {
      if (!confirm(no + '번 장소의 QR을 새로 만들까요? 이미 인쇄한 안내판의 QR은 더 이상 쓸 수 없게 됩니다.')) return;
      rpc('admin_new_qr', { p_pin: pin, p_no: no }).then(function (r) { if (guard(r)) { Api.toast(r.message, 4000); loadData(); } });
    };
  }
  function shrink(file, max, q) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
        var cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * s); cv.height = Math.round(im.naturalHeight * s);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', q));
      };
      im.onerror = rej; im.src = url;
    });
  }

  function renderAnswers() {
    var box = $('t-answers');
    box.innerHTML = '<p class="muted" style="margin-bottom:16px">기도제목에 [키워드]가 들어 있으면 그 분류의 말씀과 기도가 나옵니다. 여러 분류에 걸리면 [우선순위] 숫자가 큰 쪽이 나옵니다. ‘위기’는 자동으로 알아보고, ‘기본’은 어디에도 걸리지 않을 때 나옵니다.</p>' +
      '<div class="stack">' + data.answers.map(answerCard).join('') + answerCard({ cat: '', keywords: '', ref: '', verse: '', blessing: '', priority: 50 }, true) + '</div>';
    Array.prototype.forEach.call(box.querySelectorAll('[data-cat]'), function (card) {
      card.querySelector('[data-save]').onclick = function () {
        var o = {};
        Array.prototype.forEach.call(card.querySelectorAll('[data-k]'), function (el) { o[el.getAttribute('data-k')] = el.value; });
        o.priority = Number(o.priority) || 0;
        rpc('admin_save_answer', { p_pin: pin, p_data: o }).then(function (r) { if (guard(r)) { Api.toast(r.message); loadData(); } });
      };
      var del = card.querySelector('[data-del]');
      if (del) del.onclick = function () {
        if (!confirm('이 분류를 지울까요?')) return;
        rpc('admin_delete_answer', { p_pin: pin, p_cat: card.getAttribute('data-cat') }).then(function (r) { if (guard(r)) { Api.toast(r.message); loadData(); } });
      };
    });
  }
  function answerCard(a, isNew) {
    var fixed = a.cat === '위기' || a.cat === '기본';
    return '<div class="card" data-cat="' + esc(a.cat) + '"><h3 style="margin-bottom:16px">' + (isNew ? '새 분류 추가' : esc(a.cat)) + '</h3><div class="form">' +
      '<label>분류 이름</label><input class="input" data-k="cat" value="' + esc(a.cat) + '"' + (isNew ? '' : ' readonly') + '>' +
      (a.cat === '위기' ? '<input type="hidden" data-k="keywords" value="' + esc(a.keywords) + '"><input type="hidden" data-k="priority" value="999">'
        : '<label>키워드</label><input class="input" data-k="keywords" value="' + esc(a.keywords) + '" placeholder="쉼표로 구분">' +
          '<label>우선순위</label><input class="input" data-k="priority" value="' + esc(a.priority) + '" inputmode="numeric" style="max-width:160px">') +
      '<label>말씀 출처</label><input class="input" data-k="ref" value="' + esc(a.ref) + '">' +
      '<label>말씀 본문</label><textarea class="textarea" data-k="verse">' + esc(a.verse) + '</textarea>' +
      '<label>함께 드리는 기도</label><textarea class="textarea" data-k="blessing" style="min-height:140px">' + esc(a.blessing) + '</textarea>' +
      '</div><div class="acts"><button class="btn" type="button" data-save>' + (isNew ? '추가' : '저장') + '</button>' +
      (isNew || fixed ? '' : '<button class="btn line" type="button" data-del>지우기</button>') + '</div></div>';
  }

  var SET = [
    ['title', '행사 이름'], ['subtitle', '부제'], ['church', '교회·교구'], ['motto', '표어'],
    ['active', '행사 진행', 'yn'], ['start_at', '시작 일시', '', '예: 2026-12-06 09:00 (비우면 바로 시작)'], ['end_at', '마감 일시', '', '예: 2026-12-31 23:59'],
    ['show_names', '장소 이름 보이기', 'yn', 'N이면 사진과 장면만 보이고, 스탬프를 받은 뒤에 이름이 보입니다'],
    ['share_auto', '나눔 바로 트리에 걸기', 'yn'],
    ['prayer_required', '기도제목 필수', 'yn'],
    ['gift_note', '선물 안내', 'area'], ['contact', '문의처'], ['retention', '개인정보 보관 기한'],
    ['crisis_msg', '위기 안내 문구', 'area'], ['crisis_extra', '위기 단어 추가', '', '쉼표로 구분']
  ];
  function renderSettings() {
    var s = data.settings, box = $('t-settings');
    box.innerHTML = '<div class="card stack"><h3>행사 설정</h3><div class="form">' + SET.map(function (f) {
      var v = s[f[0]] || '', input;
      if (f[2] === 'yn') input = '<select class="select" data-k="' + f[0] + '"><option value="Y"' + (v !== 'N' ? ' selected' : '') + '>예</option><option value="N"' + (v === 'N' ? ' selected' : '') + '>아니오</option></select>';
      else if (f[2] === 'area') input = '<textarea class="textarea" data-k="' + f[0] + '">' + esc(v) + '</textarea>';
      else input = '<input class="input" data-k="' + f[0] + '" value="' + esc(v) + '"' + (f[3] ? ' placeholder="' + esc(f[3]) + '"' : '') + '>';
      return '<label>' + f[1] + '</label>' + input;
    }).join('') + '</div><div class="acts"><button class="btn" id="st-save" type="button">저장</button></div></div>' +
      '<div class="card stack" style="margin-top:16px"><h3>PIN 바꾸기</h3><div class="form"><label>새 관리자 PIN</label><input class="input" id="pin-a" type="password" placeholder="바꾸지 않으려면 비워 두십시오">' +
      '<label>새 봉사자 PIN</label><input class="input" id="pin-g" type="password" placeholder="바꾸지 않으려면 비워 두십시오"></div>' +
      '<div class="acts"><button class="btn quiet" id="pin-save" type="button">PIN 바꾸기</button></div></div>' +
      '<div class="card stack" style="margin-top:16px;border-color:var(--alert)"><h3>리허설 기록 지우기</h3>' +
      '<p class="muted">참가자, 스탬프, 기도제목, 한 줄 나눔을 모두 지웁니다. 장소·말씀·설정은 그대로 남습니다. 행사 시작 전에만 쓰십시오.</p>' +
      '<div class="form"><label>확인</label><input class="input" id="rs-w" placeholder="초기화 라고 입력"></div>' +
      '<div class="acts"><button class="btn line" id="rs-b" type="button">모두 지우기</button></div></div>';
    $('st-save').onclick = function () {
      var o = {}; Array.prototype.forEach.call(box.querySelectorAll('[data-k]'), function (el) { o[el.getAttribute('data-k')] = el.value; });
      rpc('admin_save_settings', { p_pin: pin, p_data: o }).then(function (r) { if (guard(r)) Api.toast(r.message); });
    };
    $('pin-save').onclick = function () {
      var a = $('pin-a').value.trim(), g = $('pin-g').value.trim();
      rpc('admin_change_pins', { p_pin: pin, p_admin_pin: a, p_gift_pin: g }).then(function (r) {
        if (!guard(r)) return; if (a) { pin = a; try { sessionStorage.setItem(KEY, a); } catch (e) {} } Api.toast(r.message);
      });
    };
    $('rs-b').onclick = function () {
      rpc('admin_reset', { p_pin: pin, p_word: $('rs-w').value.trim() }).then(function (r) { if (guard(r)) Api.toast(r.message, 4000); });
    };
  }

  /* ---------- 참가자 ---------- */
  function loadPeople(q) {
    var box = $('t-people');
    if (!box.querySelector('#pp-q')) {
      box.innerHTML = '<div class="acts" style="margin:0 0 16px"><input class="input" id="pp-q" placeholder="이름 또는 번호" style="max-width:320px;min-height:48px;font-size:18px"><button class="btn quiet" id="pp-b" type="button">찾기</button></div><div id="pp-list"></div>';
      $('pp-b').onclick = function () { loadPeople($('pp-q').value); };
      $('pp-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') loadPeople(this.value); });
    }
    rpc('admin_participants', { p_pin: pin, p_q: q || '' }).then(function (r) {
      if (!guard(r)) return;
      $('pp-list').innerHTML = r.items.length ? '<table><tr><th>번호</th><th>이름</th><th>휴대폰</th><th>스탬프</th><th>선물</th><th>기도제목</th></tr>' + r.items.map(function (p) {
        return '<tr><td>' + esc(p.receipt) + '</td><td>' + esc(p.name) + '</td><td>' + esc(p.phone) + '</td><td>' + p.count + (p.done ? ' <span class="badge gold">완주</span>' : '') +
          '</td><td>' + (p.gift ? '<span class="badge ok">받음</span>' : '') + '</td><td>' + (p.prayed ? '나눔' : '') + '</td></tr>';
      }).join('') + '</table>' : '<p class="muted">참가자가 없습니다.</p>';
    }).catch(function (e) { Api.toast(e.message); });
  }

  /* ---------- 안내판 인쇄 ---------- */
  function qrSvg(text) {
    var q = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM), n = q.size, b = 2, d = '';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (q.getModule(x, y)) d += 'M' + (x + b) + ',' + (y + b) + 'h1v1h-1z';
    return '<svg viewBox="0 0 ' + (n + 2 * b) + ' ' + (n + 2 * b) + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  function signHtml(p, s) {
    return '<div class="sign"><div class="s-church">' + esc(s.church || '') + '</div><div class="s-title">' + esc(s.title || '') + '</div>' +
      '<div class="s-no">스탬프 ' + p.no + '</div><div class="s-scene">' + esc(p.title) + '</div>' +
      '<div class="s-box"><b>스탬프 숫자</b><span>' + esc(p.code) + '</span></div>' +
      '<div class="s-how">① 휴대폰 화면 아래 [스탬프 찍기]를 누르십시오<br>② 위의 숫자 4자리를 넣으십시오</div>' +
      '<div class="s-qr">' + qrSvg(stationUrl(p)) + '<div><b>휴대폰 카메라로 이 QR을 찍어도 됩니다.</b>' +
      (nfcOn() ? '<br><b>휴대폰을 오른쪽 표시에 대어도 됩니다.</b>' : '') +
      '<br>궁금한 점은 ' + esc(s.contact || '') + '에게 연락해 주십시오.</div>' +
      (nfcOn() ? '<div class="s-nfc">여기에<br>휴대폰을<br>대세요</div>' : '') + '</div></div>';
  }
  function nfcOn() { try { return localStorage.getItem('hcc_stamp_nfc') === 'Y'; } catch (e) { return false; } }
  function copyText(t, btn) {
    function ok() { var o = btn.textContent; btn.textContent = '복사했습니다'; setTimeout(function () { btn.textContent = o; }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(ok, fallback); } else fallback();
    function fallback() {
      var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0';
      document.body.appendChild(a); a.select(); try { document.execCommand('copy'); ok(); } catch (e) { window.prompt('길게 눌러 복사해 주십시오', t); } a.remove();
    }
  }
  function nfcHtml(act) {
    return '<div class="card stack-8" style="margin-top:24px"><h2>NFC 스티커 (휴대폰을 대면 찍히는 방법)</h2>' +
      '<p class="muted small">이 화면을 <b>휴대폰</b>으로 열고, 장소마다 [주소 복사] → NFC Tools 앱에서 써 넣습니다.</p>' +
      '<ol class="small" style="margin:0;padding-left:24px;line-height:1.8">' +
      '<li>NFC Tools → <b>쓰기</b> → <b>레코드 추가</b> → <b>URL / URI</b></li>' +
      '<li>주소 칸에 붙여 넣습니다. 앞에 <b>https://</b>가 두 번 들어가지 않았는지 확인하십시오</li>' +
      '<li><b>확인</b> → <b>쓰기</b> → 스티커에 휴대폰을 댑니다</li>' +
      '<li>다 쓰면 다른 휴대폰을 대어 스탬프가 찍히는지 확인합니다 (확인한 기록은 리허설 후 지우십시오)</li></ol>' +
      '<p class="muted small">장소의 [QR 새로 만들기]를 누르면 주소가 바뀌어 <b>스티커도 다시 써야</b> 합니다. 다른 사람이 덮어쓰지 못하게 하려면 NFC Tools의 <b>기타 → 비밀번호 설정</b>을 쓰십시오. (<b>영구 잠금</b>은 되돌릴 수 없으니 쓰지 마십시오)</p>' +
      '<table><thead><tr><th>장소</th><th>주소</th><th></th></tr></thead><tbody>' +
      act.map(function (p) {
        return '<tr><td>' + p.no + '. ' + esc(p.name) + '</td><td class="small" style="word-break:break-all">' + esc(stationUrl(p)) + '</td>' +
          '<td><button class="btn quiet" style="width:auto;min-height:44px;font-size:16px;padding:0 16px;margin:0" type="button" data-copy="' + esc(stationUrl(p)) + '">주소 복사</button></td></tr>';
      }).join('') + '</tbody></table>' +
      '<label class="choice" style="margin-top:8px"><input type="checkbox" id="sg-nfc"' + (nfcOn() ? ' checked' : '') + '> <span>안내판에 "휴대폰을 대세요" 표시 넣기 (스티커를 붙일 때만)</span></label></div>';
  }
  function startHtml(s) {
    return '<div class="sign"><div class="s-church">' + esc(s.church || '') + '</div><div class="s-title">' + esc(s.title || '') + '</div>' +
      '<div class="s-scene">' + esc(s.subtitle || '') + '</div><div style="width:110mm">' + qrSvg(siteBase()) + '</div>' +
      '<div class="s-how">휴대폰 카메라로 QR을 찍어<br>이름과 휴대폰 번호를 넣고 시작하십시오</div>' +
      '<div class="s-qr"><div>궁금한 점은 ' + esc(s.contact || '') + '에게 연락해 주십시오.</div></div></div>';
  }
  function renderSigns() {
    var s = data.settings, act = data.places.filter(function (p) { return p.active; });
    var all = startHtml(s) + act.map(function (p) { return signHtml(p, s); }).join('');
    $('print-area').innerHTML = all;
    $('t-signs').innerHTML = '<div class="card stack-8"><p>장소마다 A4 한 장씩, 맨 앞에는 시작 QR 한 장이 인쇄됩니다. 숫자는 크게, QR은 작게 넣었습니다.</p>' +
      '<p class="muted small">인쇄 전에 휴대폰으로 QR을 한 번씩 찍어 확인해 주십시오. 장소의 숫자나 QR을 바꾸면 다시 인쇄해야 합니다.</p>' +
      '<p class="muted small">시작 QR 주소: ' + esc(siteBase()) + '</p>' +
      '<div class="acts"><button class="btn" id="sg-print" type="button">인쇄하기</button></div></div>' +
      nfcHtml(act) +
      '<div class="preview" style="margin-top:24px">' + all + '</div>';
    $('sg-print').onclick = function () { window.print(); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) { b.onclick = function () { copyText(b.getAttribute('data-copy'), b); }; });
    $('sg-nfc').onchange = function () { try { localStorage.setItem('hcc_stamp_nfc', this.checked ? 'Y' : 'N'); } catch (e) {} renderSigns(); };
  }
})();
