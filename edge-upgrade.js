// ═══════════════════════════════════════════════════════════════
// TADAWUL US PRO — EDGE UPGRADE v2
// Injects: GEX Panel, Institutional Flow, Sweep Detection,
//          Max Pain, Dealer Positioning, Smart Entry Zones
// Load via: <script src="edge-upgrade.js"></script> before </body>
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ═══ CACHE ═══
  const _edgeCache = {};
  let _edgePanelOpen = false;
  let _lastEdgeSym = null;

  // ═══ INJECT CSS ═══
  const css = document.createElement('style');
  css.textContent = `
    .edge-panel{background:linear-gradient(180deg,rgba(0,229,255,.02),var(--c1));border-top:2px solid var(--cy);overflow:hidden;transition:max-height .3s}
    .edge-hd{padding:6px 10px;background:linear-gradient(135deg,rgba(0,229,255,.08),rgba(74,158,255,.04));border-bottom:1px solid rgba(0,229,255,.15);display:flex;align-items:center;gap:8px;cursor:pointer}
    .edge-title{font-size:11px;font-weight:800;color:var(--cy);letter-spacing:.5px}
    .edge-badge{font-size:8px;padding:2px 8px;border-radius:10px;font-weight:700;border:1px solid}
    .edge-body{overflow-y:auto;max-height:55vh;scrollbar-width:thin;padding:0}
    .edge-body::-webkit-scrollbar{width:3px}.edge-body::-webkit-scrollbar-thumb{background:var(--c4)}
    .edge-section{padding:8px 10px;border-bottom:1px solid rgba(0,229,255,.08)}
    .edge-section-title{font-size:9px;font-weight:700;letter-spacing:.5px;margin-bottom:6px;display:flex;align-items:center;gap:5px}
    .edge-grid{display:grid;gap:4px}
    .edge-cell{background:var(--c2);border:1px solid var(--bd);border-radius:4px;padding:5px 7px}
    .edge-cell .el{font-size:7px;color:var(--t3);letter-spacing:.3px;margin-bottom:2px}
    .edge-cell .ev{font-size:13px;font-weight:800;font-family:'IBM Plex Mono',monospace}
    .edge-cell .ed{font-size:8px;color:var(--t2);margin-top:2px}
    .gex-bar{display:flex;align-items:center;gap:4px;margin:2px 0;font-size:9px}
    .gex-bar .gb-strike{min-width:50px;font-weight:700;font-family:monospace;color:var(--t2)}
    .gex-bar .gb-track{flex:1;height:8px;background:var(--c3);border-radius:4px;overflow:hidden;position:relative}
    .gex-bar .gb-fill{height:100%;border-radius:4px;transition:width .4s}
    .gex-bar .gb-val{min-width:40px;text-align:left;font-size:8px;font-family:monospace}
    .sweep-row{display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:1px solid var(--bd);font-size:9px;cursor:pointer;transition:background .1s}
    .sweep-row:hover{background:var(--c3)}
    .sweep-badge{font-size:7px;padding:1px 5px;border-radius:2px;font-weight:700}
    .sweep-call{background:rgba(14,207,126,.12);color:var(--up);border:1px solid rgba(14,207,126,.25)}
    .sweep-put{background:rgba(240,68,88,.12);color:var(--dn);border:1px solid rgba(240,68,88,.25)}
    .sweep-urgent{background:rgba(255,107,157,.15);color:var(--pm);border:1px solid rgba(255,107,157,.3);animation:pulse-sweep 1.5s infinite}
    @keyframes pulse-sweep{0%,100%{opacity:1}50%{opacity:.6}}
    .edge-level{display:flex;align-items:center;justify-content:space-between;padding:5px 8px;border-bottom:1px solid var(--bd);font-size:9px}
    .edge-level-bar{height:4px;flex:1;background:var(--c3);border-radius:2px;margin:0 8px;overflow:hidden}
    .edge-level-fill{height:100%;border-radius:2px}
    .edge-factor{display:flex;align-items:center;gap:6px;padding:3px 6px;margin:2px 0;border-radius:4px;font-size:9px}
    .edge-factor.positive{background:rgba(14,207,126,.06);border-right:2px solid var(--up)}
    .edge-factor.negative{background:rgba(240,68,88,.06);border-right:2px solid var(--dn)}
    .regime-indicator{padding:8px 10px;border-radius:6px;text-align:center;margin:4px 0;font-size:10px;font-weight:700}
    .regime-positive{background:rgba(14,207,126,.08);border:1px solid rgba(14,207,126,.25);color:var(--up)}
    .regime-negative{background:rgba(240,68,88,.08);border:1px solid rgba(240,68,88,.25);color:var(--dn)}
    .edge-score-ring{width:64px;height:64px;position:relative;display:flex;align-items:center;justify-content:center}
    .edge-score-ring svg{position:absolute;top:0;left:0;transform:rotate(-90deg)}
    .edge-score-val{font-size:18px;font-weight:900;font-family:'IBM Plex Mono',monospace}
    .maxpain-visual{position:relative;height:32px;background:linear-gradient(to left,rgba(14,207,126,.08),rgba(245,200,66,.08),rgba(240,68,88,.08));border-radius:5px;margin:8px 0}
    .maxpain-marker{position:absolute;top:-14px;transform:translateX(50%);text-align:center;font-size:7px;font-weight:700;font-family:monospace}
    .maxpain-marker::after{content:'';position:absolute;bottom:-28px;right:50%;width:2px;height:32px;border-radius:1px}
    .maxpain-marker.price-m{color:var(--bl)}.maxpain-marker.price-m::after{background:var(--bl)}
    .maxpain-marker.pain-m{color:var(--gd)}.maxpain-marker.pain-m::after{background:var(--gd);width:3px}
    .maxpain-marker.flip-m{color:var(--pu)}.maxpain-marker.flip-m::after{background:var(--pu);opacity:.5}
    .edge-scan-btn{font-size:10px;padding:3px 12px;border-radius:4px;background:linear-gradient(135deg,rgba(0,229,255,.2),rgba(74,158,255,.12));border:1px solid rgba(0,229,255,.4);color:var(--cy);cursor:pointer;font-family:inherit;font-weight:700;transition:all .15s}
    .edge-scan-btn:hover{background:linear-gradient(135deg,rgba(0,229,255,.3),rgba(74,158,255,.2))}
    .edge-loader{display:flex;align-items:center;gap:6px;padding:12px;font-size:10px;color:var(--t3)}
    .edge-loader .spin{width:14px;height:14px;border:2px solid var(--c4);border-top-color:var(--cy);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(css);

  // ═══ INJECT PANEL INTO DOM ═══
  function injectPanel() {
    // Insert before the earnings panel or at end of .ctr
    const ctr = document.querySelector('.ctr');
    if (!ctr) return;
    const earnPanel = document.getElementById('earn-panel');

    const panel = document.createElement('div');
    panel.className = 'edge-panel';
    panel.id = 'edge-panel';
    panel.innerHTML = `
      <div class="edge-hd" onclick="window._toggleEdge()">
        <span style="font-size:14px">🔬</span>
        <span class="edge-title">مسح مؤسسي متقدم — GEX • Flow • Sweep</span>
        <span class="edge-badge" id="edge-badge" style="background:rgba(0,229,255,.1);color:var(--cy);border-color:rgba(0,229,255,.3)">غير مفعّل</span>
        <button class="edge-scan-btn" id="edge-scan-btn" onclick="event.stopPropagation();window._runEdgeScan()">🔬 مسح متقدم</button>
        <span id="edge-arrow" style="margin-right:auto;color:var(--t3);font-size:10px">▼</span>
      </div>
      <div id="edge-body" class="edge-body" style="display:none">
        <div id="edge-content">
          <div style="padding:14px;text-align:center;color:var(--t3);font-size:10px">
            اضغط "مسح متقدم" لتشغيل التحليل المؤسسي<br>
            <span style="font-size:8px;color:var(--t3);margin-top:4px;display:block">GEX • Max Pain • Sweep Detection • Dealer Positioning • IV Skew</span>
          </div>
        </div>
      </div>
    `;

    if (earnPanel) {
      ctr.insertBefore(panel, earnPanel);
    } else {
      ctr.appendChild(panel);
    }

    // Add button to scan bar
    const scanBar = document.querySelector('.sa');
    if (scanBar) {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.cssText = 'border-color:rgba(0,229,255,.3);color:var(--cy);background:rgba(0,229,255,.06)';
      btn.innerHTML = '🔬 مؤسسي';
      btn.onclick = () => window._runEdgeScan();
      scanBar.appendChild(btn);
    }
  }

  // ═══ TOGGLE PANEL ═══
  window._toggleEdge = function() {
    _edgePanelOpen = !_edgePanelOpen;
    const body = document.getElementById('edge-body');
    const arrow = document.getElementById('edge-arrow');
    if (body) body.style.display = _edgePanelOpen ? 'block' : 'none';
    if (arrow) arrow.textContent = _edgePanelOpen ? '▲' : '▼';
  };

  // ═══ RUN EDGE SCAN ═══
  window._runEdgeScan = async function() {
    const sym = window.G?.sel;
    const price = window.G?.pr?.[sym];
    if (!sym || !price) {
      alert('اختر سهماً أولاً');
      return;
    }

    if (!_edgePanelOpen) window._toggleEdge();

    const content = document.getElementById('edge-content');
    content.innerHTML = `<div class="edge-loader"><div class="spin"></div>جاري المسح المؤسسي المتقدم — ${sym}...</div>`;

    try {
      const ind = window.G?.ind?.[sym];
      const sc = window.G?.sc?.[sym];
      const hv = ind?.atr ? Math.min(1.5, Math.max(0.15, (ind.atr / price) * Math.sqrt(252))) : 0.30;

      const rsp = await fetch('/api/scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: sym,
          underlyingPrice: price,
          historicalVol: hv,
          technicalScore: sc?.str || 50,
          sniperScore: sc?.sniper?.score || 0,
          sniperDir: sc?.sniper?.dir || 'محايد',
        }),
      });

      const data = await rsp.json();
      if (data.error) throw new Error(data.error);

      _edgeCache[sym] = data;
      _lastEdgeSym = sym;
      renderEdge(data);

      // Update badge
      const badge = document.getElementById('edge-badge');
      const edgeCol = data.edge.score >= 70 ? 'var(--up)' : data.edge.score >= 50 ? 'var(--gd)' : 'var(--dn)';
      if (badge) {
        badge.style.color = edgeCol;
        badge.style.background = data.edge.score >= 70 ? 'rgba(14,207,126,.12)' : data.edge.score >= 50 ? 'rgba(245,200,66,.1)' : 'rgba(240,68,88,.1)';
        badge.style.borderColor = edgeCol;
        badge.textContent = `Edge ${data.edge.score} — ${data.edge.direction}`;
      }
    } catch (e) {
      content.innerHTML = `<div style="padding:12px;color:var(--dn);font-size:10px">⚠ ${e.message}</div>`;
    }
  };

  // ═══ RENDER EDGE DATA ═══
  function renderEdge(d) {
    const content = document.getElementById('edge-content');
    const edgeCol = d.edge.score >= 70 ? 'var(--up)' : d.edge.score >= 50 ? 'var(--gd)' : 'var(--dn)';
    const gexCol = d.gex.regime === 'positive' ? 'var(--up)' : 'var(--dn)';

    let html = '';

    // ══ SECTION 1: COMPOSITE EDGE SCORE ══
    html += `<div class="edge-section" style="background:linear-gradient(135deg,${edgeCol === 'var(--up)' ? 'rgba(14,207,126,.04)' : edgeCol === 'var(--dn)' ? 'rgba(240,68,88,.04)' : 'rgba(245,200,66,.04)'},transparent)">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="text-align:center">
          <svg width="68" height="68" viewBox="0 0 68 68" style="transform:rotate(-90deg)">
            <circle cx="34" cy="34" r="28" fill="none" stroke="var(--c4)" stroke-width="4"/>
            <circle cx="34" cy="34" r="28" fill="none" stroke="${edgeCol}" stroke-width="4"
              stroke-dasharray="${2*Math.PI*28}" stroke-dashoffset="${2*Math.PI*28*(1-d.edge.score/100)}"
              stroke-linecap="round" style="transition:stroke-dashoffset .8s"/>
          </svg>
          <div style="position:relative;top:-46px;font-size:20px;font-weight:900;color:${edgeCol};font-family:monospace">${d.edge.score}</div>
          <div style="position:relative;top:-42px;font-size:7px;color:var(--t3)">EDGE SCORE</div>
        </div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:900;color:${edgeCol};margin-bottom:4px">
            ${d.edge.direction === 'صعودي' ? '▲ ميزة صعودية' : d.edge.direction === 'هبوطي' ? '▼ ميزة هبوطية' : '◆ محايد'}
          </div>
          <div style="font-size:9px;color:var(--t2);line-height:1.6">
            ${d.edge.factors.map(f =>
              `<div class="edge-factor ${f.impact.startsWith('+') ? 'positive' : 'negative'}">
                <span style="min-width:80px;color:var(--t1);font-weight:600">${f.name}</span>
                <span style="min-width:30px;color:${f.impact.startsWith('+') ? 'var(--up)' : 'var(--dn)'};font-weight:700;font-family:monospace">${f.impact}</span>
                <span style="color:var(--t2)">${f.detail}</span>
              </div>`
            ).join('')}
          </div>
        </div>
      </div>
    </div>`;

    // ══ SECTION 2: GEX REGIME ══
    html += `<div class="edge-section">
      <div class="edge-section-title" style="color:var(--cy)">📊 Gamma Exposure (GEX) — تحوط صناع السوق</div>
      <div class="regime-indicator regime-${d.gex.regime}">
        ${d.gex.regime === 'positive' ? '🟢 GEX إيجابي — وضع تثبيت (Pin Mode)' : '🔴 GEX سلبي — وضع تضخيم (Amplification Mode)'}
      </div>
      <div style="font-size:9px;color:var(--t2);padding:4px 0;line-height:1.6">${d.gex.implication}</div>
      <div class="edge-grid" style="grid-template-columns:1fr 1fr 1fr;margin-top:6px">
        <div class="edge-cell"><div class="el">Net GEX</div><div class="ev" style="color:${gexCol}">${d.gex.netGEX > 0 ? '+' : ''}${d.gex.netGEX.toFixed(3)}B</div></div>
        <div class="edge-cell"><div class="el">GEX Flip</div><div class="ev" style="color:var(--pu)">$${d.gex.flipLevel}</div><div class="ed">${d.spot > d.gex.flipLevel ? 'فوق ✅' : 'تحت ⚠️'}</div></div>
        <div class="edge-cell"><div class="el">Dealer Delta</div><div class="ev" style="color:${d.dealer.direction === 'bullish_hedge' ? 'var(--up)' : 'var(--dn)'}">${(d.dealer.netDelta/1000).toFixed(0)}K</div><div class="ed">${d.dealer.direction === 'bullish_hedge' ? 'ضغط شراء' : 'ضغط بيع'}</div></div>
      </div>`;

    // GEX by strike bars
    if (d.gex.topStrikes.length > 0) {
      const maxGex = Math.max(...d.gex.topStrikes.map(s => Math.abs(s.netGEX)));
      html += `<div style="margin-top:8px">`;
      for (const s of d.gex.topStrikes) {
        const pct = Math.abs(s.netGEX) / maxGex * 100;
        const col = s.netGEX > 0 ? 'var(--up)' : 'var(--dn)';
        const isATM = Math.abs(s.strike - d.spot) / d.spot < 0.01;
        html += `<div class="gex-bar">
          <span class="gb-strike" ${isATM ? 'style="color:var(--bl);font-weight:900"' : ''}>$${s.strike}${isATM ? ' ◄' : ''}</span>
          <div class="gb-track"><div class="gb-fill" style="width:${pct}%;background:${col}"></div></div>
          <span class="gb-val" style="color:${col}">${s.netGEX > 0 ? '+' : ''}${s.netGEX.toFixed(3)}</span>
        </div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    // ══ SECTION 3: MAX PAIN + KEY LEVELS VISUAL ══
    html += `<div class="edge-section">
      <div class="edge-section-title" style="color:var(--gd)">🎯 Max Pain + مستويات مؤسسية</div>`;

    // Visual bar
    const allLevels = [
      { price: d.spot, label: `السعر $${d.spot.toFixed(0)}`, cls: 'price-m' },
      { price: d.maxPain.strike, label: `Max Pain $${d.maxPain.strike}`, cls: 'pain-m' },
      { price: d.gex.flipLevel, label: `GEX Flip $${d.gex.flipLevel}`, cls: 'flip-m' },
    ];
    const minP = Math.min(...allLevels.map(l => l.price)) * 0.98;
    const maxP = Math.max(...allLevels.map(l => l.price)) * 1.02;
    const range = maxP - minP;

    html += `<div class="maxpain-visual">`;
    for (const lv of allLevels) {
      const pos = ((lv.price - minP) / range * 100);
      html += `<div class="maxpain-marker ${lv.cls}" style="right:${pos}%">${lv.label}</div>`;
    }
    html += `</div>`;

    html += `<div class="edge-grid" style="grid-template-columns:1fr 1fr;margin-top:8px">
      <div class="edge-cell"><div class="el">Max Pain</div><div class="ev" style="color:var(--gd)">$${d.maxPain.strike}</div><div class="ed">المسافة: ${d.maxPain.distancePct > 0 ? '+' : ''}${d.maxPain.distancePct}%</div></div>
      <div class="edge-cell"><div class="el">IV Skew</div><div class="ev" style="color:${Math.abs(d.skew.ivSkew) > 10 ? 'var(--or)' : 'var(--t2)'}">${d.skew.ivSkew > 0 ? '+' : ''}${d.skew.ivSkew}%</div><div class="ed">${d.skew.signal}</div></div>
    </div>`;

    // Support/Resistance levels
    html += `<div style="margin-top:8px">`;
    for (const r of d.keyLevels.resistance) {
      const pct = Math.min(100, r.oi / 50);
      html += `<div class="edge-level">
        <span style="color:var(--dn);font-weight:700;font-family:monospace;min-width:55px">$${r.strike}</span>
        <span style="font-size:7px;color:var(--t3);min-width:40px">مقاومة</span>
        <div class="edge-level-bar"><div class="edge-level-fill" style="width:${pct}%;background:var(--dn)"></div></div>
        <span style="font-size:8px;color:var(--t2);font-family:monospace;min-width:50px">${(r.oi/1000).toFixed(1)}K OI</span>
      </div>`;
    }
    for (const s of d.keyLevels.support) {
      const pct = Math.min(100, s.oi / 50);
      html += `<div class="edge-level">
        <span style="color:var(--up);font-weight:700;font-family:monospace;min-width:55px">$${s.strike}</span>
        <span style="font-size:7px;color:var(--t3);min-width:40px">دعم</span>
        <div class="edge-level-bar"><div class="edge-level-fill" style="width:${pct}%;background:var(--up)"></div></div>
        <span style="font-size:8px;color:var(--t2);font-family:monospace;min-width:50px">${(s.oi/1000).toFixed(1)}K OI</span>
      </div>`;
    }
    html += `</div></div>`;

    // ══ SECTION 4: SWEEP DETECTION ══
    if (d.flow.sweeps.length > 0) {
      const bullPremium = d.flow.totalBullPremium;
      const bearPremium = d.flow.totalBearPremium;
      html += `<div class="edge-section">
        <div class="edge-section-title" style="color:var(--pm)">⚡ Sweep Detection — أوامر عاجلة مؤسسية</div>
        <div class="edge-grid" style="grid-template-columns:1fr 1fr;margin-bottom:6px">
          <div class="edge-cell"><div class="el">Premium صعودي</div><div class="ev" style="color:var(--up)">$${(bullPremium/1000).toFixed(0)}K</div></div>
          <div class="edge-cell"><div class="el">Premium هبوطي</div><div class="ev" style="color:var(--dn)">$${(bearPremium/1000).toFixed(0)}K</div></div>
        </div>`;

      for (const sw of d.flow.sweeps.slice(0, 6)) {
        const isCall = sw.type === 'CALL';
        html += `<div class="sweep-row" onclick="window.selStock&&selStock('${d.symbol}')">
          <span class="sweep-badge ${isCall ? 'sweep-call' : 'sweep-put'}">${isCall ? '▲ CALL' : '▼ PUT'}</span>
          <span style="font-weight:700;font-family:monospace;color:var(--bl);min-width:45px">$${sw.strike}</span>
          <span style="font-family:monospace;min-width:50px">${sw.dte}d</span>
          <span style="font-family:monospace;color:var(--cy);min-width:55px">${(sw.volume/1000).toFixed(1)}K vol</span>
          <span style="font-family:monospace;color:var(--gd);min-width:60px">$${(sw.premium/1000).toFixed(0)}K</span>
          <span class="sweep-badge ${sw.isSweep ? 'sweep-urgent' : ''}">${sw.urgency}</span>
          <span style="margin-right:auto;font-weight:700;color:${isCall ? 'var(--up)' : 'var(--dn)'};font-family:monospace">${sw.score}</span>
        </div>`;
      }
      html += `</div>`;
    }

    // ══ SECTION 5: UNUSUAL FLOW ══
    if (d.flow.unusual.length > 0) {
      html += `<div class="edge-section">
        <div class="edge-section-title" style="color:var(--or)">🔥 نشاط غير عادي</div>`;
      for (const uf of d.flow.unusual.slice(0, 5)) {
        const isCall = uf.type === 'CALL';
        html += `<div class="sweep-row">
          <span class="sweep-badge ${isCall ? 'sweep-call' : 'sweep-put'}">${isCall ? 'C' : 'P'}</span>
          <span style="font-weight:700;font-family:monospace;min-width:45px">$${uf.strike}</span>
          <span style="font-family:monospace;min-width:40px">${uf.dte}d</span>
          <span style="font-size:8px;color:var(--t2)">V/OI: <span style="color:${uf.volOI > 3 ? 'var(--or)' : 'var(--t2)'};font-weight:700">${uf.volOI}x</span></span>
          <span style="font-family:monospace;color:var(--gd)">${(uf.volume).toLocaleString()}</span>
          <span style="margin-right:auto;font-weight:700;color:var(--or);font-family:monospace">${uf.score}</span>
        </div>`;
      }
      html += `</div>`;
    }

    // ══ SECTION 6: SMART ENTRY ZONES ══
    html += `<div class="edge-section">
      <div class="edge-section-title" style="color:var(--bl)">🎯 مناطق الدخول الذكية</div>`;
    for (const zone of d.entryZones) {
      const zCol = zone.type.includes('support') ? 'var(--up)' : zone.type.includes('resistance') ? 'var(--dn)' : zone.type === 'gex_flip' ? 'var(--pu)' : 'var(--gd)';
      html += `<div style="padding:6px 8px;margin:3px 0;background:var(--c2);border-radius:5px;border-right:3px solid ${zCol}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:14px;font-weight:900;color:${zCol};font-family:monospace">$${zone.level}</span>
          <span style="font-size:8px;padding:1px 6px;border-radius:2px;background:${zCol};color:#000;font-weight:700">${zone.strength}/100</span>
        </div>
        <div style="font-size:9px;color:var(--t1);margin:3px 0;font-weight:600">${zone.action}</div>
        <div style="font-size:8px;color:var(--t2);line-height:1.5">${zone.reason}</div>
      </div>`;
    }
    html += `</div>`;

    // ══ SECTION 7: P/C VOLUME STATS ══
    const totalVol = d.volume.totalCallVol + d.volume.totalPutVol;
    const callPct = totalVol > 0 ? d.volume.totalCallVol / totalVol * 100 : 50;
    html += `<div class="edge-section">
      <div class="edge-section-title" style="color:var(--t2)">📊 إحصائيات التدفق</div>
      <div style="display:flex;height:16px;border-radius:8px;overflow:hidden;margin:6px 0">
        <div style="width:${callPct}%;background:var(--up);display:flex;align-items:center;justify-content:center;font-size:8px;color:#000;font-weight:700">${callPct.toFixed(0)}% Call</div>
        <div style="width:${100-callPct}%;background:var(--dn);display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:700">${(100-callPct).toFixed(0)}% Put</div>
      </div>
      <div class="edge-grid" style="grid-template-columns:1fr 1fr 1fr 1fr">
        <div class="edge-cell"><div class="el">Call Vol</div><div class="ev" style="color:var(--up);font-size:10px">${(d.volume.totalCallVol/1000).toFixed(0)}K</div></div>
        <div class="edge-cell"><div class="el">Put Vol</div><div class="ev" style="color:var(--dn);font-size:10px">${(d.volume.totalPutVol/1000).toFixed(0)}K</div></div>
        <div class="edge-cell"><div class="el">Call OI</div><div class="ev" style="color:var(--up);font-size:10px">${(d.volume.totalCallOI/1000).toFixed(0)}K</div></div>
        <div class="edge-cell"><div class="el">Put OI</div><div class="ev" style="color:var(--dn);font-size:10px">${(d.volume.totalPutOI/1000).toFixed(0)}K</div></div>
      </div>
      <div style="text-align:center;margin-top:6px;font-size:8px;color:var(--t3)">P/C Vol: ${d.skew.pcVolumeRatio.toFixed(2)} | P/C OI: ${d.skew.pcOIRatio.toFixed(2)}</div>
    </div>`;

    // Disclosure
    html += `<div style="padding:6px 10px;font-size:7px;color:var(--t3);text-align:center;line-height:1.5">
      ⚠️ التحليل المؤسسي مبني على بيانات Options Chain — البيانات الحقيقية قد تختلف.<br>
      GEX محسوب من Black-Scholes. ليست نصيحة مالية.
    </div>`;

    content.innerHTML = html;
  }

  // ═══ AUTO-SCAN ON STOCK CHANGE ═══
  let _origSelStock = window.selStock;
  if (typeof _origSelStock === 'function') {
    window.selStock = function(sym) {
      _origSelStock(sym);
      // Auto-refresh edge if panel is open
      if (_edgePanelOpen && sym !== _lastEdgeSym) {
        setTimeout(() => {
          if (window.G?.pr?.[sym]) window._runEdgeScan();
        }, 500);
      }
    };
  }

  // ═══ INIT ═══
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(injectPanel, 500));
  } else {
    setTimeout(injectPanel, 500);
  }

})();
