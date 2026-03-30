import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import Portal from "@arcgis/core/portal/Portal.js";
import PortalItem from "@arcgis/core/portal/PortalItem.js";
import type MapView from "@arcgis/core/views/MapView.js";
import WebMap from "@arcgis/core/WebMap.js";
import { Bot, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { arcgisAuthService } from "../../services/arcgis-auth-service";

type ArcgisMapElement = HTMLElement & {
  map?: WebMap;
  view?: MapView;
};

type ArcgisAssistantElement = HTMLElement & {
  referenceElement?: ArcgisMapElement | string | null;
  suggestedPrompts?: string[];
};

interface AiAssistantOverlayProps {
  view: MapView;
}

const SUGGESTED_PROMPTS = [
  "Hoeveel trajecten hebben de status Correct?",
  "Welke trajecten staan nog op Controleren?",
  "Zoom naar trajecten met status Afgekeurd.",
];

async function hasAssistantEmbeddings(webMap: WebMap): Promise<boolean> {
  if (!webMap.portalItem) {
    return false;
  }

  const { resources } = await webMap.portalItem.fetchResources();
  return resources.some(
    (resource) => resource.resource.path === "embeddings-v01.json"
  );
}

export function AiAssistantOverlay({ view }: AiAssistantOverlayProps) {
  const proxyMapRef = useRef<ArcgisMapElement | null>(null);
  const assistantRef = useRef<ArcgisAssistantElement | null>(null);
  const proxyViewRef = useRef<MapView | null>(null);
  const syncingFromVisibleRef = useRef(false);
  const syncingFromProxyRef = useRef(false);
  const proxyWebMapRef = useRef<WebMap | null>(null);
  const [open, setOpen] = useState(false);
  const [assistantState, setAssistantState] = useState<"loading" | "ready" | "unavailable">(
    "loading"
  );
  const [assistantMessage, setAssistantMessage] = useState(
    "AI assistent laden..."
  );

  useEffect(() => {
    const proxyElement = proxyMapRef.current;
    if (!proxyElement) {
      return;
    }
    let active = true;

    async function initProxyMap() {
      const webMapId = import.meta.env.VITE_ARCGIS_WEBMAP_ID?.trim();
      if (!webMapId) {
        setAssistantState("unavailable");
        setAssistantMessage(
          "VITE_ARCGIS_WEBMAP_ID ontbreekt. De AI assistent heeft een ArcGIS WebMap nodig."
        );
        return;
      }

      try {
        const portal = new Portal({ url: arcgisAuthService.getPortalUrl() });
        await portal.load();

        const webMap = new WebMap({
          portalItem: new PortalItem({
            id: webMapId,
            portal,
          }),
        });

        await webMap.load();

        if (!active) {
          return;
        }

        const embeddingsAvailable = await hasAssistantEmbeddings(webMap).catch(() => false);
        if (!embeddingsAvailable) {
          setAssistantState("unavailable");
          setAssistantMessage(
            "De geconfigureerde WebMap heeft nog geen AI embeddings-resource."
          );
        } else {
          setAssistantState("ready");
          setAssistantMessage("");
        }

        proxyWebMapRef.current = webMap;
        proxyMapRef.current?.setAttribute("data-assistant-proxy", "true");
        proxyMapRef.current!.map = webMap;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "AI assistent kon niet worden geladen.";
        setAssistantState("unavailable");
        setAssistantMessage(message);
      }
    }

    void initProxyMap();

    const syncToProxy = () => {
      if (!proxyViewRef.current || syncingFromProxyRef.current) {
        return;
      }

      syncingFromVisibleRef.current = true;
      proxyViewRef.current.viewpoint = view.viewpoint.clone();
      queueMicrotask(() => {
        syncingFromVisibleRef.current = false;
      });
    };

    const onProxyReady = () => {
      if (!proxyElement.view) {
        return;
      }

      proxyViewRef.current = proxyElement.view;
      proxyViewRef.current.viewpoint = view.viewpoint.clone();

      const proxyWatch = reactiveUtils.watch(
        () => [
          proxyViewRef.current?.center?.x,
          proxyViewRef.current?.center?.y,
          proxyViewRef.current?.scale,
          proxyViewRef.current?.rotation,
        ],
        () => {
          if (!proxyViewRef.current || syncingFromVisibleRef.current) {
            return;
          }

          syncingFromProxyRef.current = true;
          view.viewpoint = proxyViewRef.current.viewpoint.clone();
          queueMicrotask(() => {
            syncingFromProxyRef.current = false;
          });
        }
      );

      const visibleWatch = reactiveUtils.watch(
        () => [view.center?.x, view.center?.y, view.scale, view.rotation],
        syncToProxy
      );

      return () => {
        proxyWatch.remove();
        visibleWatch.remove();
      };
    };

    let cleanup: (() => void) | undefined;
    const handleReady = () => {
      cleanup = onProxyReady();
    };

    proxyElement.addEventListener("arcgisViewReadyChange", handleReady);

    return () => {
      active = false;
      proxyElement.removeEventListener("arcgisViewReadyChange", handleReady);
      cleanup?.();
      proxyViewRef.current = null;
    };
  }, [view]);

  useEffect(() => {
    if (!assistantRef.current || !proxyMapRef.current) {
      return;
    }

    assistantRef.current.referenceElement = proxyMapRef.current;
    assistantRef.current.suggestedPrompts = SUGGESTED_PROMPTS;
  }, [open]);

  return (
    <>
      <arcgis-map
        ref={proxyMapRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-3">
        {open ? (
          <div className="w-[min(92vw,420px)] overflow-hidden rounded-[22px] border border-border bg-white shadow-[0_25px_70px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accentSoft text-accentStrong">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-text">
                    Groenbeheer Assistent
                  </div>
                  <div className="text-[11px] text-textMuted">
                    Stel vragen over trajecten, status en kaartnavigatie
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 rounded-full p-0"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {assistantState === "ready" ? (
              <div className="h-[min(68vh,560px)]">
                <arcgis-assistant
                  ref={assistantRef}
                  heading="Groenbeheer Assistent"
                  description="Verken trajecten met AI en laat de kaart voor je navigeren."
                  entry-message="Hallo! Ik help je met vragen over trajectstatussen, objecten en locaties."
                  log-enabled
                  copy-enabled
                >
                  <arcgis-assistant-data-exploration-agent />
                  <arcgis-assistant-navigation-agent />
                  <arcgis-assistant-help-agent />
                </arcgis-assistant>
              </div>
            ) : (
              <div className="p-4 text-[12px] text-textDim">
                {assistantState === "loading" ? "AI assistent laden..." : assistantMessage}
              </div>
            )}
          </div>
        ) : null}

        <button
          type="button"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/20 bg-accent text-white shadow-[0_18px_40px_rgba(14,165,233,0.35)] transition hover:scale-[1.02] hover:bg-accentStrong"
          onClick={() => setOpen((current) => !current)}
          aria-label="Open AI assistent"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}
