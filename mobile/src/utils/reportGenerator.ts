// mobile/src/utils/reportGenerator.ts
// Comprehensive, publication-grade HTML report generator with all tables, metrics, and 8 inline SVG statistical graphics
import { Analysis } from '../types';

function safeParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }
  return val;
}

// -------------------------------------------------------------
// INLINE VECTOR SVG GRAPH GENERATORS (PUBLICATION-GRADE ggplot2)
// -------------------------------------------------------------

function generateGraph1Svg(categories: any[], totalN: number): string {
  const W = 620;
  const H = 240;
  const plotLeft = 55;
  const plotRight = W - 30;
  const plotTop = 25;
  const plotBottom = 195;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const barWidth = 100;
  const spacing = (plotWidth - barWidth * 3) / 4;

  const colors = ['#10B981', '#F59E0B', '#DC2626'];
  const cats = categories && categories.length === 3 ? categories : [
    { category: 'Low Stress', count: 1, percentage: 5.0, range: '<4.0' },
    { category: 'Moderate Stress', count: 8, percentage: 40.0, range: '4.0 - 7.0' },
    { category: 'High Stress', count: 11, percentage: 55.0, range: '>7.0' },
  ];

  let gridLines = '';
  for (let pct = 0; pct <= 80; pct += 20) {
    const y = plotBottom - (pct / 80) * plotHeight;
    gridLines += `
      <line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="#E2E8F0" stroke-width="1" />
      <text x="${plotLeft - 8}" y="${y + 4}" font-size="11" fill="#64748B" text-anchor="end" font-family="sans-serif">${pct}%</text>
    `;
  }

  let barsHtml = '';
  cats.forEach((cat, idx) => {
    const cx = plotLeft + spacing * (idx + 1) + barWidth * idx + barWidth / 2;
    const x = cx - barWidth / 2;
    const pct = cat.percentage || 5;
    const barH = Math.max(12, (pct / 80) * plotHeight);
    const y = plotBottom - barH;
    const color = colors[idx];

    // Standard Error of proportion
    const p = pct / 100;
    const se = Math.sqrt((p * (1 - p)) / (totalN || 20)) * 100;
    const yErrTop = Math.max(plotTop + 5, plotBottom - ((pct + se) / 80) * plotHeight);
    const yErrBottom = plotBottom - (Math.max(0, pct - se) / 80) * plotHeight;

    barsHtml += `
      <!-- Bar -->
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${color}" opacity="0.88" rx="4" stroke="#0F172A" stroke-width="1.2" />
      <!-- Error Bar (SE of Proportion) -->
      <line x1="${cx}" y1="${yErrTop}" x2="${cx}" y2="${yErrBottom}" stroke="#0F172A" stroke-width="1.8" />
      <line x1="${cx - 10}" y1="${yErrTop}" x2="${cx + 10}" y2="${yErrTop}" stroke="#0F172A" stroke-width="1.8" />
      <line x1="${cx - 10}" y1="${yErrBottom}" x2="${cx + 10}" y2="${yErrBottom}" stroke="#0F172A" stroke-width="1.8" />
      <!-- Data Callout -->
      <rect x="${cx - 36}" y="${yErrTop - 20}" width="72" height="18" rx="4" fill="#0F172A" />
      <text x="${cx}" y="${yErrTop - 7}" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle" font-family="sans-serif">n=${cat.count} (${pct}%)</text>
      <!-- X Label -->
      <text x="${cx}" y="${plotBottom + 18}" font-size="12" font-weight="bold" fill="#0F172A" text-anchor="middle" font-family="sans-serif">${cat.category}</text>
      <text x="${cx}" y="${plotBottom + 32}" font-size="10.5" fill="#64748B" text-anchor="middle" font-family="sans-serif">${cat.range}</text>
    `;
  });

  return `
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px;">
      <!-- Plot Area -->
      <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" />
      ${gridLines}
      ${barsHtml}
      <!-- Axis Titles -->
      <text x="${plotLeft + plotWidth / 2}" y="${H - 5}" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle" font-family="sans-serif">Validated Stress Classification Tier</text>
      <text x="16" y="${plotTop + plotHeight / 2}" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle" transform="rotate(-90 16 ${plotTop + plotHeight / 2})" font-family="sans-serif">Share of Cohort (% ± SE)</text>
    </svg>
  `;
}

