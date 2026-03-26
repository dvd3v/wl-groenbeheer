import "@arcgis/core/assets/esri/themes/light/main.css";
import "@esri/calcite-components/main.css";
import "./style.css";

// ArcGIS Map Components (5.x)
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-editor";
import "@arcgis/map-components/components/arcgis-layer-list";
import "@arcgis/map-components/components/arcgis-legend";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-expand";
import "@arcgis/map-components/components/arcgis-feature-table";

// AI Components (5.x)
import "@arcgis/ai-components/components/arcgis-assistant";
import "@arcgis/ai-components/components/arcgis-assistant-data-exploration-agent";
import "@arcgis/ai-components/components/arcgis-assistant-navigation-agent";
import "@arcgis/ai-components/components/arcgis-assistant-help-agent";

// Calcite Components (5.x)
import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-panel";

import { initAuth } from "./auth";
import { BasemapOptionId, getConfiguredWebMapId, initMap } from "./map";
import { StatisticsPanel } from "./statistics";
import { initTableResize, initAssistantToggle } from "./table-resize";

function renderAssistant(): any {
  const assistantContent = document.getElementById("assistant-content");
  if (!assistantContent) return null;

  assistantContent.innerHTML = `
    <arcgis-assistant
      reference-element="mainMap"
      heading="Groenbeheer Assistent"
      description="Verken maaitrajecten met AI. Stel vragen over statussen, oppervlaktes en locaties."
      entry-message="Hallo! Ik help je bij het verkennen van de maaitrajecten. Stel een vraag over de data of gebruik een van de suggesties hieronder."
      log-enabled
      copy-enabled
    >
      <arcgis-assistant-data-exploration-agent></arcgis-assistant-data-exploration-agent>
      <arcgis-assistant-navigation-agent></arcgis-assistant-navigation-agent>
      <arcgis-assistant-help-agent></arcgis-assistant-help-agent>
    </arcgis-assistant>
  `;

  return assistantContent.querySelector("arcgis-assistant") as any;
}

function renderAssistantUnavailable(message: string): void {
  const assistantContent = document.getElementById("assistant-content");
  if (!assistantContent) return;

  assistantContent.innerHTML = `
    <div class="assistant-unavailable">
      <h3>AI assistent tijdelijk niet beschikbaar</h3>
      <p>${message}</p>
    </div>
  `;
}

function renderBasemapSwitcher(
  options: Array<{ id: BasemapOptionId; label: string }>,
  onSelect: (id: BasemapOptionId) => void
): void {
  const container = document.getElementById("basemap-switcher");
  if (!container) return;

  container.innerHTML = options
    .map(
      ({ id, label }, index) => `
        <button
          type="button"
          class="basemap-btn${index === 0 ? " active" : ""}"
          data-basemap-id="${id}"
        >
          ${label}
        </button>
      `
    )
    .join("");

  const buttons = Array.from(
    container.querySelectorAll<HTMLButtonElement>(".basemap-btn")
  );

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.basemapId as BasemapOptionId | undefined;
      if (!id) return;

      buttons.forEach((candidate) => candidate.classList.remove("active"));
      button.classList.add("active");
      onSelect(id);
    });
  });
}

async function hasAssistantEmbeddings(map: any): Promise<boolean> {
  if (!map?.portalItem) return false;

  const { resources } = await map.portalItem.fetchResources();
  return resources.some(
    (resource: any) => resource.resource?.path === "embeddings-v01.json"
  );
}

