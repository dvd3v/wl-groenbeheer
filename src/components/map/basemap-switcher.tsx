import type { BasemapOption } from "../../services/arcgis-map-config";
import { cn } from "../../lib/cn";

interface BasemapSwitcherProps {
  basemaps: BasemapOption[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function BasemapSwitcher({
  basemaps,
  activeId,
  onSelect,
}: BasemapSwitcherProps) {
  return (
    <div className="glass-panel absolute right-3 top-3 z-20 flex gap-1 rounded-[8px] p-1">
      {basemaps.map((basemap) => (
        <button
          key={basemap.id}
          type="button"
          onClick={() => onSelect(basemap.id)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-[10.5px] transition",
            basemap.id === activeId
              ? "bg-accentSoft font-medium text-accentStrong"
              : "text-textDim hover:bg-surfaceAlt"
          )}
        >
          {basemap.label}
        </button>
      ))}
    </div>
  );
}
