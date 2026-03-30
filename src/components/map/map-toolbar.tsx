import { PencilRuler, Plus } from "lucide-react";
import type { TrajectRendererMode } from "../../types/app";
import { Button } from "../ui/button";
import { NativeSelect } from "../ui/native-select";

interface MapToolbarProps {
  disabledEdit: boolean;
  rendererMode: TrajectRendererMode;
  onAddTraject: () => void;
  onEditShape: () => void;
  onRendererModeChange: (mode: TrajectRendererMode) => void;
}

export function MapToolbar({
  disabledEdit,
  rendererMode,
  onAddTraject,
  onEditShape,
  onRendererModeChange,
}: MapToolbarProps) {
  return (
    <div className="glass-panel absolute left-16 top-3 z-20 flex items-center gap-2 rounded-[10px] p-2 md:left-20">
      <Button onClick={onAddTraject}>
        <Plus className="h-3.5 w-3.5" />
        Add traject
      </Button>
      <Button variant="outline" onClick={onEditShape} disabled={disabledEdit}>
        <PencilRuler className="h-3.5 w-3.5" />
        Edit shape
      </Button>
      <div className="min-w-[180px]">
        <NativeSelect
          aria-label="Styleer trajecten op"
          value={rendererMode}
          onChange={(event) => onRendererModeChange(event.target.value as TrajectRendererMode)}
        >
          <option value="status">Style op status</option>
          <option value="type_codering">Style op type_codering</option>
        </NativeSelect>
      </div>
    </div>
  );
}
