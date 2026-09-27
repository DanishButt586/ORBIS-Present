/* ================================================================
   ORBIS — On-Time Ramp Buffer Intelligence System
   Startup Pitch Deck  •  Presentation Script
   ================================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------------
     1.  STATE
  --------------------------------------------------------------- */
  const TOTAL_SLIDES = 13;
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
    initTarmacSimulation();
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
    if (n === 2) {
      setTimeout(() => startTarmacSim(), 300);
    }

    if (n === 9 && !slide.dataset.charted) {
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

    // Reset or pause tarmac if leaving slide 2
    if (n === 2) {
      pauseTarmacSim();
    }
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
     10.  LIVE TARMAC SIMULATION ENGINE (SLIDE 2)
  --------------------------------------------------------------- */
  const TARMAC_CYCLE_MS = 20000; // 20 seconds for full 35-min turn cycle
  let tarmacPlaying = false;
  let tarmacProgress = 0;        // 0.0 to 1.0
  let tarmacAnimId = null;
  let tarmacLastTs = 0;
  let tarmacCanvas = null;
  let tarmacCtx = null;

  function initTarmacSimulation() {
    tarmacCanvas = document.getElementById('tarmac-canvas');
    if (!tarmacCanvas) return;
    tarmacCtx = tarmacCanvas.getContext('2d');

    const btnToggle = document.getElementById('btn-toggle-tarmac');
    const btnReset = document.getElementById('btn-reset-tarmac');

    if (btnToggle) {
      btnToggle.addEventListener('click', toggleTarmacSim);
    }
    if (btnReset) {
      btnReset.addEventListener('click', resetTarmacSim);
    }

    // Set initial size
    resizeTarmacCanvas();
    window.addEventListener('resize', resizeTarmacCanvas);

    // Initial render at progress 0
    renderTarmacFrame(0, performance.now());
    updateTarmacUI(0);
  }

  function resizeTarmacCanvas() {
    if (!tarmacCanvas) return;
    const rect = tarmacCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    tarmacCanvas.width = rect.width * dpr;
    tarmacCanvas.height = rect.height * dpr;
    if (tarmacCtx) {
      tarmacCtx.scale(dpr, dpr);
    }
    if (!tarmacPlaying) {
      renderTarmacFrame(tarmacProgress, performance.now());
    }
  }

  function startTarmacSim() {
    if (tarmacPlaying) return;
    tarmacPlaying = true;
    tarmacLastTs = performance.now();
    updateToggleBtnUI(true);
    cancelAnimationFrame(tarmacAnimId);
    tarmacAnimId = requestAnimationFrame(tarmacLoop);
  }

  function pauseTarmacSim() {
    tarmacPlaying = false;
    updateToggleBtnUI(false);
    cancelAnimationFrame(tarmacAnimId);
  }

  function resetTarmacSim() {
    tarmacProgress = 0;
    tarmacLastTs = performance.now();
    updateTarmacUI(0);
    renderTarmacFrame(0, tarmacLastTs);
    startTarmacSim();
  }

  function toggleTarmacSim() {
    if (tarmacPlaying) {
      pauseTarmacSim();
    } else {
      if (tarmacProgress >= 1) tarmacProgress = 0;
      startTarmacSim();
    }
  }

  function updateToggleBtnUI(isPlaying) {
    const icon = document.getElementById('tarmac-btn-icon');
    const text = document.getElementById('tarmac-btn-text');
    if (icon) icon.textContent = isPlaying ? '❚❚' : '▶';
    if (text) text.textContent = isPlaying ? 'Pause Simulation' : 'Run Turnaround Cycle';
  }

  function tarmacLoop(ts) {
    if (!tarmacPlaying) return;
    const delta = ts - tarmacLastTs;
    tarmacLastTs = ts;

    tarmacProgress += delta / TARMAC_CYCLE_MS;

    if (tarmacProgress >= 1.0) {
      tarmacProgress = 1.0;
      renderTarmacFrame(1.0, ts);
      updateTarmacUI(1.0);
      // Seamless auto-loop after a 2-second pause at takeoff
      setTimeout(() => {
        if (current === 2) {
          tarmacProgress = 0;
          if (tarmacPlaying) {
            tarmacLastTs = performance.now();
            tarmacAnimId = requestAnimationFrame(tarmacLoop);
          }
        }
      }, 2200);
      return;
    }

    renderTarmacFrame(tarmacProgress, ts);
    updateTarmacUI(tarmacProgress);

    tarmacAnimId = requestAnimationFrame(tarmacLoop);
  }

  function updateTarmacUI(p) {
    // 1. Digital Clock (00:00 -> 35:00 min)
    const clockEl = document.getElementById('tarmac-clock');
    const totalSec = Math.floor(p * 35 * 60);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${mm}:${ss}`;

    // 2. Phase Indicator & Task Pills
    const phaseEl = document.getElementById('tarmac-phase-text');
    const pillChocks = document.getElementById('task-chocks');
    const pillBaggage = document.getElementById('task-baggage');
    const pillFuel = document.getElementById('task-fuel');
    const pillPrm = document.getElementById('task-prm');
    const pillPushback = document.getElementById('task-pushback');

    const pills = [pillChocks, pillBaggage, pillFuel, pillPrm, pillPushback];
    pills.forEach(el => el && el.classList.remove('active'));

    if (p < 0.18) {
      if (phaseEl) phaseEl.innerHTML = '🛬 Phase 1: Inbound Taxi &amp; Gate Docking';
    } else if (p < 0.38) {
      if (phaseEl) phaseEl.innerHTML = '🔌 Phase 2: Chocks In, GPU Power &amp; Cargo Deplaning';
      if (pillChocks) pillChocks.classList.add('active');
      if (pillBaggage) pillBaggage.classList.add('active');
    } else if (p < 0.65) {
      if (phaseEl) phaseEl.innerHTML = '⛽ Phase 2: Parallel Wing Fueling &amp; PRM Passenger Boarding';
      if (pillChocks) pillChocks.classList.add('active');
      if (pillBaggage) pillBaggage.classList.add('active');
      if (pillFuel) pillFuel.classList.add('active');
      if (pillPrm) pillPrm.classList.add('active');
    } else if (p < 0.78) {
      if (phaseEl) phaseEl.innerHTML = '📋 Phase 2: Cabin Secured &amp; Ground Equipment Clearance';
      if (pillChocks) pillChocks.classList.add('active');
      if (pillBaggage) pillBaggage.classList.add('active');
      if (pillFuel) pillFuel.classList.add('active');
      if (pillPrm) pillPrm.classList.add('active');
    } else {
      if (phaseEl) phaseEl.innerHTML = '🛫 Phase 3: Pushback &amp; On-Time Departure (35:00 min)';
      if (pillChocks) pillChocks.classList.add('active');
      if (pillBaggage) pillBaggage.classList.add('active');
      if (pillFuel) pillFuel.classList.add('active');
      if (pillPrm) pillPrm.classList.add('active');
      if (pillPushback) pillPushback.classList.add('active');
    }
  }

  /* ---------------------------------------------------------------
     TARMAC CANVAS RENDERING ENGINE
  --------------------------------------------------------------- */
  function renderTarmacFrame(p, now) {
    if (!tarmacCanvas || !tarmacCtx) return;
    const ctx = tarmacCtx;
    const rect = tarmacCanvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    // Coordinate Anchors
    const bayX = Math.round(W * 0.44);
    const bayY = Math.round(H * 0.52);

    // 1. Apron Tarmac Asphalt Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#131e31');
    bgGrad.addColorStop(1, '#0b1322');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Concrete Slab Joints Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 30; x < W; x += 55) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 30; y < H; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 2. Stand Markings & Safety Enclosure
    // Red & white dashed safety box
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bayX - 110, bayY - 90, 230, 180);
    ctx.restore();

    // Taxiway Centerline (Yellow Lead-in Line)
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W + 20, bayY);
    ctx.lineTo(bayX - 50, bayY);
    ctx.stroke();

    // Stop Bar (T-Bar)
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bayX - 52, bayY - 18);
    ctx.lineTo(bayX - 52, bayY + 18);
    ctx.stroke();

    // Stenciled Text: "STAND 04" on tarmac
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.font = 'bold 13px Inter, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('STAND 04', bayX - 100, bayY - 70);
    ctx.fillText('B737-800', bayX - 100, bayY + 80);

    // Staging equipment boundary boxes
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bayX - 95, bayY + 45, 45, 35); // GSE staging box
    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('GSE', bayX - 85, bayY + 65);

    // 3. Aircraft Kinematics & States
    let planeX = bayX;
    let planeY = bayY;
    let planeRot = Math.PI; // Heading 180° = facing left (docked)
    let planeScale = 1.0;
    let enginesOn = false;
    let showChocks = false;
    let showGpu = false;
    let showBaggage = false;
    let showFuel = false;
    let showPrm = false;
    let showTug = false;
    let tugPushing = false;

    if (p < 0.18) {
      // Phase 1: Inbound Taxi
      const tNorm = p / 0.18;
      const eased = 1 - Math.pow(1 - tNorm, 2.5); // Smooth deceleration
      planeX = (W + 90) - eased * (W + 90 - bayX);
      planeY = bayY;
      planeRot = Math.PI;
    } else if (p < 0.78) {
      // Phase 2: Docked at Stand 04
      planeX = bayX;
      planeY = bayY;
      planeRot = Math.PI;
      showChocks = true;
      showGpu = true;

      if (p >= 0.22 && p < 0.72) showBaggage = true;
      if (p >= 0.38 && p < 0.70) showFuel = true;
      if (p >= 0.38 && p < 0.74) showPrm = true;

      if (p >= 0.70) {
        showTug = true; // Tug positions in front of nose gear
      }
    } else if (p < 0.88) {
      // Phase 3a: Pushback Tug Operation
      const tNorm = (p - 0.78) / 0.10; // 0 to 1
      showTug = true;
      tugPushing = true;
      // Plane moves backwards and turns 90 degrees
      planeX = bayX + tNorm * 110;
      planeY = bayY - Math.sin(tNorm * Math.PI * 0.5) * 20;
      planeRot = Math.PI - tNorm * (Math.PI * 0.5); // Turns from 180° to 90° (upward)
    } else {
      // Phase 3b: Departure Taxi & Takeoff Acceleration
      const tNorm = (p - 0.88) / 0.12; // 0 to 1
      enginesOn = true;
      // Heading straight to the right along runway
      planeRot = 0; // Facing right
      planeY = bayY - 20;
      const accel = Math.pow(tNorm, 2); // Acceleration
      planeX = (bayX + 110) + accel * (W - bayX);
      planeScale = 1.0 + tNorm * 0.25; // Climbing / zoom effect
    }

    // 4. Draw Ground Support Equipment (GSE) when parked or active
    if (showGpu) {
      drawGPU(ctx, bayX - 35, bayY + 50, bayX - 52, bayY + 6, now, p >= 0.20 && p < 0.72);
    }

    if (showBaggage) {
      drawBaggageBelt(ctx, bayX + 40, bayY + 36, bayX + 28, bayY + 12, now);
    }

    if (showFuel) {
      drawFuelTruck(ctx, bayX + 20, bayY - 60, bayX + 12, bayY - 26, now);
    }

    if (showPrm) {
      drawPRMStairs(ctx, bayX - 42, bayY - 42, bayX - 32, bayY - 12, bayX + 38, bayY - 40, now);
    }

    if (showChocks && !tugPushing) {
      drawChocks(ctx, bayX + 12, bayY - 24);
      drawChocks(ctx, bayX + 12, bayY + 24);
    }

    if (showTug) {
      if (tugPushing) {
        // Connected to nose during pushback
        const tugDist = 48;
        const tugX = planeX + Math.cos(planeRot) * tugDist;
        const tugY = planeY + Math.sin(planeRot) * tugDist;
        drawPushbackTug(ctx, tugX, tugY, planeRot, true);
      } else {
        // Staged ahead of nose
        drawPushbackTug(ctx, bayX - 78, bayY, Math.PI, false);
      }
    }

    // 5. Draw Vector Aircraft
    drawVectorAircraft(ctx, planeX, planeY, planeRot, planeScale, now, enginesOn);
  }

  /* ---------------------------------------------------------------
     DETAILED VECTOR AIRCRAFT (B737 STYLE TOP-DOWN)
  --------------------------------------------------------------- */
  function drawVectorAircraft(ctx, x, y, heading, scale, now, enginesOn) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    ctx.scale(scale, scale);

    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(3, 4, 60, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Twin Engine Jet Blast (if active)
    if (enginesOn) {
      const blastLen = 35 + Math.sin(now * 0.05) * 12;
      const blastGrad = ctx.createLinearGradient(0, 0, -blastLen, 0);
      blastGrad.addColorStop(0, 'rgba(249, 115, 22, 0.9)');
      blastGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.5)');
      blastGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      // Left engine exhaust
      ctx.save();
      ctx.translate(-5, -28);
      ctx.fillStyle = blastGrad;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-blastLen, -2);
      ctx.lineTo(0, 2);
      ctx.fill();
      ctx.restore();

      // Right engine exhaust
      ctx.save();
      ctx.translate(-5, 28);
      ctx.fillStyle = blastGrad;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(-blastLen, 2);
      ctx.lineTo(0, 6);
      ctx.fill();
      ctx.restore();
    }

    // Swept Main Wings
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(15, -6);
    ctx.lineTo(-12, -62); // Port wing tip
    ctx.lineTo(-24, -62);
    ctx.lineTo(-10, -6);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(15, 6);
    ctx.lineTo(-12, 62);  // Starboard wing tip
    ctx.lineTo(-24, 62);
    ctx.lineTo(-10, 6);
    ctx.closePath();
    ctx.fill();

    // Wingtips / Winglets (Aviation Blue)
    ctx.fillStyle = '#0055A4';
    ctx.fillRect(-24, -64, 12, 4);
    ctx.fillRect(-24, 60, 12, 4);

    // Twin Engines (Turbofan Nacelles)
    ctx.fillStyle = '#94A3B8';
    // Port engine
    ctx.beginPath();
    ctx.roundRect(-4, -33, 22, 10, 4);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.fillRect(14, -32, 3, 8); // Engine intake ring

    // Starboard engine
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.roundRect(-4, 23, 22, 10, 4);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.fillRect(14, 24, 3, 8); // Engine intake ring

    // Horizontal Stabilizers (Tail Wings)
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(-45, -4);
    ctx.lineTo(-65, -26);
    ctx.lineTo(-72, -26);
    ctx.lineTo(-62, -4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-45, 4);
    ctx.lineTo(-65, 26);
    ctx.lineTo(-72, 26);
    ctx.lineTo(-62, 4);
    ctx.closePath();
    ctx.fill();

    // Fuselage (Main Body)
    const fuseGrad = ctx.createLinearGradient(0, -11, 0, 11);
    fuseGrad.addColorStop(0, '#FFFFFF');
    fuseGrad.addColorStop(0.5, '#F1F5F9');
    fuseGrad.addColorStop(1, '#CBD5E1');
    ctx.fillStyle = fuseGrad;

    ctx.beginPath();
    ctx.moveTo(60, 0); // Nose cone
    ctx.bezierCurveTo(55, -11, 40, -11, 10, -11);
    ctx.lineTo(-50, -10);
    ctx.bezierCurveTo(-65, -7, -72, -3, -75, 0); // Tail cone
    ctx.bezierCurveTo(-72, 3, -65, 7, -50, 10);
    ctx.lineTo(10, 11);
    ctx.bezierCurveTo(40, 11, 55, 11, 60, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Airline Liveried Cheatline (Navy Blue Stripe)
    ctx.fillStyle = '#0055A4';
    ctx.fillRect(-52, -1.5, 95, 3);

    // Cockpit Windows (Dark Glass with Cyan Specular Shine)
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(52, -5);
    ctx.lineTo(43, -7);
    ctx.lineTo(43, 7);
    ctx.lineTo(52, 5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(51, -3);
    ctx.lineTo(45, -5);
    ctx.stroke();

    // Vertical Fin Dorsal Spine (Tail Fin)
    ctx.fillStyle = '#0055A4';
    ctx.beginPath();
    ctx.roundRect(-70, -2, 22, 4, 2);
    ctx.fill();

    // Navigation & Strobe Lights
    // Left Wing Tip Nav Light (Red)
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(-18, -63, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Right Wing Tip Nav Light (Green)
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(-18, 63, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Red Anti-Collision Beacon (Pulsing every 800ms)
    const beaconPulse = (Math.sin(now * 0.007) + 1) * 0.5;
    ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + beaconPulse * 0.6})`;
    ctx.beginPath();
    ctx.arc(8, 0, 3 + beaconPulse * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ---------------------------------------------------------------
     GSE VEHICLES & EQUIPMENT DRAWING FUNCTIONS
  --------------------------------------------------------------- */
  function drawChocks(ctx, x, y) {
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(x - 5, y - 4, 10, 3);
    ctx.fillRect(x - 5, y + 2, 10, 3);
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(x - 2, y - 4, 4, 9);
  }

  function drawGPU(ctx, gx, gy, px, py, now, active) {
    // Mobile GPU Cart
    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.roundRect(gx - 12, gy - 8, 24, 16, 3);
    ctx.fill();
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Wheels
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(gx - 10, gy - 10, 5, 2);
    ctx.fillRect(gx + 5, gy - 10, 5, 2);
    ctx.fillRect(gx - 10, gy + 8, 5, 2);
    ctx.fillRect(gx + 5, gy + 8, 5, 2);

    // Label
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 8px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GPU', gx, gy + 3);

    // Power Cable to Aircraft Nose
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx, gy - 8);
    ctx.quadraticCurveTo(gx - 8, py + 12, px, py);
    ctx.stroke();

    // Electric current flow pulse
    if (active) {
      const pulseT = (now % 1000) / 1000;
      const dotX = gx + (px - gx) * pulseT;
      const dotY = (gy - 8) + (py - (gy - 8)) * pulseT;
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBaggageBelt(ctx, bx, by, px, py, now) {
    // Belt Loader Vehicle
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(bx - 14, by - 8, 28, 16, 3);
    ctx.fill();
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(bx + 4, by - 7, 8, 14); // Driver cab

    // Conveyor Belt Ramp to Cargo Door
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(bx - 12, by);
    ctx.lineTo(px, py);
    ctx.stroke();

    // Moving Luggage on Belt
    const offset = (now * 0.04) % 20;
    const bags = [
      { col: '#EF4444', d: 0.2 },
      { col: '#0284C7', d: 0.55 },
      { col: '#10B981', d: 0.85 }
    ];

    bags.forEach((b, i) => {
      const t = (b.d + offset * 0.05) % 1;
      const lx = (bx - 12) + (px - (bx - 12)) * t;
      const ly = by + (py - by) * t;
      ctx.fillStyle = b.col;
      ctx.fillRect(lx - 2, ly - 2, 4, 4);
    });

    // Baggage Tow Tractor + Cart
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(bx + 20, by - 5, 12, 10);
    ctx.fillStyle = '#64748B';
    ctx.fillRect(bx + 34, by - 4, 10, 8); // Cart 1
    ctx.fillRect(bx + 46, by - 4, 10, 8); // Cart 2
  }

  function drawFuelTruck(ctx, fx, fy, wx, wy, now) {
    // Fuel Hydrant Tanker Truck
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(fx - 18, fy - 10, 36, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(fx - 14, fy - 8, 18, 16); // Red aviation fuel tank
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 7px Inter, sans-serif';
    ctx.fillText('JET A-1', fx - 5, fy + 3);

    // Fueling Hose to Wing Port
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fx, fy + 10);
    ctx.quadraticCurveTo(fx - 6, wy - 8, wx, wy);
    ctx.stroke();

    // Pulsing Fuel Flow dots
    const flowT = (now % 1200) / 1200;
    const hx = fx + (wx - fx) * flowT;
    const hy = (fy + 10) + (wy - (fy + 10)) * flowT;
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(hx, hy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPRMStairs(ctx, sx, sy, px1, py1, px2, py2, now) {
    // Passenger Forward Stairs
    ctx.fillStyle = '#64748B';
    ctx.fillRect(sx - 8, sy - 8, 16, 16);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(px1, py1);
    ctx.stroke();

    // Aft PRM Ambulift High-Lift Vehicle
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(px2 - 8, py2 - 20, 18, 16, 2);
    ctx.fill();
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Scissor Lift Metal Struts
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px2 - 6, py2 - 4);
    ctx.lineTo(px2 + 6, py2 - 18);
    ctx.moveTo(px2 + 6, py2 - 4);
    ctx.lineTo(px2 - 6, py2 - 18);
    ctx.stroke();

    // Glowing PRM Wheelchair Badge
    ctx.fillStyle = '#0284C7';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♿', px2 + 1, py2 - 8);
  }

  function drawPushbackTug(ctx, tx, ty, rot, connected) {
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(rot);

    // Towbarless Pushback Tractor
    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.roundRect(-14, -10, 28, 20, 4);
    ctx.fill();

    // Black Hazard Chevrons on Rear
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-14, -8, 4, 16);

    // Operator Cabin
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(2, -7, 8, 14);

    // Tow Clamp to Nose Gear
    if (connected) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-24, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ---------------------------------------------------------------
     11.  SPEAKER NOTES
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

      // Number keys 1–9, 0 for slide 10, '-' for slide 11, '=' for slide 12, ']' or '`' for slide 13
      if (e.key >= '1' && e.key <= '9') {
        const n = parseInt(e.key);
        if (n <= TOTAL_SLIDES) goToSlide(n);
      } else if (e.key === '0') {
        goToSlide(10);
      } else if (e.key === '-') {
        goToSlide(11);
      } else if (e.key === '=') {
        goToSlide(12);
      } else if (e.key === ']' || e.key === '`') {
        goToSlide(13);
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