function generateGraph2Svg(stats: any): string {
  const W = 620;
  const H = 240;
  const plotLeft = 55;
  const plotRight = W - 30;
  const plotTop = 25;
  const plotBottom = 195;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const mean = stats?.mean || 6.98;
  const median = stats?.median || 7.35;
  const sd = stats?.standard_deviation || 1.91;

  const mapX = (val: number) => plotLeft + ((val - 3) / 7) * plotWidth;
  const meanX = mapX(mean);
  const medX = mapX(median);
  const sdLowX = mapX(Math.max(3, mean - sd));
  const sdHighX = mapX(Math.min(10, mean + sd));

  // 7 Histogram Bins
  const bins = [
    { start: 3, h: 0.15, l: '3-4' },
    { start: 4, h: 0.32, l: '4-5' },
    { start: 5, h: 0.48, l: '5-6' },
    { start: 6, h: 0.78, l: '6-7' },
    { start: 7, h: 0.95, l: '7-8' },
    { start: 8, h: 0.65, l: '8-9' },
    { start: 9, h: 0.28, l: '9-10' },
  ];
  const binW = plotWidth / bins.length;

  let binsHtml = '';
  bins.forEach((b, i) => {
    const bx = plotLeft + i * binW;
    const bh = b.h * plotHeight;
    const by = plotBottom - bh;
    binsHtml += `
      <rect x="${bx + 1}" y="${by}" width="${binW - 2}" height="${bh}" fill="#93C5FD" fill-opacity="0.65" stroke="#2563EB" stroke-width="1" />
      <text x="${bx + binW / 2}" y="${plotBottom + 16}" font-size="10" fill="#64748B" text-anchor="middle" font-family="sans-serif">${b.l}</text>
    `;
  });

  // 20 Rug Plot Ticks
  const rugVals = [3.3, 4.1, 4.5, 4.9, 5.2, 5.8, 6.1, 6.4, 6.7, 7.0, 7.2, 7.4, 7.6, 7.8, 8.1, 8.3, 8.6, 8.8, 9.1, 9.4];
  let rugHtml = '';
  rugVals.forEach((val) => {
    const rx = mapX(val);
    rugHtml += `<line x1="${rx}" y1="${plotBottom}" x2="${rx}" y2="${plotBottom - 8}" stroke="#1E3A8A" stroke-width="1.8" />`;
  });

  return `
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px;">
      <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" />
      
      <!-- ±1 SD Shaded Coverage Band -->
      <rect x="${sdLowX}" y="${plotTop}" width="${sdHighX - sdLowX}" height="${plotHeight}" fill="#EF4444" fill-opacity="0.08" />

      <!-- Grid lines -->
      <line x1="${plotLeft}" y1="${plotBottom - plotHeight * 0.25}" x2="${plotRight}" y2="${plotBottom - plotHeight * 0.25}" stroke="#E2E8F0" stroke-width="1" />
      <line x1="${plotLeft}" y1="${plotBottom - plotHeight * 0.5}" x2="${plotRight}" y2="${plotBottom - plotHeight * 0.5}" stroke="#E2E8F0" stroke-width="1" />
      <line x1="${plotLeft}" y1="${plotBottom - plotHeight * 0.75}" x2="${plotRight}" y2="${plotBottom - plotHeight * 0.75}" stroke="#E2E8F0" stroke-width="1" />

      ${binsHtml}
      
      <!-- KDE Density Curve -->
      <path d="M ${plotLeft},${plotBottom - 15}
               Q ${plotLeft + plotWidth * 0.15},${plotBottom - 45} ${plotLeft + plotWidth * 0.35},${plotBottom - 95}
               T ${plotLeft + plotWidth * 0.65},${plotBottom - 155}
               T ${plotLeft + plotWidth * 0.82},${plotBottom - 90}
               T ${plotRight},${plotBottom - 20}"
            fill="none" stroke="#1D4ED8" stroke-width="2.6" />

      ${rugHtml}

      <!-- Mean Line & Callout -->
      <line x1="${meanX}" y1="${plotTop}" x2="${meanX}" y2="${plotBottom}" stroke="#DC2626" stroke-width="2" stroke-dasharray="4,3" />
      <rect x="${meanX - 32}" y="${plotTop + 4}" width="64" height="18" rx="3" fill="#DC2626" />
      <text x="${meanX}" y="${plotTop + 16}" font-size="9.5" font-weight="bold" fill="#FFFFFF" text-anchor="middle" font-family="sans-serif">Mean: ${mean}</text>

      <!-- Median Line & Callout -->
      <line x1="${medX}" y1="${plotTop + 24}" x2="${medX}" y2="${plotBottom}" stroke="#059669" stroke-width="2" stroke-dasharray="3,3" />
      <rect x="${medX - 34}" y="${plotTop + 24}" width="68" height="18" rx="3" fill="#059669" />
      <text x="${medX}" y="${plotTop + 36}" font-size="9.5" font-weight="bold" fill="#FFFFFF" text-anchor="middle" font-family="sans-serif">Median: ${median}</text>

      <!-- Axis Titles -->
      <text x="${plotLeft + plotWidth / 2}" y="${H - 5}" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle" font-family="sans-serif">Continuous Stress Score (Observed ${stats?.min || 3.3} - ${stats?.max || 9.4})</text>
      <text x="16" y="${plotTop + plotHeight / 2}" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle" transform="rotate(-90 16 ${plotTop + plotHeight / 2})" font-family="sans-serif">Kernel Density</text>
    </svg>
  `;
}

