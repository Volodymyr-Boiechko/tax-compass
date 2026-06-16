import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppStore } from '../../state/app.store';
import { RegimeCalculationService } from '../../core/services/regime-calculation.service';
import { CurrencyService } from '../../core/services/currency.service';
import { Country } from '../../core/models/country.model';

// ── Chart constants ──────────────────────────────────────────────────────────

export const CHART_MAX_GROSS = 200_000;
export const CHART_STEP      = 2_000;

const VB_W   = 800;
const VB_H   = 300;
const PLOT_L = 72;
const PLOT_T = 12;
const PLOT_R = 788;
const PLOT_B = 256;
const PLOT_W = PLOT_R - PLOT_L;   // 716
const PLOT_H = PLOT_B - PLOT_T;   // 244

const X_TICK_GROSSES = [0, 50_000, 100_000, 150_000, 200_000];

const SERIES_COLORS = ['#3b82f6', '#f59e0b', '#10b981'];

// ── Public types ─────────────────────────────────────────────────────────────

export type ChartMetric = 'rate' | 'net';
export interface ChartPoint  { x: number; y: number; }
export interface ChartSeries { code: string; name: string; flag: string | null; points: ChartPoint[]; }

// ── Pure helpers (module-level, no Angular DI) ────────────────────────────────

function xToSvg(gross: number): number {
  return PLOT_L + (gross / CHART_MAX_GROSS) * PLOT_W;
}

function yToSvg(y: number, maxY: number): number {
  if (maxY <= 0) return PLOT_B;
  return PLOT_B - (y / maxY) * PLOT_H;
}

