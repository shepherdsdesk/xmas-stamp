/* 앱 안 카메라로 QR 읽기 (휴대폰이 허용할 때만). 안 되면 숫자 입력을 쓰면 됩니다. */
var Scanner = (function () {
  var stream = null, timer = null, detector = null, canvas = null, onFound = null;

  function supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }

  function start(video, cb, onFail) {
    onFound = cb;
    if (!supported()) { onFail(why(null)); return; }
    if (!detector && typeof window.BarcodeDetector === 'function') {
      try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; }
    }
    var tries = [{ video: { facingMode: { ideal: 'environment' } }, audio: false }, { video: true, audio: false }];
    (function attempt(i, lastErr) {
      if (i >= tries.length) { onFail(why(lastErr)); return; }
      navigator.mediaDevices.getUserMedia(tries[i]).then(function (s) {
        if (onFound !== cb) { s.getTracks().forEach(function (t) { t.stop(); }); return; } // 그 사이 창을 닫은 경우
        stream = s;
        video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.muted = true; video.autoplay = true;
        video.srcObject = s;
        var play = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
        video.onloadedmetadata = play; play();
        s.getVideoTracks().forEach(function (t) {
          t.onended = function () { if (stream === s) { stop(); onFail('카메라가 꺼졌습니다. [숫자로 넣기]를 누르거나, 휴대폰 카메라 앱으로 안내판 QR을 찍어 주십시오. (ended)'); } };
        });
        loop(video);
      }).catch(function (e) {
        var n = e && e.name;
        if (n === 'NotAllowedError' || n === 'SecurityError') { onFail(why(e)); return; }
        attempt(i + 1, e);
      });
    })(0, null);
  }

  function inApp() { return /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent || ''); }

  function why(e) {
    var n = e && e.name || '';
    if (inApp()) return '카카오톡·네이버 안에서는 카메라가 열리지 않습니다. 휴대폰 카메라 앱으로 안내판 QR을 찍거나, 숫자 4자리를 넣어 주십시오.';
    if (n === 'NotAllowedError' || n === 'SecurityError') return '카메라 사용이 허용되지 않았습니다. 휴대폰 카메라 앱으로 안내판 QR을 찍거나, 숫자 4자리를 넣어 주십시오.';
    if (n === 'NotReadableError' || n === 'AbortError') return '다른 앱이 카메라를 쓰고 있습니다. 다른 앱을 닫고 다시 눌러 주십시오.';
    return '카메라를 열지 못했습니다. 휴대폰 카메라 앱으로 안내판 QR을 찍거나, 숫자 4자리를 넣어 주십시오.' + (n ? ' (' + n + ')' : '');
  }

  function loop(video) {
    if (!stream) return;
    if (video.readyState >= 2 && video.videoWidth) {
      if (detector) {
        detector.detect(video).then(function (codes) {
          if (codes && codes[0]) found(codes[0].rawValue); else timer = setTimeout(function () { loop(video); }, 200);
        }).catch(function () { detector = null; timer = setTimeout(function () { loop(video); }, 200); });
        return;
      }
      if (window.jsQR) {
        var s = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
        canvas = canvas || document.createElement('canvas');
        canvas.width = Math.round(video.videoWidth * s); canvas.height = Math.round(video.videoHeight * s);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var r = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
        if (r && r.data) { found(r.data); return; }
      }
    }
    timer = setTimeout(function () { loop(video); }, 200);
  }

  function found(text) {
    var cb = onFound; stop();
    try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
    if (cb) cb(text);
  }

  function stop() {
    clearTimeout(timer); timer = null; onFound = null;
    if (stream) { stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} }); stream = null; }
  }

  return { supported: supported, start: start, stop: stop };
})();