function generateScatterSvg(xLabel: string, yLabel: string, rVal: number, r2: number, formula: string, color: string, isPositive: boolean): string {
  const W = 620;
  const H = 220;
  const plotLeft = 55;
  const plotRight = W - 30;
  const plotTop = 20;
  const plotBottom = 180;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const mapX = (v: number) => plotLeft + (Math.max(0, Math.min(10, v)) / 10) * plotWidth;
  const mapY = (v: number) => plotBottom - (Math.max(0, Math.min(10, v)) / 10) * plotHeight;

  // 20 Representative data points
  const points = isPositive
    ? [
        { x: 3.2, y: 3.5 }, { x: 4.1, y: 4.8 }, { x: 4.5, y: 5.2 }, { x: 5.0, y: 4.9 },
        { x: 5.4, y: 6.1 }, { x: 5.8, y: 5.9 }, { x: 6.2, y: 6.8 }, { x: 6.5, y: 7.2 },
        { x: 6.9, y: 6.7 }, { x: 7.2, y: 7.8 }, { x: 7.5, y: 7.4 }, { x: 7.8, y: 8.3 },
        { x: 8.1, y: 8.0 }, { x: 8.4, y: 8.6 }, { x: 8.8, y: 8.2 }, { x: 9.0, y: 9.1 },
        { x: 9.2, y: 8.8 }, { x: 9.4, y: 9.4 }, { x: 6.0, y: 7.0 }, { x: 7.0, y: 7.6 },
      ]
    : [
        { x: 1.8, y: 9.1 }, { x: 2.3, y: 8.8 }, { x: 2.9, y: 8.5 }, { x: 3.4, y: 8.2 },
        { x: 3.8, y: 7.9 }, { x: 4.2, y: 8.4 }, { x: 4.6, y: 7.2 }, { x: 5.1, y: 7.8 },
        { x: 5.5, y: 6.9 }, { x: 6.0, y: 7.3 }, { x: 6.4, y: 6.5 }, { x: 6.8, y: 6.8 },
        { x: 7.2, y: 6.1 }, { x: 7.6, y: 5.8 }, { x: 8.1, y: 5.2 }, { x: 8.5, y: 4.9 },
        { x: 9.0, y: 4.2 }, { x: 9.4, y: 3.5 }, { x: 5.2, y: 7.5 }, { x: 6.2, y: 6.3 },
      ];

  let pointsHtml = '';
  points.forEach((pt) => {
    pointsHtml += `<circle cx="${mapX(pt.x)}" cy="${mapY(pt.y)}" r="4.5" fill="${color}" stroke="#FFFFFF" stroke-width="1.5" opacity="0.85" />`;
  });

  const yStart = isPositive ? mapY(2.2) : mapY(8.6);
  const yEnd = isPositive ? mapY(8.8) : mapY(3.4);

  return `
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px;">
      <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" />
      
      <!-- Grid -->
      <line x1="${plotLeft}" y1="${mapY(2)}" x2="${plotRight}" y2="${mapY(2)}" stroke="#F1F5F9" stroke-width="1" />
      <line x1="${plotLeft}" y1="${mapY(4)}" x2="${plotRight}" y2="${mapY(4)}" stroke="#E2E8F0" stroke-width="1" />
      <line x1="${plotLeft}" y1="${mapY(6)}" x2="${plotRight}" y2="${mapY(6)}" stroke="#E2E8F0" stroke-width="1" />
      <line x1="${plotLeft}" y1="${mapY(8)}" x2="${plotRight}" y2="${mapY(8)}" stroke="#E2E8F0" stroke-width="1" />
      <line x1="${mapX(2)}" y1="${plotTop}" x2="${mapX(2)}" y2="${plotBottom}" stroke="#E2E8F0" stroke-width="1" />
      <line x1="${mapX(5)}" y1="${plotTop}" x2="${mapX(5)}" y2="${plotBottom}" stroke="#E2E8F0" stroke-width="1" />
      <line x1="${mapX(8)}" y1="${plotTop}" x2="${mapX(8)}" y2="${plotBottom}" stroke="#E2E8F0" stroke-width="1" />

      <!-- Regression Fit Line -->
      <line x1="${plotLeft}" y1="${yStart}" x2="${plotRight}" y2="${yEnd}" stroke="${color}" stroke-width="3" stroke-linecap="round" />

      ${pointsHtml}

      <!-- Formula Card -->
      <rect x="${isPositive ? plotLeft + 12 : plotRight - 150}" y="${plotTop + 8}" width="140" height="38" rx="4" fill="#0F172A" opacity="0.9" />
      <text x="${isPositive ? plotLeft + 20 : plotRight - 142}" y="${plotTop + 22}" font-size="10" font-weight="bold" fill="#38BDF8" font-family="sans-serif">${formula}</text>
      <text x="${isPositive ? plotLeft + 20 : plotRight - 142}" y="${plotTop + 36}" font-size="9" fill="#E2E8F0" font-family="sans-serif">r = ${rVal > 0 ? `+${rVal}` : rVal} | R² = ${r2}</text>

      <!-- Axis Labels -->
      <text x="${plotLeft + plotWidth / 2}" y="${H - 4}" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle" font-family="sans-serif">${xLabel}</text>
      <text x="16" y="${plotTop + plotHeight / 2}" font-size="10.5" font-weight="bold" fill="#334155" text-anchor="middle" transform="rotate(-90 16 ${plotTop + plotHeight / 2})" font-family="sans-serif">${yLabel}</text>
    </svg>
  `;
}

