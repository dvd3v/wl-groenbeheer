import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView.js";
import StatisticDefinition from "@arcgis/core/rest/support/StatisticDefinition.js";
import Query from "@arcgis/core/rest/support/Query.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import { STATUS_DOMAIN, getStatusLabel, getStatusColor } from "./map";

export interface StatusStat {
  code: number;
  label: string;
  count: number;
  color: string;
  pct: number;
}

export class StatisticsPanel {
  private container: HTMLElement;
  private layer: FeatureLayer;
  private layerView: FeatureLayerView | null = null;
  private statusField: string;

  constructor(
    container: HTMLElement,
    layer: FeatureLayer,
    statusField: string
  ) {
    this.container = container;
    this.layer = layer;
    this.statusField = statusField;
    this.renderLoading();
  }

  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="stats-header">
        <h3>Voortgang</h3>
        <div class="stats-total">Laden...</div>
      </div>
    `;
  }

  async attachToLayerView(layerView: FeatureLayerView): Promise<void> {
    this.layerView = layerView;

    reactiveUtils.when(
      () => !layerView.updating,
      () => this.updateStats(),
      { initial: true }
    );

    this.layer.on("edits", () => {
      setTimeout(() => this.updateStats(), 500);
    });
  }

  private async updateStats(): Promise<void> {
    if (!this.layerView) return;

    try {
      const query = new Query({
        where: "1=1",
        outStatistics: [
          new StatisticDefinition({
            statisticType: "count",
            onStatisticField: "OBJECTID",
            outStatisticFieldName: "feature_count",
          }),
        ],
        groupByFieldsForStatistics: [this.statusField],
      });

      const result = await this.layer.queryFeatures(query);

      const statsMap = new Map<number, number>();
      let totalCount = 0;

      for (const feature of result.features) {
        const code = Number(feature.attributes[this.statusField]) || 0;
        const count = feature.attributes.feature_count;
        totalCount += count;
        statsMap.set(code, (statsMap.get(code) || 0) + count);
      }

      // Build stats array for all known statuses (even if 0)
      const stats: StatusStat[] = STATUS_DOMAIN.map((s) => {
        const count = statsMap.get(s.code) || 0;
        return {
          code: s.code,
          label: s.label,
          count,
          color: s.color,
          pct: totalCount > 0 ? (count / totalCount) * 100 : 0,
        };
      });

      // Add any unknown codes
      for (const [code, count] of statsMap) {
        if (!STATUS_DOMAIN.find((s) => s.code === code)) {
          stats.push({
            code,
            label: getStatusLabel(code),
            count,
            color: getStatusColor(code),
            pct: totalCount > 0 ? (count / totalCount) * 100 : 0,
          });
        }
      }

      this.renderStats(stats, totalCount);
    } catch (error) {
      console.error("Error querying statistics:", error);
      this.container.querySelector(".stats-total")!.textContent =
        "Fout bij laden statistieken";
    }
  }

  private renderStats(stats: StatusStat[], total: number): void {
    const controleren = stats.find((s) => s.label === "Controleren")?.count || 0;
    const processed = total - controleren;
    const pctDone = total > 0 ? Math.round((processed / total) * 100) : 0;

    // Build SVG donut chart
    const donutSvg = this.buildDonutChart(stats, total);

    this.container.innerHTML = `
      <div class="stats-header">
        <h3>Voortgang</h3>
        <div class="stats-total">${total.toLocaleString("nl-NL")} trajecten</div>
      </div>

      <!-- Donut chart -->
      <div class="stats-donut-wrapper">
        ${donutSvg}
        <div class="stats-donut-center">
          <span class="donut-pct">${pctDone}%</span>
          <span class="donut-label">verwerkt</span>
        </div>
      </div>

      <!-- Per-status bars -->
      <div class="stats-bars">
        ${stats
          .filter((s) => s.count > 0)
          .sort((a, b) => b.count - a.count)
          .map(
            (s) => `
            <div class="stat-bar-row">
              <div class="stat-bar-header">
                <span class="stat-indicator" style="background-color: ${s.color}"></span>
                <span class="stat-bar-label">${s.label}</span>
                <span class="stat-bar-value">${s.count.toLocaleString("nl-NL")}</span>
                <span class="stat-bar-pct">${Math.round(s.pct)}%</span>
              </div>
              <div class="stat-bar-track">
                <div class="stat-bar-fill" style="width: ${s.pct}%; background-color: ${s.color}"></div>
              </div>
            </div>
          `
          )
          .join("")}
      </div>

      <!-- Summary -->
      <div class="stats-summary">
        <div class="summary-item summary-remaining">
          <span class="summary-number">${controleren.toLocaleString("nl-NL")}</span>
          <span class="summary-label">nog te controleren</span>
        </div>
        <div class="summary-item summary-done">
          <span class="summary-number">${processed.toLocaleString("nl-NL")}</span>
          <span class="summary-label">verwerkt</span>
        </div>
      </div>
    `;
  }

  private buildDonutChart(stats: StatusStat[], total: number): string {
    if (total === 0) {
      return `<svg viewBox="0 0 120 120" class="stats-donut">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#e0e0e0" stroke-width="20"/>
      </svg>`;
    }

    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const segments: string[] = [];

    for (const s of stats) {
      if (s.count === 0) continue;
      const segmentLength = (s.count / total) * circumference;
      segments.push(
        `<circle
          cx="60" cy="60" r="${radius}"
          fill="none"
          stroke="${s.color}"
          stroke-width="20"
          stroke-dasharray="${segmentLength} ${circumference - segmentLength}"
          stroke-dashoffset="${-offset}"
          transform="rotate(-90 60 60)"
        />`
      );
      offset += segmentLength;
    }

    return `<svg viewBox="0 0 120 120" class="stats-donut">${segments.join("")}</svg>`;
  }
}
