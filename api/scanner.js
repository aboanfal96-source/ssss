// ═══════════════════════════════════════════════════════════════
// ADVANCED INSTITUTIONAL SCANNER — V2
// GEX (Gamma Exposure), Max Pain, Sweep Detection, Dark Pool Levels,
// Put/Call Skew, Dealer Positioning, Net Delta Exposure
// ═══════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const {
    symbol,
    underlyingPrice = 0,
    historicalVol = 0.30,
    technicalScore = 50,
    sniperScore = 0,
    sniperDir = 'محايد',
  } = req.body || {};

  if (!symbol) return res.status(400).json({ error: 'No symbol' });
  const sym = symbol.toUpperCase();
  const spot = underlyingPrice;
  if (!spot) return res.status(400).json({ error: 'No underlyingPrice' });

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Accept': 'application/json,*/*',
    'Origin': 'https://finance.yahoo.com',
    'Referer': `https://finance.yahoo.com/quote/${sym}/options`,
  };

  // ═══ FETCH ALL EXPIRATION CHAINS ═══
  let allChains = [];
  let expirations = [];
  let dataSource = 'yahoo';

  for (const host of ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']) {
    try {
      const r = await fetch(`${host}/v7/finance/options/${sym}`, { headers });
      if (!r.ok) continue;
      const d = await r.json();
      const result = d?.optionChain?.result?.[0];
      if (!result) continue;
      expirations = (result.expirationDates || []).slice(0, 6); // Next 6 expirations
      if (result.options?.[0]) allChains.push(result.options[0]);

      // Fetch additional expirations for GEX
      const fetches = expirations.slice(1, 4).map(async (exp) => {
        try {
          const r2 = await fetch(`${host}/v7/finance/options/${sym}?date=${exp}`, { headers });
          if (r2.ok) {
            const d2 = await r2.json();
            const opt = d2?.optionChain?.result?.[0]?.options?.[0];
            if (opt) allChains.push(opt);
          }
        } catch (e) {}
      });
      await Promise.all(fetches);
      break;
    } catch (e) { continue; }
  }

  // ═══ SYNTHETIC FALLBACK ═══
  if (allChains.length === 0) {
    dataSource = 'synthetic';
    allChains = generateSyntheticChains(sym, spot, historicalVol);
  }

  const now = Date.now();

  // ═══════════════════════════════════════
  // 1. GAMMA EXPOSURE (GEX) ANALYSIS
  // ═══════════════════════════════════════
  const gexByStrike = {};
  const N = (x) => {
    const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
    const sign=x<0?-1:1; x=Math.abs(x)/Math.sqrt(2);
    const t=1/(1+p*x); const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
    return 0.5*(1+sign*y);
  };

  let totalCallGEX = 0, totalPutGEX = 0;
  let totalCallOI = 0, totalPutOI = 0;
  let totalCallVol = 0, totalPutVol = 0;

  for (const chain of allChains) {
    const expDate = chain.expirationDate * 1000;
    const T = Math.max(1, (expDate - now) / 86400000) / 365;
    const sqrtT = Math.sqrt(T);

    for (const c of (chain.calls || [])) {
      const K = c.strike;
      const iv = c.impliedVolatility || historicalVol;
      const oi = c.openInterest || 0;
      const vol = c.volume || 0;
      totalCallOI += oi;
      totalCallVol += vol;

      // Gamma = N'(d1) / (S * σ * √T)
      const d1 = (Math.log(spot / K) + (0.05 + iv * iv / 2) * T) / (iv * sqrtT);
      const gamma = Math.exp(-d1 * d1 / 2) / (Math.sqrt(2 * Math.PI)) / (spot * iv * sqrtT);

      // GEX = Gamma × OI × 100 × Spot²  (calls are positive for dealers)
      const gex = gamma * oi * 100 * spot * spot / 1e9; // Billions
      if (!gexByStrike[K]) gexByStrike[K] = { strike: K, callGEX: 0, putGEX: 0, callOI: 0, putOI: 0, callVol: 0, putVol: 0, callIV: 0, putIV: 0 };
      gexByStrike[K].callGEX += gex;
      gexByStrike[K].callOI += oi;
      gexByStrike[K].callVol += vol;
      gexByStrike[K].callIV = iv;
      totalCallGEX += gex;
    }

    for (const p of (chain.puts || [])) {
      const K = p.strike;
      const iv = p.impliedVolatility || historicalVol;
      const oi = p.openInterest || 0;
      const vol = p.volume || 0;
      totalPutOI += oi;
      totalPutVol += vol;

      const d1 = (Math.log(spot / K) + (0.05 + iv * iv / 2) * T) / (iv * sqrtT);
      const gamma = Math.exp(-d1 * d1 / 2) / (Math.sqrt(2 * Math.PI)) / (spot * iv * sqrtT);

      // Puts are NEGATIVE GEX for dealers (they sell puts → short gamma)
      const gex = -gamma * oi * 100 * spot * spot / 1e9;
      if (!gexByStrike[K]) gexByStrike[K] = { strike: K, callGEX: 0, putGEX: 0, callOI: 0, putOI: 0, callVol: 0, putVol: 0, callIV: 0, putIV: 0 };
      gexByStrike[K].putGEX += gex;
      gexByStrike[K].putOI += oi;
      gexByStrike[K].putVol += vol;
      gexByStrike[K].putIV = iv;
      totalPutGEX += gex;
    }
  }

  // Net GEX per strike
  const gexStrikes = Object.values(gexByStrike)
    .map(g => ({ ...g, netGEX: g.callGEX + g.putGEX, totalOI: g.callOI + g.putOI }))
    .filter(g => Math.abs(g.strike - spot) / spot < 0.15) // Within 15%
    .sort((a, b) => Math.abs(b.netGEX) - Math.abs(a.netGEX));

  // GEX Flip Level — where net GEX crosses zero
  const sortedByStrike = [...gexStrikes].sort((a, b) => a.strike - b.strike);
  let gexFlipLevel = spot;
  for (let i = 1; i < sortedByStrike.length; i++) {
    const prev = sortedByStrike[i - 1], curr = sortedByStrike[i];
    if ((prev.netGEX > 0 && curr.netGEX < 0) || (prev.netGEX < 0 && curr.netGEX > 0)) {
      // Linear interpolation
      const ratio = Math.abs(prev.netGEX) / (Math.abs(prev.netGEX) + Math.abs(curr.netGEX));
      gexFlipLevel = prev.strike + ratio * (curr.strike - prev.strike);
      break;
    }
  }

  // Positive GEX = dealers hedge BY SELLING dips & BUYING rips → pins price (low vol)
  // Negative GEX = dealers hedge BY BUYING dips & SELLING rips → amplifies moves (high vol)
  const netGEX = totalCallGEX + totalPutGEX;
  const gexRegime = netGEX > 0 ? 'positive' : 'negative';
  const gexImplication = netGEX > 0
    ? 'السوق في وضع تثبيت — صناع السوق يمتصون التقلبات (يبيعون القمم ويشترون القيعان). توقع حركة محدودة.'
    : 'السوق في وضع تضخيم — صناع السوق يزيدون التقلبات (يشترون القمم ويبيعون القيعان). توقع حركة عنيفة!';

  // ═══════════════════════════════════════
  // 2. MAX PAIN CALCULATION
  // ═══════════════════════════════════════
  const allStrikes = [...new Set(gexStrikes.map(g => g.strike))].sort((a, b) => a - b);
  let maxPainStrike = spot, minPain = Infinity;

  for (const testPrice of allStrikes) {
    let totalPain = 0;
    for (const g of gexStrikes) {
      // Call pain: max(0, testPrice - strike) * callOI
      totalPain += Math.max(0, testPrice - g.strike) * g.callOI;
      // Put pain: max(0, strike - testPrice) * putOI
      totalPain += Math.max(0, g.strike - testPrice) * g.putOI;
    }
    if (totalPain < minPain) {
      minPain = totalPain;
      maxPainStrike = testPrice;
    }
  }

  const maxPainDist = ((maxPainStrike - spot) / spot * 100);

  // ═══════════════════════════════════════
  // 3. PUT/CALL SKEW ANALYSIS
  // ═══════════════════════════════════════
  const pcRatio = totalPutVol > 0 ? totalCallVol / totalPutVol : 1;
  const pcOIRatio = totalPutOI > 0 ? totalCallOI / totalPutOI : 1;

  // IV Skew: compare ATM put IV vs ATM call IV
  const atmStrikes = gexStrikes
    .filter(g => Math.abs(g.strike - spot) / spot < 0.03)
    .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot));

  let ivSkew = 0, ivSkewSignal = 'محايد';
  if (atmStrikes.length > 0) {
    const atm = atmStrikes[0];
    if (atm.putIV > 0 && atm.callIV > 0) {
      ivSkew = ((atm.putIV - atm.callIV) / atm.callIV * 100);
      ivSkewSignal = ivSkew > 15 ? 'خوف شديد — puts مكلفة جداً (تحوط مؤسسي)' :
                     ivSkew > 5 ? 'حذر — طلب على الحماية' :
                     ivSkew < -5 ? 'طمع — calls مكلفة (مضاربة صعودية)' :
                     'متوازن';
    }
  }

  // ═══════════════════════════════════════
  // 4. UNUSUAL ACTIVITY / SWEEP DETECTION
  // ═══════════════════════════════════════
  const sweeps = [];
  const unusualFlows = [];

  for (const chain of allChains) {
    const expDate = chain.expirationDate * 1000;
    const dte = Math.round((expDate - now) / 86400000);

    for (const c of (chain.calls || [])) {
      const volOI = c.openInterest > 0 ? c.volume / c.openInterest : 0;
      const premium = (c.lastPrice || 0) * c.volume * 100;
      const isUnusual = volOI > 3 || (c.volume > 1000 && volOI > 1.5);
      const isSweep = c.volume > 2000 && volOI > 2 && premium > 100000;
      const isBlock = premium > 500000;

      if (isUnusual || isSweep || isBlock) {
        const entry = {
          type: 'CALL', strike: c.strike, expiry: expDate, dte,
          volume: c.volume, oi: c.openInterest, volOI: +volOI.toFixed(2),
          premium: Math.round(premium), iv: +(c.impliedVolatility || 0).toFixed(3),
          price: c.lastPrice || 0, bid: c.bid || 0, ask: c.ask || 0,
          isSweep, isBlock,
          sentiment: 'صعودي',
          urgency: isSweep ? 'عاجل ⚡' : isBlock ? 'مؤسسي 🏦' : 'غير عادي 🔥',
          score: Math.min(100, Math.round(
            (volOI > 5 ? 30 : volOI > 3 ? 20 : 10) +
            (premium > 1000000 ? 30 : premium > 500000 ? 25 : premium > 100000 ? 15 : 5) +
            (c.volume > 5000 ? 20 : c.volume > 2000 ? 15 : 5) +
            (dte <= 7 ? 15 : dte <= 14 ? 10 : 5) +
            (isSweep ? 10 : 0)
          )),
        };
        if (isSweep || isBlock) sweeps.push(entry);
        else unusualFlows.push(entry);
      }
    }

    for (const p of (chain.puts || [])) {
      const volOI = p.openInterest > 0 ? p.volume / p.openInterest : 0;
      const premium = (p.lastPrice || 0) * p.volume * 100;
      const isUnusual = volOI > 3 || (p.volume > 1000 && volOI > 1.5);
      const isSweep = p.volume > 2000 && volOI > 2 && premium > 100000;
      const isBlock = premium > 500000;

      if (isUnusual || isSweep || isBlock) {
        const entry = {
          type: 'PUT', strike: p.strike, expiry: expDate, dte,
          volume: p.volume, oi: p.openInterest, volOI: +volOI.toFixed(2),
          premium: Math.round(premium), iv: +(p.impliedVolatility || 0).toFixed(3),
          price: p.lastPrice || 0, bid: p.bid || 0, ask: p.ask || 0,
          isSweep, isBlock,
          sentiment: 'هبوطي',
          urgency: isSweep ? 'عاجل ⚡' : isBlock ? 'مؤسسي 🏦' : 'غير عادي 🔥',
          score: Math.min(100, Math.round(
            (volOI > 5 ? 30 : volOI > 3 ? 20 : 10) +
            (premium > 1000000 ? 30 : premium > 500000 ? 25 : premium > 100000 ? 15 : 5) +
            (p.volume > 5000 ? 20 : p.volume > 2000 ? 15 : 5) +
            (dte <= 7 ? 15 : dte <= 14 ? 10 : 5) +
            (isSweep ? 10 : 0)
          )),
        };
        if (isSweep || isBlock) sweeps.push(entry);
        else unusualFlows.push(entry);
      }
    }
  }

  sweeps.sort((a, b) => b.score - a.score);
  unusualFlows.sort((a, b) => b.score - a.score);

  // ═══════════════════════════════════════
  // 5. DEALER POSITIONING & NET DELTA
  // ═══════════════════════════════════════
  let dealerNetDelta = 0;
  for (const chain of allChains) {
    const expDate = chain.expirationDate * 1000;
    const T = Math.max(1, (expDate - now) / 86400000) / 365;

    for (const c of (chain.calls || [])) {
      const iv = c.impliedVolatility || historicalVol;
      const d1 = (Math.log(spot / c.strike) + (0.05 + iv * iv / 2) * T) / (iv * Math.sqrt(T));
      const delta = N(d1);
      // Dealers are short calls → negative delta
      dealerNetDelta -= delta * (c.openInterest || 0) * 100;
    }
    for (const p of (chain.puts || [])) {
      const iv = p.impliedVolatility || historicalVol;
      const d1 = (Math.log(spot / p.strike) + (0.05 + iv * iv / 2) * T) / (iv * Math.sqrt(T));
      const delta = N(d1) - 1;
      // Dealers are short puts → positive delta (negative of put delta)
      dealerNetDelta -= delta * (p.openInterest || 0) * 100;
    }
  }

  const dealerBias = dealerNetDelta > 0 ? 'صناع السوق يملكون delta إيجابي — يحتاجون يبيعون السهم للتحوط (ضغط هبوطي)' :
                     'صناع السوق يملكون delta سلبي — يحتاجون يشترون السهم للتحوط (ضغط صعودي)';

  // ═══════════════════════════════════════
  // 6. KEY LEVELS (Support/Resistance from options)
  // ═══════════════════════════════════════
  const topGEX = gexStrikes.slice(0, 10);
  const callWalls = topGEX.filter(g => g.callOI > g.putOI).sort((a, b) => b.callOI - a.callOI).slice(0, 3);
  const putWalls = topGEX.filter(g => g.putOI > g.callOI).sort((a, b) => b.putOI - a.putOI).slice(0, 3);

  const keyLevels = {
    resistance: callWalls.map(w => ({ strike: w.strike, oi: w.callOI, gex: +w.callGEX.toFixed(4), type: 'call_wall' })),
    support: putWalls.map(w => ({ strike: w.strike, oi: w.putOI, gex: +Math.abs(w.putGEX).toFixed(4), type: 'put_wall' })),
    maxPain: maxPainStrike,
    gexFlip: +gexFlipLevel.toFixed(2),
  };

  // ═══════════════════════════════════════
  // 7. COMPOSITE EDGE SCORE
  // ═══════════════════════════════════════
  let edgeDirection = 'محايد';
  let edgeScore = 50;
  let edgeFactors = [];

  // Factor 1: GEX Regime
  if (gexRegime === 'negative') {
    edgeScore += 10; // More opportunity in negative GEX
    edgeFactors.push({ name: 'GEX سلبي', impact: '+10', detail: 'تقلبات عالية متوقعة — فرصة للأوبشنز' });
  }

  // Factor 2: Sweep alignment with technical
  const bullSweeps = sweeps.filter(s => s.type === 'CALL').length;
  const bearSweeps = sweeps.filter(s => s.type === 'PUT').length;
  if (bullSweeps > bearSweeps + 1) {
    edgeScore += 15;
    edgeDirection = 'صعودي';
    edgeFactors.push({ name: 'Sweeps صعودية', impact: '+15', detail: `${bullSweeps} sweep شراء مقابل ${bearSweeps} بيع` });
  } else if (bearSweeps > bullSweeps + 1) {
    edgeScore += 15;
    edgeDirection = 'هبوطي';
    edgeFactors.push({ name: 'Sweeps هبوطية', impact: '+15', detail: `${bearSweeps} sweep بيع مقابل ${bullSweeps} شراء` });
  }

  // Factor 3: Max Pain magnet
  if (Math.abs(maxPainDist) > 2) {
    edgeScore += 8;
    const pullDir = maxPainDist > 0 ? 'صعودي' : 'هبوطي';
    if (edgeDirection === 'محايد') edgeDirection = pullDir;
    edgeFactors.push({ name: 'Max Pain Magnet', impact: '+8', detail: `السعر يبعد ${maxPainDist.toFixed(1)}% عن Max Pain ($${maxPainStrike}) — جاذبية ${pullDir === 'صعودي' ? 'لأعلى' : 'لأسفل'}` });
  }

  // Factor 4: Dealer hedging pressure
  if (Math.abs(dealerNetDelta) > 10000) {
    const dealerDir = dealerNetDelta > 0 ? 'هبوطي' : 'صعودي';
    edgeScore += 7;
    edgeFactors.push({ name: 'ضغط صناع السوق', impact: '+7', detail: dealerBias });
  }

  // Factor 5: IV Skew
  if (Math.abs(ivSkew) > 10) {
    edgeScore += 5;
    edgeFactors.push({ name: 'IV Skew', impact: '+5', detail: ivSkewSignal });
  }

  // Factor 6: Sniper alignment
  if (sniperScore >= 60) {
    const sniperAligned = (edgeDirection === 'صعودي' && sniperDir === 'شراء') ||
                          (edgeDirection === 'هبوطي' && sniperDir === 'بيع');
    if (sniperAligned) {
      edgeScore += 12;
      edgeFactors.push({ name: 'Sniper متوافق', impact: '+12', detail: `Sniper ${sniperDir} (${sniperScore}) متوافق مع التدفق المؤسسي` });
    } else if (edgeDirection !== 'محايد' && sniperDir !== 'محايد') {
      edgeScore -= 8;
      edgeFactors.push({ name: 'Sniper متعارض ⚠️', impact: '-8', detail: `تحذير: Sniper ${sniperDir} يتعارض مع التدفق المؤسسي ${edgeDirection}` });
    }
  }

  // Factor 7: Technical score
  if (technicalScore >= 70) {
    edgeScore += 8;
    edgeFactors.push({ name: 'تحليل فني قوي', impact: '+8', detail: `Technical Score: ${technicalScore}/100` });
  }

  edgeScore = Math.max(0, Math.min(100, edgeScore));

  // ═══════════════════════════════════════
  // 8. SMART ENTRY ZONES
  // ═══════════════════════════════════════
  const entryZones = [];

  // Zone 1: GEX support/resistance
  if (keyLevels.support.length > 0) {
    entryZones.push({
      type: 'gex_support',
      level: keyLevels.support[0].strike,
      strength: Math.min(100, Math.round(keyLevels.support[0].oi / 100)),
      action: 'شراء Call عند الارتداد من هذا المستوى',
      reason: `جدار Put Wall (${keyLevels.support[0].oi.toLocaleString()} OI) — صناع السوق يحمون هذا المستوى`,
    });
  }
  if (keyLevels.resistance.length > 0) {
    entryZones.push({
      type: 'gex_resistance',
      level: keyLevels.resistance[0].strike,
      strength: Math.min(100, Math.round(keyLevels.resistance[0].oi / 100)),
      action: 'شراء Put عند الرفض من هذا المستوى',
      reason: `جدار Call Wall (${keyLevels.resistance[0].oi.toLocaleString()} OI) — مقاومة مؤسسية`,
    });
  }

  // Zone 2: Max Pain convergence
  entryZones.push({
    type: 'max_pain',
    level: maxPainStrike,
    strength: Math.round(Math.min(100, Math.abs(maxPainDist) * 10)),
    action: maxPainDist > 0 ? 'ميل صعودي — السعر تحت Max Pain' : 'ميل هبوطي — السعر فوق Max Pain',
    reason: `Max Pain عند $${maxPainStrike} — نقطة الجذب الأسبوعية`,
  });

  // Zone 3: GEX Flip
  if (Math.abs(gexFlipLevel - spot) / spot > 0.005) {
    entryZones.push({
      type: 'gex_flip',
      level: +gexFlipLevel.toFixed(2),
      strength: 80,
      action: spot > gexFlipLevel ? 'فوق GEX Flip — منطقة إيجابية (تثبيت)' : 'تحت GEX Flip — منطقة سلبية (تقلب)',
      reason: 'مستوى انقلاب تحوط صناع السوق — أهم مستوى يومي',
    });
  }

  // ═══ RESPONSE ═══
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=300');
  return res.status(200).json({
    symbol: sym,
    spot,
    dataSource,
    timestamp: now,

    // GEX Analysis
    gex: {
      regime: gexRegime,
      netGEX: +netGEX.toFixed(4),
      callGEX: +totalCallGEX.toFixed(4),
      putGEX: +totalPutGEX.toFixed(4),
      flipLevel: +gexFlipLevel.toFixed(2),
      implication: gexImplication,
      topStrikes: gexStrikes.slice(0, 8).map(g => ({
        strike: g.strike, netGEX: +g.netGEX.toFixed(4),
        callOI: g.callOI, putOI: g.putOI,
      })),
    },

    // Max Pain
    maxPain: {
      strike: maxPainStrike,
      distancePct: +maxPainDist.toFixed(2),
      pull: maxPainDist > 0 ? 'up' : maxPainDist < 0 ? 'down' : 'at',
    },

    // Skew
    skew: {
      pcVolumeRatio: +pcRatio.toFixed(2),
      pcOIRatio: +pcOIRatio.toFixed(2),
      ivSkew: +ivSkew.toFixed(1),
      signal: ivSkewSignal,
    },

    // Institutional Flow
    flow: {
      sweeps: sweeps.slice(0, 10),
      unusual: unusualFlows.slice(0, 10),
      totalBullPremium: sweeps.filter(s => s.type === 'CALL').reduce((sum, s) => sum + s.premium, 0),
      totalBearPremium: sweeps.filter(s => s.type === 'PUT').reduce((sum, s) => sum + s.premium, 0),
    },

    // Dealer Positioning
    dealer: {
      netDelta: Math.round(dealerNetDelta),
      bias: dealerBias,
      direction: dealerNetDelta > 0 ? 'bearish_hedge' : 'bullish_hedge',
    },

    // Key Levels
    keyLevels,

    // Composite Edge
    edge: {
      score: edgeScore,
      direction: edgeDirection,
      factors: edgeFactors,
    },

    // Smart Entry Zones
    entryZones,

    // Volume Stats
    volume: {
      totalCallVol, totalPutVol, totalCallOI, totalPutOI,
    },
  });
}

// ═══ Synthetic chain generator ═══
function generateSyntheticChains(sym, spot, iv) {
  const chains = [];
  for (const dte of [7, 14, 30]) {
    const T = dte / 365;
    const step = spot < 50 ? 1 : spot < 200 ? 2.5 : spot < 500 ? 5 : 10;
    const base = Math.round(spot / step) * step;
    const calls = [], puts = [];

    const N = (x) => {
      const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
      const sign=x<0?-1:1; x=Math.abs(x)/Math.sqrt(2);
      const t=1/(1+p*x); const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
      return 0.5*(1+sign*y);
    };

    for (let i = -10; i <= 10; i++) {
      const K = base + i * step;
      const d1 = (Math.log(spot / K) + (0.05 + iv * iv / 2) * T) / (iv * Math.sqrt(T));
      const d2 = d1 - iv * Math.sqrt(T);
      const cPrice = Math.max(0.01, spot * N(d1) - K * Math.exp(-0.05 * T) * N(d2));
      const pPrice = Math.max(0.01, K * Math.exp(-0.05 * T) * N(-d2) - spot * N(-d1));
      const oiFactor = Math.exp(-Math.abs(K - spot) / spot * 3);

      calls.push({
        strike: K, lastPrice: +cPrice.toFixed(2),
        bid: +(cPrice * 0.97).toFixed(2), ask: +(cPrice * 1.03).toFixed(2),
        impliedVolatility: iv, openInterest: Math.round(3000 * oiFactor),
        volume: Math.round(1200 * oiFactor),
      });
      puts.push({
        strike: K, lastPrice: +pPrice.toFixed(2),
        bid: +(pPrice * 0.97).toFixed(2), ask: +(pPrice * 1.03).toFixed(2),
        impliedVolatility: iv, openInterest: Math.round(2500 * oiFactor),
        volume: Math.round(900 * oiFactor),
      });
    }
    chains.push({ expirationDate: Math.floor((Date.now() + dte * 86400000) / 1000), calls, puts });
  }
  return chains;
}