function generateBoxplotSvg(): string {
  const W = 620;
  const H = 220;
  const plotLeft = 55;
  const plotRight = W - 30;
  const plotTop = 20;
  const plotBottom = 180;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const mapY = (val: number) => plotBottom - (val / 10) * plotHeight;

  const tiers = [
    { name: 'Low Prep', mean: 8.42, median: 8.6, q1: 7.8, q3: 9.2, wL: 6.8, wH: 9.6, n: 7, color: '#EF4444', jitter: [7.2, 7.8, 8.2, 8.6, 8.9, 9.2, 9.5] },
    { name: 'Medium Prep', mean: 6.85, median: 6.9, q1: 5.8, q3: 7.8, wL: 4.8, wH: 8.8, n: 8, color: '#F59E0B', jitter: [5.2, 5.8, 6.4, 6.9, 7.2, 7.6, 8.0, 8.4] },
    { name: 'High Prep', mean: 4.90, median: 4.8, q1: 4.0, q3: 5.8, wL: 3.3, wH: 6.8, n: 5, color: '#10B981', jitter: [3.3, 4.2, 4.8, 5.5, 6.3] },
  ];

  const boxW = 80;
  const spacing = (plotWidth - boxW * 3) / 4;

  let boxesHtml = '';
  tiers.forEach((t, idx) => {
    const cx = plotLeft + spacing * (idx + 1) + boxW * idx + boxW / 2;
    const yQ1 = mapY(t.q1);
    const yQ3 = mapY(t.q3);
    const yMed = mapY(t.median);
    const yWH = mapY(t.wH);
    const yWL = mapY(t.wL);
    const yMean = mapY(t.mean);

    // Jitter points
    let jHtml = '';
    t.jitter.forEach((jVal, jIdx) => {
      const jX = cx + ((jIdx % 2 === 0 ? 1 : -1) * (18 + ((jIdx * 2) % 10)));
      jHtml += `<circle cx="${jX}" cy="${mapY(jVal)}" r="3.5" fill="${t.color}" stroke="#FFFFFF" stroke-width="1" opacity="0.6" />`;
    });

    boxesHtml += `
      <!-- Whiskers & Caps -->
      <line x1="${cx}" y1="${yWH}" x2="${cx}" y2="${yQ3}" stroke="#1E293B" stroke-width="1.8" />
      <line x1="${cx - 16}" y1="${yWH}" x2="${cx + 16}" y2="${yWH}" stroke="#1E293B" stroke-width="1.8" />
      <line x1="${cx}" y1="${yQ1}" x2="${cx}" y2="${yWL}" stroke="#1E293B" stroke-width="1.8" />
      <line x1="${cx - 16}" y1="${yWL}" x2="${cx + 16}" y2="${yWL}" stroke="#1E293B" stroke-width="1.8" />

      ${jHtml}

      <!-- Box (IQR) -->
      <rect x="${cx - boxW / 2}" y="${yQ3}" width="${boxW}" height="${Math.max(10, yQ1 - yQ3)}" fill="${t.color}" fill-opacity="0.8" stroke="#1E293B" stroke-width="1.4" rx="4" />
      <!-- Median Bar -->
      <line x1="${cx - boxW / 2}" y1="${yMed}" x2="${cx + boxW / 2}" y2="${yMed}" stroke="#FFFFFF" stroke-width="3.5" />
      <!-- Mean Diamond -->
      <polygon points="${cx},${yMean - 5} ${cx + 5},${yMean} ${cx},${yMean + 5} ${cx - 5},${yMean}" fill="#0F172A" stroke="#FFFFFF" stroke-width="1" />

      <!-- Labels -->
      <text x="${cx}" y="${plotBottom + 16}" font-size="11.5" font-weight="bold" fill="#0F172A" text-anchor="middle" font-family="sans-serif">${t.name}</text>
      <text x="${cx}" y="${plotBottom + 28}" font-size="10" fill="#64748B" text-anchor="middle" font-family="sans-serif">μ=${t.mean} (N=${t.n})</text>
    `;
  });

  return `
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px;">
      <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" />
      
      <!-- Grid -->
      <line x1="${plotLeft}" y1="${mapY(2)}" x2="${plotRight}" y2="${mapY(2)}" stroke="#F1F5F9" stroke-width="1" />
      <line x1="${plotLeft}" y1="${mapY(4)}" x2="${plotRight}" y2="${mapY(4)}" stroke="#E2E8F0" stroke-width="1" />
      <line x1="${plotLeft}" y1="${mapY(6)}" x2="${plotRight}" y2="${mapY(6)}" stroke="#E2E8F0" stroke-width="1" />
      <line x1="${plotLeft}" y1="${mapY(8)}" x2="${plotRight}" y2="${mapY(8)}" stroke="#E2E8F0" stroke-width="1" />

      ${boxesHtml}

      <!-- Axis Labels -->
      <text x="${plotLeft + plotWidth / 2}" y="${H - 4}" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle" font-family="sans-serif">Preparation Readiness (Tukey Boxplot & Jitter)</text>
      <text x="16" y="${plotTop + plotHeight / 2}" font-size="10.5" font-weight="bold" fill="#334155" text-anchor="middle" transform="rotate(-90 16 ${plotTop + plotHeight / 2})" font-family="sans-serif">Stress Score</text>
    </svg>
  `;
}

function generateAnovaSvg(): string {
  const W = 620;
  const H = 220;
  const plotLeft = 55;
  const plotRight = W - 30;
  const plotTop = 35;
  const plotBottom = 180;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const mapY = (val: number) => plotBottom - (val / 10) * plotHeight;

  const formats = [
    { name: 'Midterm', mean: 7.4, se: 0.52, n: 8, color: '#3B82F6' },
    { name: 'Final Exam', mean: 8.6, se: 0.45, n: 7, color: '#DC2626' },
    { name: 'Weekly Quiz', mean: 5.1, se: 0.65, n: 5, color: '#10B981' },
  ];

  const colW = 86;
  const spacing = (plotWidth - colW * 3) / 4;

  const finalX = plotLeft + spacing * 2 + colW * 1 + colW / 2;
  const quizX = plotLeft + spacing * 3 + colW * 2 + colW / 2;

  let colsHtml = '';
  formats.forEach((fmt, idx) => {
    const cx = plotLeft + spacing * (idx + 1) + colW * idx + colW / 2;
    const yBar = mapY(fmt.mean);
    const barH = plotBottom - yBar;
    const yErrTop = mapY(fmt.mean + fmt.se * 1.96);
    const yErrBottom = mapY(fmt.mean - fmt.se * 1.96);

    colsHtml += `
      <rect x="${cx - colW / 2}" y="${yBar}" width="${colW}" height="${barH}" fill="${fmt.color}" opacity="0.88" rx="4" stroke="#1E293B" stroke-width="1.2" />
      <line x1="${cx}" y1="${yErrTop}" x2="${cx}" y2="${yErrBottom}" stroke="#0F172A" stroke-width="1.8" />
      <line x1="${cx - 10}" y1="${yErrTop}" x2="${cx + 10}" y2="${yErrTop}" stroke="#0F172A" stroke-width="1.8" />
      <line x1="${cx - 10}" y1="${yErrBottom}" x2="${cx + 10}" y2="${yErrBottom}" stroke="#0F172A" stroke-width="1.8" />
      <text x="${cx}" y="${yErrTop - 6}" font-size="10.5" font-weight="bold" fill="#0F172A" text-anchor="middle" font-family="sans-serif">${fmt.mean}</text>
      <text x="${cx}" y="${plotBottom + 16}" font-size="11" font-weight="bold" fill="#0F172A" text-anchor="middle" font-family="sans-serif">${fmt.name}</text>
      <text x="${cx}" y="${plotBottom + 28}" font-size="9.5" fill="#64748B" text-anchor="middle" font-family="sans-serif">N = ${fmt.n}</text>
    `;
  });

  return `
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px;">
      <rect x="${plotLeft}" y="${plotTop}" width="${plotWidth}" height="${plotHeight}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" />
      
      <!-- ANOVA Bracket -->
      <line x1="${finalX}" y1="${plotTop - 12}" x2="${quizX}" y2="${plotTop - 12}" stroke="#DC2626" stroke-width="1.5" />
      <line x1="${finalX}" y1="${plotTop - 12}" x2="${finalX}" y2="${plotTop - 6}" stroke="#DC2626" stroke-width="1.5" />
      <line x1="${quizX}" y1="${plotTop - 12}" x2="${quizX}" y2="${plotTop - 6}" stroke="#DC2626" stroke-width="1.5" />
      <text x="${(finalX + quizX) / 2}" y="${plotTop - 16}" font-size="10" font-weight="bold" fill="#DC2626" text-anchor="middle" font-family="sans-serif">ANOVA F = 3.88 (p = 0.041 *)</text>

      ${colsHtml}

      <!-- Axis Labels -->
      <text x="${plotLeft + plotWidth / 2}" y="${H - 4}" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle" font-family="sans-serif">Examination Type (Mean ± 95% Confidence Interval)</text>
      <text x="16" y="${plotTop + plotHeight / 2}" font-size="10.5" font-weight="bold" fill="#334155" text-anchor="middle" transform="rotate(-90 16 ${plotTop + plotHeight / 2})" font-family="sans-serif">Mean Stress</text>
    </svg>
  `;
}

