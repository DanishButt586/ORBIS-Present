/* ================================================================
   ORBIS — On-Time Ramp Buffer Intelligence System
   Startup Pitch Deck  •  Presentation Script
   ================================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------------
     1.  STATE
  --------------------------------------------------------------- */
  const TOTAL_SLIDES = 12;
  let current = 1;
  let isAnimating = false;
  let notesOpen = false;
  let countersAnimated = {};       // track which slides have had counters run
  let simRunning = false;

  /* ---------------------------------------------------------------
     2.  DOM READY
  --------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initPresentation();
    bindKeyboard();
    bindSimButton();
    bindSimSliders();
    bindTouch();
    initCursorHide();
    updateUI();

    // Wait for fonts, then dismiss loading screen and animate first slide
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(dismissLoader);
    } else {
      // Fallback for browsers without Font Loading API
      setTimeout(dismissLoader, 1500);
    }
  });

  function dismissLoader() {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      loader.classList.add('hidden');
      // Remove from DOM after transition
      setTimeout(() => loader.remove(), 700);
    }
    animateSlide(current);
  }

  /* ---------------------------------------------------------------
     3.  INIT
  --------------------------------------------------------------- */
  function initPresentation() {
    // Mark the first slide active
    const first = getSlide(1);
    if (first) first.classList.add('active');
  }

  /* ---------------------------------------------------------------
     4.  NAVIGATION
  --------------------------------------------------------------- */
  function goToSlide(n) {
    if (n < 1 || n > TOTAL_SLIDES || n === current || isAnimating) return;
    isAnimating = true;

    const prev = getSlide(current);
    const next = getSlide(n);

    // Reset animation items on previous slide
    resetSlide(current);

    // Transition
    if (prev) prev.classList.remove('active');
    if (next) next.classList.add('active');

    current = n;
    updateUI();

    // Trigger animations after brief delay for opacity transition to start
    setTimeout(() => {
      animateSlide(current);
    }, 80);

    // Release navigation lock after CSS transition completes (700ms)
    setTimeout(() => {
      isAnimating = false;
    }, 750);
  }

  function nextSlide() { goToSlide(current + 1); }
  function prevSlide() { goToSlide(current - 1); }

  /* ---------------------------------------------------------------
     5.  UPDATE UI HELPERS
  --------------------------------------------------------------- */
  function updateUI() {
    // Progress bar
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = ((current / TOTAL_SLIDES) * 100) + '%';

    // Slide counter
    const ctr = document.getElementById('slide-counter');
    if (ctr) ctr.textContent = pad(current) + ' / ' + pad(TOTAL_SLIDES);

    // Speaker notes
    document.querySelectorAll('.note-content').forEach(n => n.classList.remove('active'));
    const note = document.querySelector(`.note-content[data-for="${current}"]`);
    if (note) note.classList.add('active');
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function getSlide(n) {
    return document.querySelector(`.slide[data-slide="${n}"]`);
  }

  /* ---------------------------------------------------------------
     6.  SLIDE ELEMENT ANIMATIONS
  --------------------------------------------------------------- */
  function animateSlide(n) {
    const slide = getSlide(n);
    if (!slide) return;

    const items = slide.querySelectorAll('.animate-item');
    items.forEach((el, i) => {
      const delay = parseInt(el.dataset.delay || '0', 10) || (i * 90);
      setTimeout(() => el.classList.add('animated'), delay);
    });

    // Trigger counters for this slide (once)
    if (!countersAnimated[n]) {
      const counters = slide.querySelectorAll('.counter');
      if (counters.length) {
        setTimeout(() => animateCounters(counters), 400);
        countersAnimated[n] = true;
      }
    }

    // Slide-specific hooks
    if (n === 6 && !slide.dataset.charted) {
      setTimeout(() => drawRevenueChart(), 600);
      slide.dataset.charted = '1';
    }
  }

  function resetSlide(n) {
    const slide = getSlide(n);
    if (!slide) return;
    slide.querySelectorAll('.animate-item').forEach(el => el.classList.remove('animated'));
    // Allow counters to re-animate on revisit (useful for video retakes)
    delete countersAnimated[n];
    // Reset chart flag so it redraws
    if (slide.dataset.charted) delete slide.dataset.charted;
  }

  /* ---------------------------------------------------------------
     7.  ANIMATED COUNTERS
  --------------------------------------------------------------- */
  function animateCounters(nodes) {
    nodes.forEach(el => {
      const target = parseFloat(el.dataset.target);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const decimals = (el.dataset.decimals !== undefined) ? parseInt(el.dataset.decimals) : 0;
      const duration = 1600;
      const start = performance.now();

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out quad
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = eased * target;

        el.textContent = prefix + formatNumber(value, decimals) + suffix;

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = prefix + formatNumber(target, decimals) + suffix;
          el.style.animation = 'countPulse 0.35s var(--ease-spring)';
        }
      }

      requestAnimationFrame(tick);
    });
  }

  function formatNumber(n, decimals) {
    if (decimals > 0) return n.toFixed(decimals);
    return Math.round(n).toLocaleString('en-US');
  }

  /* ---------------------------------------------------------------
     8.  MONTE CARLO SIMULATION & INTERACTIVE SLIDERS
  --------------------------------------------------------------- */
  let simDebounceTimer = null;

  function bindSimSliders() {
    const heatInput = document.getElementById('input-heat');
    const gseInput = document.getElementById('input-gse');
    const prmInput = document.getElementById('input-prm');

    const heatVal = document.getElementById('val-heat');
    const gseVal = document.getElementById('val-gse');
    const prmVal = document.getElementById('val-prm');

    if (heatInput && heatVal) {
      heatInput.addEventListener('input', () => {
        const v = parseInt(heatInput.value, 10);
        let status = 'Moderate';
        if (v >= 45) status = 'Extreme';
        else if (v >= 40) status = 'High Stress';
        heatVal.textContent = `${v}°C (${status})`;
        triggerSimDebounce();
      });
    }

    if (gseInput && gseVal) {
      gseInput.addEventListener('input', () => {
        const v = parseInt(gseInput.value, 10);
        let status = 'Ready';
        if (v < 65) status = 'Severe Deficit';
        else if (v < 80) status = 'Constrained';
        gseVal.textContent = `${v}% ${status}`;
        triggerSimDebounce();
      });
    }

    if (prmInput && prmVal) {
      prmInput.addEventListener('input', () => {
        const v = parseInt(prmInput.value, 10);
        prmVal.textContent = `${v} ${v === 1 ? 'Passenger' : 'Passengers'}`;
        triggerSimDebounce();
      });
    }
  }

  function triggerSimDebounce() {
    clearTimeout(simDebounceTimer);
    simDebounceTimer = setTimeout(() => {
      if (!simRunning) runSimulation();
    }, 280);
  }

  function bindSimButton() {
    const btn = document.getElementById('btn-run-sim');
    if (!btn) return;
    btn.addEventListener('click', runSimulation);
  }

  function runSimulation() {
    if (simRunning) return;
    simRunning = true;

    const btn = document.getElementById('btn-run-sim');
    const canvas = document.getElementById('mc-canvas');
    const output = document.getElementById('sim-output');
    if (!canvas || !btn) { simRunning = false; return; }

    btn.classList.add('running');
    btn.textContent = 'Running 1,000 Iterations…';
    output.classList.remove('visible');

    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    // Read live input sliders
    const inputHeat = parseFloat(document.getElementById('input-heat')?.value || 46);
    const inputGSE = parseFloat(document.getElementById('input-gse')?.value || 75) / 100;
    const inputPRM = parseInt(document.getElementById('input-prm')?.value || 3, 10);

    // ---- Simulation ----
    const iterations = 1000;
    const baseTime = 34;           // base turnaround minutes
    const results = [];

    for (let i = 0; i < iterations; i++) {
      // Dynamic noise around slider choices
      const heat = inputHeat + (Math.random() - 0.5) * 3;
      const gse  = Math.max(0.4, Math.min(1.0, inputGSE + (Math.random() - 0.5) * 0.08));
      const mtbf = Math.random() * 0.22;
      const load = 0.70 + Math.random() * 0.25;
      const prm  = Math.max(0, Math.round(inputPRM + (Math.random() - 0.5) * 1.5));

      let t = baseTime;
      // Thermal penalty (Yu & Shi 2024 model)
      t += heat > 40 ? (heat - 40) * 1.05 : 0;
      // GSE equipment deficit penalty
      t += (1 - gse) * 20;
      // Equipment MTBF breakdown risk
      t += mtbf > 0.15 ? mtbf * 20 : 0;
      // Passenger & baggage density
      t += load * 7;
      // PRM boarding & deplaning assistance variance
      t += prm * 2.5;

      results.push(t);
    }

    results.sort((a, b) => a - b);
    const mean = results.reduce((a, b) => a + b, 0) / iterations;
    const p95  = results[Math.floor(iterations * 0.95)];
    const buffer = Math.max(4, Math.ceil(p95 - mean));

    // ---- Histogram ----
    const binCount = 30;
    const minVal = Math.floor(results[0]);
    const maxVal = Math.ceil(results[results.length - 1]);
    const binWidth = (maxVal - minVal) / binCount;
    const bins = new Array(binCount).fill(0);

    results.forEach(v => {
      let idx = Math.floor((v - minVal) / binWidth);
      if (idx >= binCount) idx = binCount - 1;
      bins[idx]++;
    });

    const maxBin = Math.max(...bins);

    // Animate histogram drawing
    const padL = 45, padR = 16, padT = 20, padB = 36;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const barW = chartW / binCount - 2;
    let animStep = 0;

    function drawFrame() {
      ctx.clearRect(0, 0, w, h);

      // Background grid lines
      ctx.strokeStyle = '#E8EFF7';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 4; i++) {
        const y = padT + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + chartW, y);
        ctx.stroke();
      }

      // Y-axis labels
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const y = padT + (chartH / 4) * i;
        const val = Math.round(maxBin * (1 - i / 4));
        ctx.fillText(val, padL - 8, y + 4);
      }

      // Bars
      const barsToShow = Math.min(animStep, binCount);
      for (let i = 0; i < barsToShow; i++) {
        const barH = (bins[i] / maxBin) * chartH;
        const x = padL + i * (chartW / binCount) + 1;
        const y = padT + chartH - barH;

        const binMid = minVal + (i + 0.5) * binWidth;

        if (binMid >= mean && binMid <= p95) {
          ctx.fillStyle = '#0055A4';
        } else if (binMid > p95) {
          ctx.fillStyle = '#DC2626';
        } else {
          ctx.fillStyle = '#93C5FD';
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
        ctx.fill();
      }

      // Mean line
      if (animStep > binCount / 2) {
        const meanX = padL + ((mean - minVal) / (maxVal - minVal)) * chartW;
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(meanX, padT);
        ctx.lineTo(meanX, padT + chartH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#059669';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Mean: ' + mean.toFixed(1) + 'm', meanX, padT - 6);
      }

      // P95 line
      if (animStep > binCount * 0.8) {
        const p95X = padL + ((p95 - minVal) / (maxVal - minVal)) * chartW;
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(p95X, padT);
        ctx.lineTo(p95X, padT + chartH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#DC2626';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('P95: ' + p95.toFixed(1) + 'm', p95X, padT - 6);
      }

      // X-axis labels
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i <= 5; i++) {
        const val = minVal + (maxVal - minVal) * (i / 5);
        const x = padL + chartW * (i / 5);
        ctx.fillText(Math.round(val) + 'm', x, padT + chartH + 18);
      }

      animStep++;
      if (animStep <= binCount + 10) {
        requestAnimationFrame(drawFrame);
      } else {
        // Done - show result
        output.innerHTML =
          '✈️ Recommended Dynamic Buffer: <strong>+' + buffer +
          ' min</strong> &nbsp;|&nbsp; Mean: ' + mean.toFixed(1) +
          'm &nbsp;|&nbsp; P95: ' + p95.toFixed(1) + 'm';
        output.classList.add('visible');

        btn.classList.remove('running');
        btn.textContent = '▶  Run Simulation Again';
        simRunning = false;
      }
    }

    // Start animation
    animStep = 0;
    requestAnimationFrame(drawFrame);
  }

  /* ---------------------------------------------------------------
     9.  REVENUE CHART (Slide 6)
  --------------------------------------------------------------- */
  function drawRevenueChart() {
    const canvas = document.getElementById('revenue-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    const data = [
      { label: 'Year 1', revenue: 4.12, profit: 0.88, color: '#93C5FD' },
      { label: 'Year 2', revenue: 13.15, profit: 3.42, color: '#4A90D9' },
      { label: 'Year 3', revenue: 22.50, profit: 6.62, color: '#0055A4' },
    ];

    const maxVal = 28;
    const padL = 60, padR = 24, padT = 36, padB = 40;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const groupW = chartW / data.length;
    const barW = 48;

    let animProgress = 0;
    const animDuration = 40;

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = '#E8EFF7';
      ctx.lineWidth = 0.5;
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const y = padT + (chartH / 4) * i;
        const val = maxVal * (1 - i / 4);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + chartW, y);
        ctx.stroke();
        ctx.fillText('PKR ' + val.toFixed(0) + 'M', padL - 8, y + 4);
      }

      const eased = Math.min(animProgress / animDuration, 1);
      const t = 1 - Math.pow(1 - eased, 3);

      data.forEach((d, i) => {
        const cx = padL + groupW * i + groupW / 2;

        // Revenue bar
        const rH = (d.revenue / maxVal) * chartH * t;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.roundRect(cx - barW / 2, padT + chartH - rH, barW, rH, [4, 4, 0, 0]);
        ctx.fill();

        // Profit bar (thinner, beside)
        const pH = (d.profit / maxVal) * chartH * t;
        ctx.fillStyle = '#059669';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.roundRect(cx + barW / 2 + 4, padT + chartH - pH, barW * 0.55, pH, [4, 4, 0, 0]);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Labels
        if (t > 0.5) {
          ctx.fillStyle = '#0F1B2D';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('PKR ' + d.revenue.toFixed(1) + 'M', cx, padT + chartH - rH - 8);

          ctx.fillStyle = '#059669';
          ctx.font = '10px Inter, sans-serif';
          ctx.fillText(d.profit.toFixed(1) + 'M', cx + barW / 2 + 4 + barW * 0.275, padT + chartH - pH - 8);
        }

        // X label
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, cx, padT + chartH + 22);
      });

      // Legend (positioned top-left so it never overlaps with Year 3 bar on the right)
      if (t > 0.8) {
        const lx = padL + 12;
        const ly = 12;
        ctx.fillStyle = '#4A90D9';
        ctx.fillRect(lx, ly, 12, 12);
        ctx.fillStyle = '#475569';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Revenue', lx + 18, ly + 10);

        ctx.fillStyle = '#059669';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(lx + 85, ly, 12, 12);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#475569';
        ctx.fillText('Net Profit', lx + 103, ly + 10);
      }

      animProgress++;
      if (animProgress <= animDuration) {
        requestAnimationFrame(draw);
      }
    }

    requestAnimationFrame(draw);
  }

  /* ---------------------------------------------------------------
     10.  SPEAKER NOTES
  --------------------------------------------------------------- */
  function toggleNotes() {
    const panel = document.getElementById('speaker-notes');
    if (!panel) return;
    notesOpen = !notesOpen;
    panel.classList.toggle('open', notesOpen);
  }

  /* ---------------------------------------------------------------
     11.  FULLSCREEN
  --------------------------------------------------------------- */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  /* ---------------------------------------------------------------
     12.  KEYBOARD BINDINGS
  --------------------------------------------------------------- */
  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSlide();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          toggleNotes();
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(1);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(TOTAL_SLIDES);
          break;
      }

      // Number keys 1–9, 0 for slide 10, '-' for slide 11, and '=' for slide 12
      if (e.key >= '1' && e.key <= '9') {
        const n = parseInt(e.key);
        if (n <= TOTAL_SLIDES) goToSlide(n);
      } else if (e.key === '0') {
        goToSlide(10);
      } else if (e.key === '-') {
        goToSlide(11);
      } else if (e.key === '=') {
        goToSlide(12);
      }
    });

    // Click / touch navigation on sides
    document.addEventListener('click', e => {
      // Ignore clicks on buttons, links, inputs, canvas, speaker notes
      if (e.target.closest('button, a, input, canvas, #speaker-notes, #controls-hint')) return;

      const x = e.clientX;
      const w = window.innerWidth;

      if (x < w * 0.2) {
        prevSlide();
      } else if (x > w * 0.8) {
        nextSlide();
      }
    });
  }

  /* ---------------------------------------------------------------
     13.  TOUCH / SWIPE SUPPORT
  --------------------------------------------------------------- */
  function bindTouch() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    document.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const dt = Date.now() - touchStartTime;

      // Must be a quick horizontal swipe (not a slow drag or vertical scroll)
      if (dt > 500) return;
      if (Math.abs(dy) > Math.abs(dx)) return; // vertical — ignore
      if (Math.abs(dx) < 50) return;            // too short — ignore

      if (dx < 0) {
        nextSlide();  // Swipe left → next
      } else {
        prevSlide();  // Swipe right → previous
      }
    }, { passive: true });
  }

  /* ---------------------------------------------------------------
     14.  CURSOR AUTO-HIDE
  --------------------------------------------------------------- */
  function initCursorHide() {
    let hideTimer = null;
    const HIDE_DELAY = 3000; // 3 seconds of inactivity

    function showCursor() {
      document.body.classList.remove('cursor-hidden');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        document.body.classList.add('cursor-hidden');
      }, HIDE_DELAY);
    }

    document.addEventListener('mousemove', showCursor);
    document.addEventListener('mousedown', showCursor);

    // Start the initial hide timer
    hideTimer = setTimeout(() => {
      document.body.classList.add('cursor-hidden');
    }, HIDE_DELAY);
  }

})();
