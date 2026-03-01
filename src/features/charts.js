import { Chart } from 'chart.js/auto';

const charts = {};

export function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    charts[key] = null;
  }
}

export function mkChart(key, el, cfg) {
  destroyChart(key);
  try {
    charts[key] = new Chart(el, cfg);
  } catch (e) {
    console.error(e);
  }
}

export function themeColor(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}
