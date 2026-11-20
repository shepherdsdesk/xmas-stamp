/* 서버(Supabase) 호출과 공통 도구 */
var Api = (function () {
  var C = window.STAMP_CONFIG || {};
  var NET = '연결이 원활하지 않습니다. 잠시 후 다시 눌러 주십시오.';

  function rpc(fn, args) {
    if (!C.SUPABASE_URL || /여기에|abcdxyz/.test(C.SUPABASE_URL)) {
      return Promise.reject(new Error('js/config.js에 Supabase 연결 정보를 넣어 주십시오.'));
    }
    var key = String(C.SUPABASE_ANON_KEY || '').trim();
    var headers = { 'Content-Type': 'application/json', apikey: key };
    // 예전 anon 키(eyJ…)만 Authorization에도 넣습니다. 새 sb_publishable_ 키는 apikey에만 넣어야 합니다.
    if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key;
    return fetch(String(C.SUPABASE_URL).trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(args || {})
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!r.ok) { var e = new Error(NET); e.detail = j; throw e; }
        return j;
      });
    }, function () { throw new Error(NET); });
  }

  var KEY = 'hcc_stamp_token';
  var mem = null;
  function getToken() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) {}
    if (!v) v = mem;
    return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
  }
  function setToken(t) { mem = t; try { localStorage.setItem(KEY, t); } catch (e) {} }
  function clearToken() { mem = null; try { localStorage.removeItem(KEY); } catch (e) {} }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
  function $(id) { return document.getElementById(id); }

  var tt = null;
  function toast(msg, ms) {
    var el = $('toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(tt); tt = setTimeout(function () { el.classList.remove('show'); }, ms || 2600);
  }
  function busy(btn, on, text) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = '<span class="spin"></span>' + esc(text || '잠시만 기다려 주십시오'); btn.disabled = true; }
    else if (btn.dataset.label != null) { btn.innerHTML = btn.dataset.label; delete btn.dataset.label; btn.disabled = false; }
  }
  function phoneFormat(v) {
    var d = String(v || '').replace(/\D/g, '').slice(0, 11);
    if (d.length < 4) return d;
    if (d.length < 8) return d.slice(0, 3) + '-' + d.slice(3);
    if (d.length === 10) return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
    return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
  }

  function openModal(html, opts) {
    closeModal();
    var m = document.createElement('div');
    m.className = 'modal'; m.id = 'modal';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="sheet">' + html + '</div>';
    if (!opts || opts.dismiss !== false) m.addEventListener('click', function (e) { if (e.target === m) closeModal(); });
    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';
    return m;
  }
  function closeModal() {
    var m = $('modal'); if (m) m.parentNode.removeChild(m);
    document.body.style.overflow = '';
    if (window.Scanner) Scanner.stop();
  }

  return { rpc: rpc, getToken: getToken, setToken: setToken, clearToken: clearToken, esc: esc, nl: nl, $: $,
    toast: toast, busy: busy, phoneFormat: phoneFormat, openModal: openModal, closeModal: closeModal, NET: NET };
})();