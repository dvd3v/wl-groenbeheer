import { PencilRuler, Plus } from "lucide-react";
import { Button } from "../ui/button";

interface MapToolbarProps {
  disabledEdit: boolean;
  onAddTraject: () => void;
  onEditShape: () => void;
}

export function MapToolbar({
  disabledEdit,
  onAddTraject,
  onEditShape,
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
    </div>
  );
}
