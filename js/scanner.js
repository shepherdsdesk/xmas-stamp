/* 앱 안 카메라로 QR 읽기 (휴대폰이 허용할 때만). 안 되면 숫자 입력을 쓰면 됩니다. */
var Scanner = (function () {
  var stream = null, timer = null, detector = null, canvas = null, onFound = null;

  function supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }

  function start(video, cb, onFail) {
    onFound = cb;
    if (!supported()) { onFail('이 휴대폰에서는 카메라를 열 수 없습니다.'); return; }
    if (!detector && typeof window.BarcodeDetector === 'function') {
      try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; }
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(function (s) {
        stream = s; video.srcObject = s; video.setAttribute('playsinline', ''); video.muted = true;
        var p = video.play(); if (p && p.catch) p.catch(function () {});
        loop(video);
      })
      .catch(function () { onFail('카메라를 열지 못했습니다. 안내판의 숫자 4자리를 넣어 주십시오.'); });
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
