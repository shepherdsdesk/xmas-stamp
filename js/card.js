/* 말씀 카드 이미지 (휴대폰에 저장하는 그림). 기도제목 내용은 넣지 않습니다. */
var CardMaker = (function () {
  var W = 1080, PAD = 96;
  var SERIF = '"AppleMyungjo", "Noto Serif KR", "Nanum Myeongjo", "Batang", serif';
  var SANS = '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';

  function wrap(ctx, text, maxW) {
    var lines = [];
    String(text || '').split('\n').forEach(function (para) {
      var words = para.split(/(\s+)/), line = '';
      words.forEach(function (w) {
        var test = line + w;
        if (ctx.measureText(test).width <= maxW) { line = test; return; }
        if (line.trim()) { lines.push(line.trim()); line = ''; }
        w = w.trim();
        while (ctx.measureText(w).width > maxW) {
          var cut = w.length;
          while (cut > 1 && ctx.measureText(w.slice(0, cut)).width > maxW) cut--;
          lines.push(w.slice(0, cut)); w = w.slice(cut);
        }
        line = w;
      });
      if (line.trim()) lines.push(line.trim());
    });
    return lines;
  }

  function loadImg(src) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); }; im.onerror = function () { res(null); };
      im.src = src;
    });
  }

  // name: 이름, b: { ref, verse, blessing }, cfg: { title, church }
  function build(name, b, cfg) {
    return loadImg('img/church.jpg').then(function (img) {
      var m = document.createElement('canvas').getContext('2d'), maxW = W - PAD * 2, blocks = [];
      function add(text, font, color, lh, gap) {
        if (!text) return;
        m.font = font; blocks.push({ lines: wrap(m, text, maxW), font: font, color: color, lh: lh, gap: gap });
      }
      add(cfg.title || '성탄 말씀 스탬프 여정', '700 34px ' + SANS, '#e6c06a', 48, 0);
      add(name + ' 님께 드리는 하나님의 말씀', '800 56px ' + SANS, '#ffffff', 76, 16);
      add(b.ref, '800 42px ' + SANS, '#e6c06a', 58, 56);
      add(b.verse, '500 40px ' + SERIF, '#f7f2e6', 66, 16);
      if (b.blessing) {
        add('함께 드리는 기도', '700 34px ' + SANS, '#e6c06a', 48, 64);
        add(b.blessing, '500 36px ' + SERIF, '#f7f2e6', 60, 16);
      }
      var textH = 0; blocks.forEach(function (bl) { textH += bl.gap + bl.lines.length * bl.lh; });
      var photoH = 640, top = photoH + 64, footer = 180;
      var H = Math.max(1920, top + textH + footer);

      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#111b2e'; ctx.fillRect(0, 0, W, H);
      if (img) {
        var s = Math.max(W / img.width, photoH / img.height), iw = img.width * s, ih = img.height * s;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, photoH); ctx.clip();
        ctx.drawImage(img, (W - iw) / 2, (photoH - ih) * 0.3, iw, ih);
        ctx.restore();
      }
      var g = ctx.createLinearGradient(0, photoH - 260, 0, photoH);
      g.addColorStop(0, 'rgba(17,27,46,0)'); g.addColorStop(1, 'rgba(17,27,46,1)');
      ctx.fillStyle = g; ctx.fillRect(0, photoH - 260, W, 260);
      ctx.strokeStyle = 'rgba(230,192,106,.5)'; ctx.lineWidth = 3; ctx.strokeRect(36, 36, W - 72, H - 72);

      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      var y = top + Math.max(0, Math.floor((H - footer - top - textH) / 2));
      blocks.forEach(function (bl) {
        y += bl.gap; ctx.font = bl.font; ctx.fillStyle = bl.color;
        bl.lines.forEach(function (ln) { ctx.fillText(ln, W / 2, y); y += bl.lh; });
      });
      ctx.font = '600 30px ' + SANS; ctx.fillStyle = '#93a0b8';
      ctx.fillText((cfg.church || '') + '  ·  ' + new Date().getFullYear() + ' 성탄', W / 2, H - 120);
      return cv;
    });
  }

  function open(name, b, cfg) {
    Api.openModal('<div class="stack center"><p>말씀 카드를 만들고 있습니다</p></div>');
    build(name, b, cfg).then(function (cv) {
      var url = ''; try { url = cv.toDataURL('image/jpeg', 0.9); } catch (e) {}
      if (!url) { Api.closeModal(); Api.toast('카드를 만들지 못했습니다. 화면을 캡처해 주십시오.'); return; }
      Api.openModal(
        '<div class="stack"><img class="card-img" src="' + url + '" alt="말씀 카드">' +
        '<p class="center muted small">그림을 길게 눌러 사진에 저장할 수 있습니다.</p>' +
        '<button class="btn" type="button" id="cd-share">사진에 저장 · 보내기</button>' +
        '<button class="btn line" type="button" id="cd-close">닫기</button></div>');
      $close();
      Api.$('cd-share').onclick = function () {
        if (!cv.toBlob || !navigator.share) { Api.toast('그림을 길게 눌러 저장해 주십시오.'); return; }
        cv.toBlob(function (blob) {
          try {
            var file = new File([blob], '성탄말씀카드.jpg', { type: 'image/jpeg' });
            if (navigator.canShare && !navigator.canShare({ files: [file] })) throw new Error('no');
            navigator.share({ files: [file] }).catch(function () {});
          } catch (e) { Api.toast('그림을 길게 눌러 저장해 주십시오.'); }
        }, 'image/jpeg', 0.9);
      };
    });
    function $close() { Api.$('cd-close').onclick = Api.closeModal; }
  }

  return { open: open, build: build };
})();