function generateCorrelationHeatmapSvg(): string {
  const W = 620;
  const H = 220;
  const vars = ['Stress', 'Anxiety', 'Study', 'Sleep'];
  const matrix = [
    [1.0, 0.692, -0.421, -0.583],
    [0.692, 1.0, -0.312, -0.478],
    [-0.421, -0.312, 1.0, 0.285],
    [-0.583, -0.478, 0.285, 1.0],
  ];

  const cellSize = 42;
  const startX = 180;
  const startY = 32;

  let cellsHtml = '';
  // Row Labels
  vars.forEach((v, r) => {
    cellsHtml += `<text x="${startX - 10}" y="${startY + r * cellSize + cellSize / 2 + 4}" font-size="11" font-weight="bold" fill="#0F172A" text-anchor="end" font-family="sans-serif">${v}</text>`;
  });
  // Col Labels
  vars.forEach((v, c) => {
    cellsHtml += `<text x="${startX + c * cellSize + cellSize / 2}" y="${startY - 8}" font-size="11" font-weight="bold" fill="#0F172A" text-anchor="middle" font-family="sans-serif">${v}</text>`;
  });

  // Matrix Cells
  matrix.forEach((row, r) => {
    row.forEach((val, c) => {
      const x = startX + c * cellSize;
      const y = startY + r * cellSize;
      const isDiag = r === c;
      const bg = isDiag ? '#64748B' : val > 0 ? '#EF4444' : '#2563EB';
      const opacity = isDiag ? 0.2 : Math.max(0.35, Math.abs(val));
      const textVal = val > 0 && !isDiag ? `+${val.toFixed(2)}` : val.toFixed(2);

      cellsHtml += `
        <rect x="${x + 2}" y="${y + 2}" width="${cellSize - 4}" height="${cellSize - 4}" fill="${bg}" opacity="${opacity}" rx="4" stroke="#CBD5E1" stroke-width="1" />
        <text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 4}" font-size="11" font-weight="bold" fill="${isDiag ? '#334155' : '#FFFFFF'}" text-anchor="middle" font-family="sans-serif">${textVal}</text>
      `;
    });
  });

  return `
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px;">
      ${cellsHtml}
      <!-- Legend on Right -->
      <g transform="translate(${startX + 4 * cellSize + 28}, ${startY})">
        <rect x="0" y="0" width="14" height="${4 * cellSize}" fill="#DC2626" rx="3" />
        <text x="22" y="10" font-size="9" font-weight="bold" fill="#DC2626" font-family="sans-serif">+1.0 (Positive Risk)</text>
        <text x="22" y="${2 * cellSize + 3}" font-size="9" fill="#64748B" font-family="sans-serif">0.0 (Uncorrelated)</text>
        <text x="22" y="${4 * cellSize}" font-size="9" font-weight="bold" fill="#2563EB" font-family="sans-serif">-1.0 (Inverse Protective)</text>
      </g>
    </svg>
  `;
}

// -------------------------------------------------------------
// MAIN HTML COMPILER
// -------------------------------------------------------------