async function bootstrap(): Promise<void> {
  const statusEl = document.getElementById("app-status");

  try {
    // Step 1: Authenticate
    if (statusEl) statusEl.textContent = "Aanmelden bij ArcGIS Online...";
    await initAuth();

    // Step 2: Initialize map and layer
    if (statusEl) statusEl.textContent = "Kaart laden...";
    const { map, layer, statusField, basemapOptions } = await initMap();

    // Step 3: Attach map to the component
    const arcgisMap = document.querySelector("arcgis-map") as any;
    if (!arcgisMap) throw new Error("arcgis-map element not found");

    await map.load();

    arcgisMap.map = map;
    renderBasemapSwitcher(basemapOptions, (id) => {
      const option = basemapOptions.find((candidate) => candidate.id === id);
      if (!option) return;
      map.basemap = option.basemap;
    });
    if (!map.portalItem?.id) {
      arcgisMap.center = [5.9, 51.2];
      arcgisMap.zoom = 10;
    }

    // Step 4: Wait for view ready
    arcgisMap.addEventListener("arcgisViewReadyChange", async (event: any) => {
      const view = event.target.view;
      await view.when();
      await layer.load();

      // Remove service-defined types so Editor shows single "Maaitraject" template
      (layer as any).types = [];

      // --- Configure Editor component ---
      const editorEl = document.querySelector("arcgis-editor") as any;
      if (editorEl) {
        editorEl.layerInfos = [
          {
            layer,
            formTemplate: layer.formTemplate ?? undefined,
            enabled: true,
            addEnabled: true,
            updateEnabled: true,
            deleteEnabled: false,
          },
        ];
        editorEl.supportingWidgetDefaults = {
          sketch: {
            defaultUpdateOptions: {
              tool: "reshape",
              reshapeOptions: { shapeOperation: "none" },
              toggleToolOnClick: true,
            },
          },
        };
        editorEl.snappingOptions = { enabled: false };
      }

      // --- Configure Feature Table ---
      const tableEl = document.querySelector("arcgis-feature-table") as any;
      if (tableEl) {
        tableEl.layer = layer;
        tableEl.editingEnabled = true;
        tableEl.multiSortEnabled = true;
        tableEl.tableTemplate = {
          columnTemplates: [
            { type: "field", fieldName: "hoofdobjec", label: "Hoofdobject", direction: "asc" },
            { type: "field", fieldName: "model_type", label: "Model type" },
            { type: "field", fieldName: statusField, label: "Status" },
            { type: "field", fieldName: "Opmerking", label: "Opmerking" },
            { type: "field", fieldName: "Editor", label: "Bewerkt door" },
            { type: "field", fieldName: "EditDate", label: "Laatst bewerkt" },
          ],
        };
      }

      // --- Configure AI Assistant suggested prompts ---
      const webMapId = getConfiguredWebMapId();
      const assistantReady =
        !!map.portalItem?.id && (await hasAssistantEmbeddings(map).catch(() => false));

      if (assistantReady) {
        const assistantEl = renderAssistant();
        if (assistantEl) {
          assistantEl.suggestedPrompts = [
            "Hoeveel maaitrajecten hebben de status 'Controleren'?",
            "Welke trajecten hebben de status 'Afgekeurd'?",
            "Wat is het gemiddelde oppervlakte van alle trajecten?",
            "Toon alle trajecten van type P1_Waterkering",
          ];
        }
      } else {
        const message = webMapId
          ? "De geconfigureerde WebMap heeft nog geen AI embeddings-resource. Open de WebMap in ArcGIS Online/Map Viewer en doorloop daar de AI assistant embeddings-setup."
          : "Stel een bestaande ArcGIS Online WebMap in via VITE_ARCGIS_WEBMAP_ID. De ingebouwde data exploration agent werkt alleen met een echte WebMap portal item plus embeddings-resource.";
        renderAssistantUnavailable(
          message
        );
      }

      // --- Table resize + panel toggles ---
      initTableResize();
      initAssistantToggle();

      // --- Update table count ---
      const countEl = document.getElementById("table-count");
      if (countEl) {
        const count = await layer.queryFeatureCount();
        countEl.textContent = `${count.toLocaleString("nl-NL")} features`;
      }

      // --- Statistics ---
      const statsContainer = document.getElementById("stats-container");
      if (statsContainer) {
        const layerView = await view.whenLayerView(layer);
        const statsPanel = new StatisticsPanel(
          statsContainer,
          layer,
          statusField
        );
        await statsPanel.attachToLayerView(layerView);
      }

      // Hide loading status
      if (statusEl) statusEl.style.display = "none";
    });
  } catch (error: unknown) {
    console.error("Application error:", error);
    let message = "Onbekende fout";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    } else if (error && typeof error === "object") {
      message = JSON.stringify(error);
    }
    if (statusEl) {
      statusEl.textContent = `Fout: ${message}`;
      statusEl.classList.add("error");
    }
  }
}

bootstrap();