export function buildSeries(
  countries: Country[],
  calc: RegimeCalculationService,
  opts: { metric: ChartMetric; maxGross?: number; step?: number },
): ChartSeries[] {
  const maxGross = opts.maxGross ?? CHART_MAX_GROSS;
  const step     = opts.step     ?? CHART_STEP;

  const xs: number[] = [];
  for (let x = 0; x <= maxGross; x += step) xs.push(x);

  return countries.map(country => ({
    code:   country.code,
    name:   country.name,
    flag:   country.flag,
    points: xs.map(x => {
      if (x === 0) return { x: 0, y: 0 };
      const { best } = calc.calculateAll(country, x);
      return { x, y: opts.metric === 'rate' ? best.effectiveRate : best.net };
    }),
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-progression-chart',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (!countries().length) {
      <div class="py-6 text-center text-[var(--color-text-faint)] text-sm italic">
        {{ 'chart.emptyState' | translate }}
      </div>
    } @else {
      <div class="mt-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">

        <!-- Header + metric toggle -->
        <div class="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h3 class="text-sm font-semibold text-[var(--color-text-primary)]">{{ 'chart.title' | translate }}</h3>
            <p class="text-[11px] text-[var(--color-text-faint)] mt-0.5">{{ 'chart.caption' | translate }}</p>
          </div>
          <div class="flex items-center bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md p-0.5 shrink-0"
               role="group">
            <button
              class="px-3 py-1 rounded text-xs font-medium transition-colors"
              [class]="metric() === 'rate'
                ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
              [attr.aria-pressed]="metric() === 'rate'"
              (click)="metric.set('rate')"
            >{{ 'chart.rate' | translate }}</button>
            <button
              class="px-3 py-1 rounded text-xs font-medium transition-colors"
              [class]="metric() === 'net'
                ? 'bg-[var(--color-border-bright)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'"
              [attr.aria-pressed]="metric() === 'net'"
              (click)="metric.set('net')"
            >{{ 'chart.net' | translate }}</button>
          </div>
        </div>

        <!-- SVG chart -->
        <svg viewBox="0 0 800 300"
             class="w-full h-auto select-none"
             style="overflow: visible"
             role="img"
             [attr.aria-label]="'chart.title' | translate">

          <!-- Horizontal grid lines + Y axis labels -->
          @for (t of yTicks(); track t.label) {
            <line
              [attr.x1]="PL" [attr.y1]="t.svgY"
              [attr.x2]="PR" [attr.y2]="t.svgY"
              stroke="var(--color-border)" stroke-width="1" />
            <text
              [attr.x]="PL - 6" [attr.y]="t.svgY + 4"
              text-anchor="end"
              fill="var(--color-text-faint)"
              font-size="10">{{ t.label }}</text>
          }

          <!-- X axis baseline -->
          <line [attr.x1]="PL" [attr.y1]="PB" [attr.x2]="PR" [attr.y2]="PB"
                stroke="var(--color-border)" stroke-width="1" />

          <!-- X axis ticks + labels -->
          @for (t of xTicksFmt(); track t.svgX) {
            <line [attr.x1]="t.svgX" [attr.y1]="PB"
                  [attr.x2]="t.svgX" [attr.y2]="PB + 4"
                  stroke="var(--color-border)" stroke-width="1" />
            <text [attr.x]="t.svgX" [attr.y]="PB + 16"
                  text-anchor="middle"
                  fill="var(--color-text-faint)"
                  font-size="9">{{ t.label }}</text>
          }

          <!-- X axis title -->
          <text [attr.x]="PL + PW / 2" [attr.y]="VBH - 2"
                text-anchor="middle"
                fill="var(--color-text-faint)"
                font-size="9">{{ 'chart.incomeAxis' | translate }}</text>

          <!-- Series polylines -->
          @for (s of svgSeries(); track s.code) {
            <polyline
              [attr.points]="s.pointsStr"
              [attr.stroke]="s.color"
              stroke-width="2"
              fill="none"
              stroke-linejoin="round"
              stroke-linecap="round" />
          }

          <!-- User income vertical guide -->
          @if (userIncomeSvgX(); as ux) {
            <line [attr.x1]="ux" [attr.y1]="PT" [attr.x2]="ux" [attr.y2]="PB"
                  stroke="var(--color-accent)" stroke-width="1.5"
                  stroke-dasharray="4 3" opacity="0.85" />
            <text [attr.x]="ux + 4" [attr.y]="PT + 10"
                  fill="var(--color-accent)" font-size="9" font-weight="500">
              {{ 'chart.yourIncome' | translate }}
            </text>
          }

          <!-- Hover overlay (captures mouse events) -->
          <rect
            [attr.x]="PL" [attr.y]="PT"
            [attr.width]="PW" [attr.height]="PB - PT"
            fill="transparent"
            style="cursor: crosshair"
            (mousemove)="onMouseMove($event)"
            (mouseleave)="onMouseLeave()" />

          <!-- Crosshair + tooltip -->
          @if (tooltip(); as tt) {
            <!-- Vertical crosshair -->
            <line [attr.x1]="tt.svgX" [attr.y1]="PT" [attr.x2]="tt.svgX" [attr.y2]="PB"
                  stroke="var(--color-text-faint)" stroke-width="1" stroke-dasharray="2 2" />

            <!-- Tooltip box -->
            @let tipX = tt.svgX > VBW / 2 ? tt.svgX - 176 : tt.svgX + 12;
            @let tipH = 24 + tt.items.length * 18;
            <rect [attr.x]="tipX" [attr.y]="PT + 4"
                  width="164" [attr.height]="tipH"
                  rx="4" ry="4"
                  fill="var(--color-surface)"
                  stroke="var(--color-border)" stroke-width="1" />
            <text [attr.x]="tipX + 8" [attr.y]="PT + 16"
                  fill="var(--color-text-faint)" font-size="9">{{ tt.grossLabel }}</text>

            @for (item of tt.items; track item.code; let i = $index) {
              <circle [attr.cx]="tipX + 10" [attr.cy]="PT + 25 + i * 18"
                      r="3.5" [attr.fill]="item.color" />
              <text [attr.x]="tipX + 20" [attr.y]="PT + 29 + i * 18"
                    fill="var(--color-text-secondary)" font-size="10">{{ item.label }}</text>
              <text [attr.x]="tipX + 156" [attr.y]="PT + 29 + i * 18"
                    text-anchor="end"
                    [attr.fill]="item.color"
                    font-size="10" font-weight="600">{{ item.formattedY }}</text>
            }
          }
        </svg>

        <!-- Legend -->
        <div class="flex flex-wrap gap-4 mt-1">
          @for (s of svgSeries(); track s.code) {
            <div class="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
              <span class="inline-block w-5 shrink-0" style="height: 2px; border-radius: 1px"
                    [style.background]="s.color"></span>
              <span>{{ s.flag ?? '' }} {{ s.name }}</span>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ProgressionChartComponent {
  private readonly store     = inject(AppStore);
  private readonly regimeCalc = inject(RegimeCalculationService);
  readonly currency = inject(CurrencyService);

  readonly metric     = signal<ChartMetric>('rate');
  readonly hoveredIdx = signal<number | null>(null);

  readonly countries = this.store.comparedCountries;

  // Expose SVG layout constants to template
  readonly VBW  = VB_W;
  readonly VBH  = VB_H;
  readonly PL   = PLOT_L;
  readonly PT   = PLOT_T;
  readonly PR   = PLOT_R;
  readonly PB   = PLOT_B;
  readonly PW   = PLOT_W;
  readonly PH   = PLOT_H;

  // ── Series data (EUR-only, recomputes only on country or metric change) ────

  readonly rawSeries = computed(() =>
    buildSeries(this.countries(), this.regimeCalc, { metric: this.metric() })
  );

  readonly maxY = computed((): number => {
    if (this.metric() === 'net') return CHART_MAX_GROSS;
    const allY = this.rawSeries().flatMap(s => s.points.map(p => p.y));
    if (!allY.length) return 0.5;
    const dataMax = Math.max(...allY);
    return Math.max(0.3, Math.ceil(dataMax * 10) / 10);
  });

  readonly svgSeries = computed(() => {
    const maxY = this.maxY();
    return this.rawSeries().map((s, i) => ({
      ...s,
      color:     SERIES_COLORS[i % SERIES_COLORS.length],
      pointsStr: s.points
        .map(p => `${xToSvg(p.x).toFixed(1)},${yToSvg(p.y, maxY).toFixed(1)}`)
        .join(' '),
    }));
  });

  // ── Axis labels (track currency/period for reformatting) ──────────────────

  readonly yTicks = computed(() => {
    const metric = this.metric();
    const maxY   = this.maxY();
    const per    = this.currency.period();

    if (metric === 'rate') {
      const ticks: { svgY: number; label: string }[] = [];
      for (let r = 0; r <= maxY + 0.001; r += 0.1) {
        ticks.push({ svgY: yToSvg(r, maxY), label: Math.round(r * 100) + '%' });
      }
      return ticks;
    }

    return [0, 50_000, 100_000, 150_000, 200_000].map(n => ({
      svgY:  yToSvg(n, maxY),
      label: n === 0 ? '0' : this.currency.format(n, { monthly: per === 'monthly' }),
    }));
  });

  readonly xTicksFmt = computed(() => {
    const per = this.currency.period();
    return X_TICK_GROSSES.map(gross => ({
      svgX:  xToSvg(gross),
      label: gross === 0 ? '0' : this.currency.format(gross, { monthly: per === 'monthly' }),
    }));
  });

  readonly userIncomeSvgX = computed((): number | null => {
    const inc = this.store.userIncome();
    if (inc == null || inc <= 0 || inc > CHART_MAX_GROSS) return null;
    return xToSvg(inc);
  });

  // ── Hover tooltip ─────────────────────────────────────────────────────────

  readonly tooltip = computed(() => {
    const idx    = this.hoveredIdx();
    const series = this.svgSeries();
    if (idx === null || !series.length) return null;

    const gross  = idx * CHART_STEP;
    const svgX   = xToSvg(gross);
    const metric = this.metric();
    const per    = this.currency.period();

    const grossLabel = this.currency.format(gross, { monthly: per === 'monthly' });

    const items = series.map(s => {
      const y          = s.points[idx]?.y ?? 0;
      const formattedY = metric === 'rate'
        ? (Math.max(0, y) * 100).toFixed(1) + '%'
        : this.currency.format(y, { monthly: per === 'monthly' });
      const label = (s.flag ?? '') + ' ' + (s.name.length > 13 ? s.name.slice(0, 12) + '…' : s.name);
      return { code: s.code, color: s.color, label, formattedY };
    });

    return { svgX, grossLabel, items };
  });

  onMouseMove(event: MouseEvent): void {
    const overlay = event.currentTarget as SVGRectElement;
    const svg     = overlay.ownerSVGElement!;
    const rect    = svg.getBoundingClientRect();
    const svgX    = ((event.clientX - rect.left) / rect.width) * VB_W;
    const gross   = ((svgX - PLOT_L) / PLOT_W) * CHART_MAX_GROSS;
    const total   = CHART_MAX_GROSS / CHART_STEP;
    const idx     = Math.max(0, Math.min(Math.round((gross / CHART_MAX_GROSS) * total), total));
    this.hoveredIdx.set(idx);
  }

  onMouseLeave(): void {
    this.hoveredIdx.set(null);
  }
}
