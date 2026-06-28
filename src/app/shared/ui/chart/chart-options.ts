import type { EChartsCoreOption } from 'echarts/core';

import { TimeSeriesPoint } from '@core/models';
import { Theme } from '@core/services/theme-store';

/**
 * Theme-aware ECharts option builders.
 *
 * Keeping the option construction here (rather than inside feature components)
 * makes chart styling part of the design system: every line/donut/gauge shares
 * the same typography, grid, tooltip and colour language, and re-themes when the
 * light/dark signal changes. Components stay declarative — they call a builder
 * with data and the current theme and hand the result to <app-chart>.
 */

export interface ChartPalette {
  text: string;
  muted: string;
  axis: string;
  split: string;
  tooltipBg: string;
  tooltipBorder: string;
  series: string[];
}

const SERIES_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6'];

export function chartPalette(theme: Theme): ChartPalette {
  const dark = theme === 'dark';
  return {
    text: dark ? '#e2e8f0' : '#1f2937',
    muted: dark ? '#94a3b8' : '#6b7280',
    axis: dark ? '#334155' : '#e5e7eb',
    split: dark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.12)',
    tooltipBg: dark ? '#0f172a' : '#ffffff',
    tooltipBorder: dark ? '#334155' : '#e5e7eb',
    series: SERIES_COLORS,
  };
}

function baseTooltip(p: ChartPalette): Record<string, unknown> {
  return {
    backgroundColor: p.tooltipBg,
    borderColor: p.tooltipBorder,
    borderWidth: 1,
    textStyle: { color: p.text, fontSize: 12 },
    padding: [8, 12],
  };
}

export interface LineSeries {
  name: string;
  points: TimeSeriesPoint[];
  color?: string;
  area?: boolean;
}

export interface LineChartOptions {
  valueSuffix?: string;
  showLegend?: boolean;
  smooth?: boolean;
  yMin?: number | 'dataMin';
  decimals?: number;
}

export function makeLineChart(
  theme: Theme,
  series: LineSeries[],
  opts: LineChartOptions = {},
): EChartsCoreOption {
  const p = chartPalette(theme);
  const { valueSuffix = '', showLegend = false, smooth = true, yMin = 'dataMin' } = opts;

  return {
    color: p.series,
    grid: { top: showLegend ? 36 : 16, right: 16, bottom: 28, left: 52 },
    legend: showLegend
      ? { top: 0, right: 8, textStyle: { color: p.muted }, icon: 'roundRect', itemHeight: 8 }
      : undefined,
    tooltip: {
      trigger: 'axis',
      ...baseTooltip(p),
      valueFormatter: (v: number) => `${typeof v === 'number' ? Math.round(v * 100) / 100 : v}${valueSuffix}`,
    },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: p.axis } },
      axisLabel: { color: p.muted, hideOverlap: true, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: yMin,
      scale: true,
      axisLabel: { color: p.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: p.split } },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth,
      showSymbol: false,
      lineStyle: { width: 2, color: s.color },
      itemStyle: { color: s.color },
      areaStyle: s.area
        ? { opacity: 0.12, color: s.color ?? p.series[0] }
        : undefined,
      data: s.points.map((pt) => [pt.t, pt.v]),
    })),
  };
}

export interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

export function makeDonutChart(
  theme: Theme,
  data: DonutDatum[],
  centerLabel?: string,
): EChartsCoreOption {
  const p = chartPalette(theme);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return {
    tooltip: { trigger: 'item', ...baseTooltip(p), formatter: '{b}: {c} ({d}%)' },
    legend: {
      bottom: 0,
      left: 'center',
      textStyle: { color: p.muted, fontSize: 12 },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
    },
    series: [
      {
        type: 'pie',
        radius: ['58%', '82%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: false,
        itemStyle: { borderColor: p.tooltipBg, borderWidth: 2 },
        label: {
          show: true,
          position: 'center',
          formatter: centerLabel ? `{total|${total}}\n{label|${centerLabel}}` : `{total|${total}}`,
          rich: {
            total: { fontSize: 26, fontWeight: 700, color: p.text },
            label: { fontSize: 12, color: p.muted, padding: [4, 0, 0, 0] },
          },
        },
        labelLine: { show: false },
        data: data.map((d) => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
      },
    ],
  };
}

/** Colour for a 0–100 score (red → amber → green). */
export function scoreColor(score: number): string {
  if (score >= 70) {
    return '#16a34a';
  }
  if (score >= 40) {
    return '#f59e0b';
  }
  return '#ef4444';
}

export function makeGaugeChart(theme: Theme, value: number): EChartsCoreOption {
  const p = chartPalette(theme);
  const v = Math.round(value);
  return {
    series: [
      {
        type: 'gauge',
        min: 0,
        max: 100,
        startAngle: 210,
        endAngle: -30,
        radius: '100%',
        center: ['50%', '56%'],
        progress: { show: true, width: 12, roundCap: true, itemStyle: { color: scoreColor(v) } },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.4, 'rgba(239,68,68,0.25)'],
              [0.7, 'rgba(245,158,11,0.25)'],
              [1, 'rgba(22,163,74,0.25)'],
            ],
          },
        },
        pointer: { show: false },
        anchor: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 30,
          fontWeight: 700,
          offsetCenter: [0, '4%'],
          formatter: '{v|{value}}',
          rich: { v: { fontSize: 30, fontWeight: 700, color: p.text } },
        },
        data: [{ value: v }],
      },
    ],
  };
}