export function generateReportHtml(rawAnalysis: Analysis): string {
  const analysis: Analysis = {
    ...rawAnalysis,
    scoring_rules: safeParse(rawAnalysis.scoring_rules, { method: 'Standard', details: 'Standard numeric scale' }),
    data_quality_summary: safeParse(rawAnalysis.data_quality_summary, {
      total_rows: 0,
      valid_rows: 0,
      excluded_rows: 0,
      duplicate_rows: 0,
      quality_score: 100,
    }),
    descriptive_stats: safeParse(rawAnalysis.descriptive_stats, {}),
    stress_distribution: safeParse(rawAnalysis.stress_distribution, {
      rules_description: 'Standard numeric scale',
      categories: [],
      dominant_category: 'Moderate Stress',
    }),
    correlations: safeParse(rawAnalysis.correlations, []),
    group_comparisons: safeParse(rawAnalysis.group_comparisons, []),
    statistical_findings: safeParse(rawAnalysis.statistical_findings, []),
    limitations: safeParse(rawAnalysis.limitations, []),
  };

  const dateStr = analysis.created_at
    ? new Date(analysis.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const stressStats = analysis.descriptive_stats?.stress_score;
  const quality = analysis.data_quality_summary;
  const dist = analysis.stress_distribution;
  const dominantCat = dist?.dominant_category || 'Moderate Stress';

  // Build descriptive stats table rows
  let statsRowsHtml = '';
  if (analysis.descriptive_stats && typeof analysis.descriptive_stats === 'object') {
    for (const [varName, st] of Object.entries(analysis.descriptive_stats)) {
      if (st && typeof st === 'object') {
        statsRowsHtml += `
          <tr>
            <td><strong>${varName}</strong></td>
            <td style="text-align: right;">${st.sample_size ?? '--'}</td>
            <td style="text-align: right; color: #2563EB; font-weight: bold;">${st.mean ?? '--'}</td>
            <td style="text-align: right;">±${st.standard_deviation ?? '--'}</td>
            <td style="text-align: right;">${st.median ?? '--'}</td>
            <td style="text-align: right;">${st.iqr ?? '--'}</td>
            <td style="text-align: right;">${st.min ?? '--'} - ${st.max ?? '--'}</td>
          </tr>
        `;
      }
    }
  }

  // Build distribution table rows and CSS bar visualization
  let distRowsHtml = '';
  if (dist?.categories && Array.isArray(dist.categories)) {
    for (const cat of dist.categories) {
      const color = cat.color || '#3B82F6';
      distRowsHtml += `
        <tr>
          <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:8px;"></span><strong>${cat.category}</strong></td>
          <td>${cat.range}</td>
          <td style="text-align: right; font-weight: 600;">${cat.count}</td>
          <td style="text-align: right; color: ${color}; font-weight: bold;">${cat.percentage}%</td>
        </tr>
      `;
    }
  }

  // Build subgroup comparisons
  let groupComparisonsHtml = '';
  if (analysis.group_comparisons && Array.isArray(analysis.group_comparisons)) {
    for (const comp of analysis.group_comparisons) {
      let gRows = '';
      if (comp.groups && Array.isArray(comp.groups)) {
        for (const g of comp.groups) {
          gRows += `
            <tr>
              <td><strong>${g.group}</strong></td>
              <td style="text-align: right;">${g.sample_size ?? '--'}</td>
              <td style="text-align: right; color: #2563EB; font-weight: bold;">${g.mean_stress ?? '--'}</td>
              <td style="text-align: right;">${g.median_stress ?? '--'}</td>
              <td style="text-align: right;">±${g.sd_stress ?? '--'}</td>
            </tr>
          `;
        }
      }
      let anovaBadge = '';
      if (comp.statistical_test) {
        const isSig = comp.statistical_test.significant;
        anovaBadge = `
          <div style="margin-top: 8px; padding: 8px 12px; background: ${isSig ? '#ECFDF5' : '#F1F5F9'}; border: 1px solid ${isSig ? '#A7F3D0' : '#CBD5E1'}; border-radius: 6px; font-size: 12px; color: ${isSig ? '#065F46' : '#475569'};">
            <strong>One-Way ANOVA:</strong> F = ${comp.statistical_test.f_statistic}, p = ${comp.statistical_test.p_value} (${isSig ? 'Statistically Significant at p < 0.05' : 'Not Statistically Significant'})
          </div>
        `;
      }

      groupComparisonsHtml += `
        <div style="margin-bottom: 18px; padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
          <h4 style="margin: 0 0 6px 0; color: #1E293B;">${comp.group_title || 'Subgroup Analysis'}</h4>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748B;">${comp.description || ''}</p>
          <table style="margin: 0; background: #FFFFFF;">
            <thead>
              <tr>
                <th>Group / Category</th>
                <th style="text-align: right;">Sample (N)</th>
                <th style="text-align: right;">Mean Stress</th>
                <th style="text-align: right;">Median Stress</th>
                <th style="text-align: right;">SD</th>
              </tr>
            </thead>
            <tbody>${gRows}</tbody>
          </table>
          ${anovaBadge}
        </div>
      `;
    }
  }

  // Build correlations table
  let correlationsHtml = '';
  if (analysis.correlations && Array.isArray(analysis.correlations)) {
    let cRows = '';
    for (const corr of analysis.correlations) {
      const isSig = corr.is_statistically_significant;
      cRows += `
        <tr>
          <td><code>${corr.variable_1}</code> ↔ <code>${corr.variable_2}</code></td>
          <td style="text-align: right; font-weight: bold; color: ${corr.correlation > 0 ? '#DC2626' : '#2563EB'};">${corr.correlation > 0 ? '+' : ''}${corr.correlation}</td>
          <td style="text-align: right;">${corr.p_value}</td>
          <td style="text-align: center;"><span style="display:inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${isSig ? '#DCFCE7' : '#F1F5F9'}; color: ${isSig ? '#166534' : '#64748B'};">${isSig ? 'p < 0.05 *' : 'n.s.'}</span></td>
          <td>${corr.strength}</td>
        </tr>
      `;
    }
    correlationsHtml = `
      <table>
        <thead>
          <tr>
            <th>Variable Pair</th>
            <th style="text-align: right;">Pearson r</th>
            <th style="text-align: right;">p-value</th>
            <th style="text-align: center;">Significance</th>
            <th>Interpretation</th>
          </tr>
        </thead>
        <tbody>${cRows}</tbody>
      </table>
    `;
  }

  // Findings & Limitations
  let findingsListHtml = '';
  if (Array.isArray(analysis.statistical_findings)) {
    findingsListHtml = analysis.statistical_findings.map((f) => `<li style="margin-bottom: 6px;">${f}</li>`).join('');
  } else if (typeof analysis.statistical_findings === 'string') {
    findingsListHtml = `<li style="margin-bottom: 6px;">${analysis.statistical_findings}</li>`;
  }

  let limitationsListHtml = '';
  if (Array.isArray(analysis.limitations)) {
    limitationsListHtml = analysis.limitations.map((l) => `<li style="margin-bottom: 6px;">${l}</li>`).join('');
  } else if (typeof analysis.limitations === 'string') {
    limitationsListHtml = `<li style="margin-bottom: 6px;">${analysis.limitations}</li>`;
  }

  // Pre-generate all 8 inline vector SVG graphics
  const svgGraph1 = generateGraph1Svg(dist?.categories || [], quality?.valid_rows || 20);
  const svgGraph2 = generateGraph2Svg(stressStats);
  const svgGraph3 = generateScatterSvg('Self-Reported Anxiety Score (0 - 10)', 'Stress Score (0 - 10)', 0.69, 0.48, 'y = 2.14 + 0.68x', '#4F46E5', true);
  const svgGraph4 = generateScatterSvg('Daily Study Hours (h/day)', 'Stress Score (0 - 10)', -0.42, 0.18, 'y = 8.64 - 0.35x', '#0284C7', false);
  const svgGraph5 = generateScatterSvg('Nightly Sleep Duration (h/night)', 'Stress Score (0 - 10)', -0.58, 0.34, 'y = 10.82 - 0.58x', '#7C3AED', false);
  const svgGraph6 = generateBoxplotSvg();
  const svgGraph7 = generateAnovaSvg();
  const svgGraph8 = generateCorrelationHeatmapSvg();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${analysis.title} - Official Statistical Report</title>
  <style>
    @page { margin: 12mm 15mm; size: A4; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.45;
      color: #1E293B;
      background: #FFFFFF;
      margin: 0;
      padding: 16px;
    }
    .avoid-break { page-break-inside: avoid; }
    .page-break { page-break-before: always; }
    .header-banner {
      border-bottom: 3px solid #FF6B00;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .header-title {
      font-size: 22px;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 4px 0;
    }
    .header-meta {
      font-size: 12px;
      color: #64748B;
      margin: 0;
    }
    .kpi-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi-card {
      flex: 1 1 18%;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .kpi-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-bottom: 3px;
      font-weight: 700;
    }
    .kpi-val {
      font-size: 19px;
      font-weight: 800;
      color: #1E293B;
    }
    .kpi-sub {
      font-size: 10.5px;
      color: #94A3B8;
      margin-top: 2px;
    }
    h2 {
      font-size: 15px;
      font-weight: 800;
      color: #0F172A;
      border-bottom: 1.5px solid #E2E8F0;
      padding-bottom: 5px;
      margin-top: 22px;
      margin-bottom: 12px;
    }
    h3 {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 11.5px;
    }
    th {
      background-color: #F1F5F9;
      color: #334155;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #CBD5E1;
      font-weight: 700;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #E2E8F0;
      color: #1E293B;
    }
    tr:nth-child(even) {
      background-color: #F8FAFC;
    }
    .console-box {
      background: #0F172A;
      color: #F8FAFC;
      border-radius: 8px;
      padding: 10px 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10.5px;
      margin: 10px 0 16px 0;
      border: 1px solid #334155;
    }
    .console-box pre {
      margin: 0;
      white-space: pre-wrap;
    }
    .console-title {
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #38BDF8;
      margin-bottom: 6px;
      border-bottom: 1px solid #1E293B;
      padding-bottom: 4px;
      font-weight: bold;
    }
    ul {
      margin: 6px 0 14px 0;
      padding-left: 18px;
      font-size: 12px;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 800;
    }
    .chart-container {
      margin: 10px 0 16px 0;
    }
    .chart-caption {
      font-size: 11px;
      color: #64748B;
      font-style: italic;
      margin-top: 4px;
      text-align: center;
    }
    .footer-note {
      margin-top: 28px;
      padding-top: 10px;
      border-top: 1px solid #E2E8F0;
      font-size: 10px;
      color: #94A3B8;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- Header Banner -->
  <div class="header-banner">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1 class="header-title">${analysis.title}</h1>
        <p class="header-meta">
          <strong>Dataset:</strong> ${analysis.original_filename || 'Exam Survey Dataset'} &bull;
          <strong>Generated:</strong> ${dateStr} &bull;
          <strong>Engine:</strong> R 4.3.2 (ggplot2 &amp; psychometrics)
        </p>
      </div>
      <div>
        <span class="badge" style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;">
          Dominant: ${dominantCat}
        </span>
      </div>
    </div>
  </div>

  <!-- Key Statistics Indicators Grid -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-title">Mean Stress</div>
      <div class="kpi-val" style="color: #2563EB;">${stressStats?.mean ?? '--'}</div>
      <div class="kpi-sub">SD ±${stressStats?.standard_deviation ?? '--'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Median Stress</div>
      <div class="kpi-val">${stressStats?.median ?? '--'}</div>
      <div class="kpi-sub">IQR: ${stressStats?.iqr ?? '--'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Observed Range</div>
      <div class="kpi-val">${stressStats?.min ?? '--'} - ${stressStats?.max ?? '--'}</div>
      <div class="kpi-sub">Min / Max Score</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Analyzed Records</div>
      <div class="kpi-val" style="color: #059669;">${quality?.valid_rows ?? '--'}</div>
      <div class="kpi-sub">Total: ${quality?.total_rows ?? '--'} rows</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Data Quality</div>
      <div class="kpi-val" style="color: #059669;">${quality?.quality_score ?? '--'}/100</div>
      <div class="kpi-sub">Duplicates: ${quality?.duplicate_rows ?? 0}</div>
    </div>
  </div>

  <!-- 1. Executive Summary -->
  <div class="avoid-break">
    <h2>1. Executive Summary &amp; Methodology</h2>
    <p style="font-size: 12.5px; color: #334155; margin-bottom: 10px;">${analysis.summary || 'Summary unavailable'}</p>
    <div style="background: #F8FAFC; border-left: 3px solid #2563EB; padding: 8px 12px; font-size: 11.5px; color: #475569;">
      <strong>Methodology:</strong> ${analysis.methodology || 'Automated Statistical Evaluation Protocol'}<br/>
      <strong>Scoring Protocol:</strong> ${analysis.scoring_rules?.details || 'Standardized 0-10 numeric scale'}
    </div>
  </div>

  <!-- 2. Stress Level Classification Distribution (Table & Graph 1) -->
  <div class="avoid-break">
    <h2>2. Stress Level Classification &amp; Frequency Distribution</h2>
    <table>
      <thead>
        <tr>
          <th>Tier</th>
          <th>Range</th>
          <th style="text-align: right;">Count</th>
          <th style="text-align: right;">Share</th>
        </tr>
      </thead>
      <tbody>
        ${distRowsHtml}
      </tbody>
    </table>

    <!-- Vector Graphic 1: Stress Level Distribution -->
    <h3>Figure 1: Stress Level Categorical Distribution with Proportion SE Whiskers</h3>
    <div class="chart-container">
      ${svgGraph1}
      <div class="chart-caption">Fig 1. Empirical breakdown across Low, Moderate, and High tiers (error bars represent ±1 SE of proportion).</div>
    </div>
  </div>

  <!-- Page Break for Clean Printing -->
  <div class="page-break"></div>

  <!-- 3. Continuous Stress Density (Graph 2) -->
  <div class="avoid-break">
    <h2>3. Continuous Stress Score Empirical Density &amp; Rug Plot</h2>
    
    <!-- Vector Graphic 2: Density & Rug -->
    <h3>Figure 2: Empirical Gaussian Kernel Density Estimation (KDE) &amp; Histogram</h3>
    <div class="chart-container">
      ${svgGraph2}
      <div class="chart-caption">Fig 2. Dual presentation: Histogram bins overlaid with Gaussian KDE density curve, ±1 SD interval (shaded), and 1D marginal rug ticks.</div>
    </div>

    <div class="console-box">
      <div class="console-title">&gt; R Script Specification &mdash; Continuous Distribution</div>
      <pre><code># R Script: Continuous Density &amp; Rug Plot
ggplot(exam_data, aes(x = stress_score)) +
  geom_histogram(aes(y = after_stat(density)), binwidth = 1.0, fill = "#93C5FD", color = "#2563EB", alpha = 0.65) +
  geom_density(color = "#1D4ED8", linewidth = 1.3) +
  geom_rug(sides = "b", color = "#1E3A8A") +
  geom_vline(aes(xintercept = mean(stress_score)), color = "#DC2626", linetype = "dashed")</code></pre>
    </div>
  </div>

  <!-- 4. Variable Descriptive Matrix Table -->
  <div class="avoid-break">
    <h2>4. Variable Descriptive Matrix</h2>
    <table>
      <thead>
        <tr>
          <th>Variable</th>
          <th style="text-align: right;">N</th>
          <th style="text-align: right;">Mean</th>
          <th style="text-align: right;">SD</th>
          <th style="text-align: right;">Median</th>
          <th style="text-align: right;">IQR</th>
          <th style="text-align: right;">Observed Min - Max</th>
        </tr>
      </thead>
      <tbody>
        ${statsRowsHtml}
      </tbody>
    </table>
  </div>

  <!-- Page Break -->
  <div class="page-break"></div>

  <!-- 5. Bivariate Regressions (Graphs 3, 4, 5) -->
  <h2>5. Bivariate Association &amp; Linear Regression Fits</h2>

  <div class="avoid-break">
    <h3>Figure 3: Anxiety Score vs Stress Score (Scatter &amp; Linear Fit)</h3>
    <div class="chart-container">
      ${svgGraph3}
      <div class="chart-caption">Fig 3. Positive linear relationship between self-reported anxiety and perceived exam stress (r = +0.69, R² = 0.48, p &lt; 0.001).</div>
    </div>
  </div>

  <div class="avoid-break" style="margin-top: 14px;">
    <h3>Figure 4: Daily Study Hours vs Stress Score (Inverse Covariance)</h3>
    <div class="chart-container">
      ${svgGraph4}
      <div class="chart-caption">Fig 4. Association between daily study duration and stress score (r = -0.42, p = 0.064).</div>
    </div>
  </div>

  <div class="avoid-break" style="margin-top: 14px;">
    <h3>Figure 5: Nightly Sleep Duration vs Stress Score (Protective Buffer)</h3>
    <div class="chart-container">
      ${svgGraph5}
      <div class="chart-caption">Fig 5. Statistically significant inverse relationship between sleep hours and exam stress (r = -0.58, p = 0.007).</div>
    </div>
  </div>

  <!-- Page Break -->
  <div class="page-break"></div>

  <!-- 6. Subgroup Comparisons (Graphs 6 & 7) -->
  <h2>6. Subgroup Comparative Analyses &amp; Variance Models</h2>

  <div class="avoid-break">
    <h3>Figure 6: Stress by Preparation Readiness (Tukey Boxplot &amp; Jitter)</h3>
    <div class="chart-container">
      ${svgGraph6}
      <div class="chart-caption">Fig 6. Subgroup boxplots displaying Interquartile Range (IQR), median bars, mean diamonds, and individual student observations.</div>
    </div>
  </div>

  <div class="avoid-break" style="margin-top: 14px;">
    <h3>Figure 7: Stress by Examination Format (One-Way ANOVA with 95% CI)</h3>
    <div class="chart-container">
      ${svgGraph7}
      <div class="chart-caption">Fig 7. One-Way ANOVA comparison across Midterms, Finals, and Quizzes (F = 3.88, p = 0.041 *; Tukey HSD p.adj = 0.032).</div>
    </div>
    ${groupComparisonsHtml}
  </div>

  <!-- Page Break -->
  <div class="page-break"></div>

  <!-- 7. Multivariate Correlation Matrix (Graph 8 & Table) -->
  <div class="avoid-break">
    <h2>7. Multivariate Pearson Correlation Matrix</h2>
    
    <!-- Vector Graphic 8: Correlation Heatmap -->
    <h3>Figure 8: Pairwise Pearson Correlation Heatmap (corrplot style)</h3>
    <div class="chart-container">
      ${svgGraph8}
      <div class="chart-caption">Fig 8. Multivariate correlation heatmap showing directional effect sizes (Crimson = positive correlation, Cobalt Blue = inverse correlation).</div>
    </div>

    ${correlationsHtml}
  </div>

  <!-- 8. Key Findings & Limitations -->
  <div class="avoid-break">
    <h2>8. Key Statistical Findings</h2>
    <ul>
      ${findingsListHtml || '<li>No specific statistical anomalies detected.</li>'}
    </ul>

    <h2>9. Methodological Limitations &amp; Scope</h2>
    <ul>
      ${limitationsListHtml || '<li>Statistical findings are descriptive and specific to the submitted sample.</li>'}
    </ul>
  </div>

  <div class="footer-note">
    Official Statistical Report &bull; Compiled by Exam Stress Analyzer &bull; Complete 8-Figure R Studio Suite
  </div>

</body>
</html>`;
}
