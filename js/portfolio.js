/* ==========================================
   COVER 인터랙션
   IIFE로 감싸 전역 변수 충돌 방지
   ========================================== */
(function () {

  /* ── 상수 ── */
  var SH         = 22;
  var SEGS       = 80;
  var WAV        = 4;
  var ENV_RATIO  = 1.52;   /* 봉투 가로/세로 비율 (가로형) */
  var FLAP_RATIO = 0.42;   /* 절취선 위치 */
  var a_spiral   = SH / (2 * Math.PI) * 0.55;

  /* ── DOM ── */
  var $cur   = document.getElementById('cv-cur');
  var $bgCvs = document.getElementById('cv-bg');
  var $env   = document.getElementById('cv-env');
  var $body  = document.getElementById('cv-body');
  var $flap  = document.getElementById('cv-flap');
  var $tz    = document.getElementById('cv-tz');
  var $sw    = document.getElementById('cv-sw');
  var $sc    = document.getElementById('cv-sc');
  var $cw    = document.getElementById('cv-cw');
  var $cc    = document.getElementById('cv-cc');
  var $layer = document.getElementById('cover-layer');

  /* ── 상태 ── */
  var VW=0, VH=0, EW=0, EH=0, FH=0;
  var drag=false, prog=0, tgt=0, raf=null, done=false;
  var waveY=[], stripImg=null;

  /* ── 커서 ── */
  document.addEventListener('mousemove', function (e) {
    $cur.style.left = e.clientX + 'px';
    $cur.style.top  = e.clientY + 'px';
  });

  /* ── torn-edge 파형 사전 계산 ── */
  function buildWave() {
    waveY = [];
    for (var i = 0; i <= 200; i++) {
      var t = i / 200;
      waveY.push(
        Math.sin(t * 19.1 + 0.7) * WAV * .5 +
        Math.sin(t * 37.3 + 2.1) * WAV * .3 +
        Math.sin(t *  7.6 + 1.4) * WAV * .2
      );
    }
  }

  /* ── 어두운 배경 ── */
  function drawBg() {
    $bgCvs.width  = VW;
    $bgCvs.height = VH;
    var ctx = $bgCvs.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, VW, VH);
    g.addColorStop(0,   '#1e1810');
    g.addColorStop(0.5, '#16120c');
    g.addColorStop(1,   '#1a1510');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    for (var i = 0; i < 2000; i++) {
      ctx.fillStyle = 'rgba(255,220,150,' + (Math.random() * .04) + ')';
      ctx.fillRect(Math.random() * VW, Math.random() * VH, 1, 1);
    }
    var vg = ctx.createRadialGradient(VW/2, VH/2, 0, VW/2, VH/2, VW * .6);
    vg.addColorStop(0, 'rgba(200,150,60,.06)');
    vg.addColorStop(1, 'transparent');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VW, VH);
  }

  /* ── 크라프트 텍스처 ── */
  function fillKraft(ctx, w, h, light) {
    var g = ctx.createLinearGradient(0, 0, w, h);
    if (light) {
      g.addColorStop(0,   '#dbb872');
      g.addColorStop(0.4, '#cea658');
      g.addColorStop(0.8, '#d8b568');
      g.addColorStop(1,   '#c9a050');
    } else {
      g.addColorStop(0,    '#d0a460');
      g.addColorStop(0.35, '#c09048');
      g.addColorStop(0.7,  '#caa05a');
      g.addColorStop(1,    '#b88840');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    var id = ctx.getImageData(0, 0, w, h);
    var d  = id.data;
    for (var i = 0; i < d.length; i += 4) {
      var n = (Math.random() - .5) * 20;
      d[i]   = Math.min(255, Math.max(0, d[i]   + n));
      d[i+1] = Math.min(255, Math.max(0, d[i+1] + n));
      d[i+2] = Math.min(255, Math.max(0, d[i+2] + n));
    }
    ctx.putImageData(id, 0, 0);
  }

  /* ── 봉투 몸통 ── */
  function drawEnvBody() {
    $body.width  = EW;
    $body.height = EH;
    var ctx = $body.getContext('2d');
    fillKraft(ctx, EW, EH, false);

    /* 테두리 */
    ctx.save();
    ctx.strokeStyle = 'rgba(80,40,8,.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(.5, .5, EW - 1, EH - 1);
    ctx.restore();

    /* X자 접힘선 */
    ctx.save();
    ctx.strokeStyle = 'rgba(80,40,8,.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0,  EH); ctx.lineTo(EW/2, FH+SH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(EW, EH); ctx.lineTo(EW/2, FH+SH); ctx.stroke();
    ctx.restore();

    /* 좌우 그림자 */
    var lsh = ctx.createLinearGradient(0, 0, 28, 0);
    lsh.addColorStop(0, 'rgba(40,18,3,.15)');
    lsh.addColorStop(1, 'transparent');
    ctx.fillStyle = lsh;
    ctx.fillRect(0, FH, 28, EH - FH);

    var rsh = ctx.createLinearGradient(EW - 28, 0, EW, 0);
    rsh.addColorStop(0, 'transparent');
    rsh.addColorStop(1, 'rgba(40,18,3,.15)');
    ctx.fillStyle = rsh;
    ctx.fillRect(EW - 28, FH, 28, EH - FH);

    /* 절취선 위 그림자 */
    var topSh = ctx.createLinearGradient(0, FH, 0, FH + 18);
    topSh.addColorStop(0, 'rgba(20,8,1,.2)');
    topSh.addColorStop(1, 'transparent');
    ctx.fillStyle = topSh;
    ctx.fillRect(0, FH, EW, 18);
  }

  /* ── 플랩 ── */
  function drawEnvFlap() {
    $flap.width  = EW;
    $flap.height = FH + SH;
    var ctx = $flap.getContext('2d');

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, EW, FH);
    ctx.clip();
    fillKraft(ctx, EW, FH, true);

    /* 하단 그림자 */
    var bsh = ctx.createLinearGradient(0, FH - 20, 0, FH);
    bsh.addColorStop(0, 'transparent');
    bsh.addColorStop(1, 'rgba(20,8,1,.25)');
    ctx.fillStyle = bsh;
    ctx.fillRect(0, 0, EW, FH);

    /* 테두리 */
    ctx.strokeStyle = 'rgba(80,40,8,.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(.5, .5, EW - 1, FH - .5);

    /* PORTFOLIO 텍스트 */
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = '300 ' + Math.round(FH * 0.28) + 'px "Cormorant Garamond"';
    ctx.fillStyle    = 'rgba(40,18,3,.55)';
    ctx.fillText('PORTFOLIO', EW / 2, FH / 2);

    ctx.restore();
  }

  /* ── 절취 띠 ── */
  function drawStrip() {
    $sc.width  = EW;
    $sc.height = SH;
    var ctx = $sc.getContext('2d');

    /* 베이스 */
    ctx.fillStyle = '#e2d0a8';
    ctx.fillRect(0, 0, EW, SH);

    /* 상하 실선 */
    ctx.fillStyle = 'rgba(100,60,10,.3)';
    ctx.fillRect(0, 0,    EW, 1);
    ctx.fillRect(0, SH-1, EW, 1);

    /* 지그재그 */
    var TW = 10;
    ctx.save();
    ctx.beginPath();
    var up = true;
    ctx.moveTo(0, up ? 1.5 : SH - 1.5);
    for (var x = TW; x <= EW + TW; x += TW) {
      up = !up;
      ctx.lineTo(Math.min(x, EW), up ? 1.5 : SH - 1.5);
    }
    ctx.strokeStyle = 'rgba(120,70,15,.3)';
    ctx.lineWidth   = 1.2;
    ctx.lineJoin    = 'miter';
    ctx.stroke();
    ctx.restore();

    /* → DRAG → 텍스트 */
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = '500 ' + Math.round(SH * 0.48) + 'px "Noto Serif KR", monospace';
    ctx.fillStyle    = 'rgba(90,48,8,.65)';
    var BLOCK = 200;
    for (var bx = BLOCK / 2; bx < EW; bx += BLOCK) {
      ctx.fillText('→  DRAG  →', bx, SH / 2);
    }
    ctx.restore();

    createImageBitmap($sc).then(function (bm) { stripImg = bm; });
  }

  /* ── clip-path (플랩 torn edge + 절취 띠) ── */
  function applyClips(p) {
    var tearX = p * EW;

    /* 플랩 torn edge */
    var arr = [];
    for (var i = 0; i <= 200; i++) {
      var xi  = (i / 200) * tearX;
      var idx = Math.round((i / 200) * (waveY.length - 1));
      arr.push({ x: xi, dy: -(Math.abs(waveY[idx]) + 1.5) });
    }
    var poly = '0,0 ' + EW + ',0 ' + EW + ',' + FH + ' ' + tearX + ',' + FH + ' ';
    for (var j = arr.length - 1; j >= 0; j--) {
      poly += arr[j].x + ',' + (FH + arr[j].dy) + ' ';
    }
    $flap.style.clipPath = 'polygon(' + poly.trim() + ')';

    /* 절취 띠: tearX 오른쪽만 */
    if (tearX < 1) {
      $sc.style.clipPath = '';
    } else {
      $sc.style.clipPath =
        'polygon(' + tearX + 'px 0px,' + EW + 'px 0px,' + EW + 'px ' + SH + 'px,' + tearX + 'px ' + SH + 'px)';
    }
  }

  /* ── curl 렌더링 (아르키메데스 나선) ── */
  function drawCurl(p) {
    var ctx = $cc.getContext('2d');
    ctx.clearRect(0, 0, $cc.width, $cc.height);

    var tearX = p * EW;
    if (tearX < 1) return;

    var CH       = $cc.height;
    var baseY    = CH - 12;
    var thetaMax = Math.sqrt(2 * tearX / a_spiral);
    if (thetaMax < 0.01) return;

    var cx = tearX, cy = baseY;
    var N  = SEGS + 1;
    var pts = new Array(N);
    for (var s = 0; s < N; s++) {
      var theta  = (s / SEGS) * thetaMax;
      var r      = a_spiral * theta;
      pts[s] = {
        theta:  theta,
        r:      r,
        sx:     cx - r * Math.sin(theta),
        sy:     cy - r * (1 - Math.cos(theta)),
        scaleY: Math.cos(theta % (2 * Math.PI))
      };
    }

    for (var s = SEGS - 1; s >= 0; s--) {
      var p0 = pts[s], p1 = pts[s + 1];
      var thM     = (p0.theta + p1.theta) * .5;
      var fM      = thM % (2 * Math.PI);
      var scaleYm = Math.cos(fM);
      var absY    = Math.abs((p0.scaleY + p1.scaleY) * .5);
      var isBack  = scaleYm < 0;
      if (absY < 0.012) continue;

      var dx   = Math.min(p0.sx, p1.sx);
      var dw   = Math.abs(p1.sx - p0.sx) + 1.5;
      var dy   = (p0.sy + p1.sy) * .5;
      var srcX = Math.floor((s / SEGS) * tearX);
      var srcW = Math.max(1, Math.ceil(tearX / SEGS) + 1);

      ctx.save();
      ctx.translate(dx, dy);
      ctx.scale(1, absY);
      ctx.translate(0, -SH * .5);

      if (isBack) {
        ctx.globalAlpha = Math.min(1, absY * 4);
        ctx.fillStyle = '#ddc898';
        ctx.fillRect(0, 0, dw, SH);
        var bg = ctx.createLinearGradient(0, 0, 0, SH);
        bg.addColorStop(0,    'rgba(40,20,3,.45)');
        bg.addColorStop(0.45, 'rgba(40,20,3,.07)');
        bg.addColorStop(0.55, 'rgba(40,20,3,.07)');
        bg.addColorStop(1,    'rgba(40,20,3,.45)');
        ctx.globalAlpha = Math.min(1, absY * 2.5);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, dw, SH);
      } else {
        ctx.globalAlpha = 1;
        var src = stripImg || $sc;
        ctx.drawImage(src, srcX, 0, srcW, SH, 0, 0, dw, SH);

        var shadow = (1 - absY) * .85;
        if (shadow > .01) {
          ctx.globalAlpha = shadow;
          ctx.fillStyle   = '#040100';
          ctx.fillRect(0, 0, dw, SH);
        }

        var hl = Math.max(0, (absY - .68) / .32) * .52;
        if (hl > .01) {
          ctx.globalAlpha = hl;
          var hg = ctx.createLinearGradient(0, 0, 0, SH);
          hg.addColorStop(0,    'rgba(255,245,208,.95)');
          hg.addColorStop(0.28, 'rgba(255,245,208,.3)');
          hg.addColorStop(1,    'transparent');
          ctx.fillStyle = hg;
          ctx.fillRect(0, 0, dw, SH);
        }
      }
      ctx.restore();
    }

    /* 뜯기 전선 그림자 */
    if (tearX > 3) {
      ctx.save();
      var eg = ctx.createLinearGradient(tearX - 10, 0, tearX, 0);
      eg.addColorStop(0, 'transparent');
      eg.addColorStop(1, 'rgba(0,0,0,.5)');
      ctx.fillStyle = eg;
      ctx.fillRect(Math.max(0, tearX - 10), baseY - SH, 10, SH);
      ctx.restore();
    }
  }

  /* ── 렌더 루프 ── */
  function render() {
    if (done) return;
    prog += (tgt - prog) * .16;
    applyClips(prog);
    drawCurl(prog);
    if (prog > 0.97) { finish(); return; }
    raf = requestAnimationFrame(render);
  }

  function go() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  }

  /* ── 완료: 봉투 위아래 열리고 커버 제거 ── */
  function finish() {
    done = true;
    cancelAnimationFrame(raf);

    /* 절취 띠·curl 페이드 */
    [$sw, $cw].forEach(function (el) {
      el.style.transition = 'opacity .2s';
      el.style.opacity    = '0';
    });

    /* 봉투 위아래 분리 */
    var dur  = '0.75s';
    var ease = 'cubic-bezier(0.4,0,0.2,1)';
    $flap.style.transition = 'transform ' + dur + ' ' + ease + ', opacity 0.5s ease 0.25s';
    $flap.style.transform  = 'translateY(-108%)';
    $flap.style.opacity    = '0';

    $body.style.transition = 'transform ' + dur + ' ' + ease + ', opacity 0.5s ease 0.25s';
    $body.style.transform  = 'translateY(108%)';
    $body.style.opacity    = '0';

    $bgCvs.style.transition = 'opacity 0.6s ease 0.3s';
    $bgCvs.style.opacity    = '0';

    /* 커버 레이어 제거 + 기본 커서 복원 */
    setTimeout(function () {
      $layer.style.display = 'none';
      document.body.classList.add('cover-done');
      $cur.style.display = 'none';
    }, 900);
  }

  /* ── 이벤트 ── */
  $tz.addEventListener('mousedown', function (e) {
    if (done) return;
    drag = true;
    $cur.classList.add('drag');
    go();
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!drag || done) return;
    var rect = $env.getBoundingClientRect();
    tgt = Math.min(1, Math.max(0, (e.clientX - rect.left) / EW));
  });

  document.addEventListener('mouseup', function () {
    if (!drag) return;
    drag = false;
    $cur.classList.remove('drag');
    if (!done) {
      if (tgt > 0.76) tgt = 1;
      else            tgt = 0;
    }
  });

  $tz.addEventListener('touchstart', function () {
    if (done) return;
    drag = true;
    go();
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!drag || done) return;
    var rect = $env.getBoundingClientRect();
    tgt = Math.min(1, Math.max(0, (e.touches[0].clientX - rect.left) / EW));
  }, { passive: true });

  document.addEventListener('touchend', function () {
    if (!drag) return;
    drag = false;
    if (!done) {
      if (tgt > 0.76) tgt = 1;
      else            tgt = 0;
    }
  });

  /* ── 초기화 ── */
  function init() {
    VW = window.innerWidth;
    VH = window.innerHeight;

    var maxW = VW * .88;
    var maxH = VH * .82;
    EW = Math.min(maxW, maxH * ENV_RATIO);
    EH = EW / ENV_RATIO;
    FH = Math.round(EH * FLAP_RATIO);

    $env.style.width  = EW + 'px';
    $env.style.height = EH + 'px';

    $tz.style.top    = (FH - SH/2 - 10) + 'px';
    $tz.style.height = (SH + 20) + 'px';
    $sw.style.height = SH + 'px';
    $cw.style.height = SH + 'px';

    $cc.width      = EW;
    $cc.height     = 300;
    $cc.style.top  = '-276px';

    buildWave();
    drawBg();
    drawEnvBody();
    drawEnvFlap();
    drawStrip();

    $flap.style.clipPath  = '';
    $flap.style.transform = '';
    $flap.style.opacity   = '1';
    $body.style.transform = '';
    $body.style.opacity   = '1';
    $bgCvs.style.opacity  = '1';
    $bgCvs.style.transition = '';
    $sc.style.clipPath    = '';
    prog = 0; tgt = 0; done = false;
  }

  init();
  window.addEventListener('resize', init);

})(); /* COVER IIFE 끝 */


/* ==========================================
   NAV — 스크롤 시 배경 활성화
   ========================================== */
var nav = document.getElementById('nav');

window.addEventListener('scroll', function () {
  if (window.scrollY > 40) nav.classList.add('sc');
  else                      nav.classList.remove('sc');
});


/* ==========================================
   SCROLL REVEAL — IntersectionObserver
   ========================================== */
var observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.rv').forEach(function (el) {
  observer.observe(el);
});
