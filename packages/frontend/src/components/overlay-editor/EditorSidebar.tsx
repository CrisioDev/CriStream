import type { OverlayLayoutConfig, OverlayElement, OverlayTextElement, OverlayImageElement } from "@streamguard/shared";
import { OVERLAY_FONTS } from "@streamguard/shared";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/color-picker";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

interface EditorSidebarProps {
  layout: OverlayLayoutConfig;
  selectedId: string | null;
  onUpdateCanvas: (patch: Partial<OverlayLayoutConfig["canvas"]>) => void;
  onUpdateElement: (id: string, patch: Partial<OverlayElement>) => void;
}

const TEXT_SHADOW_PRESETS = [
  { label: "None", value: "" },
  { label: "Drop Shadow", value: "2px 2px 4px rgba(0,0,0,0.8)" },
  { label: "Glow", value: "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5)" },
  { label: "Neon Blue", value: "0 0 10px #00f, 0 0 20px #00f, 0 0 40px #00f" },
  { label: "Neon Pink", value: "0 0 10px #f0f, 0 0 20px #f0f, 0 0 40px #f0f" },
  { label: "Heavy", value: "2px 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(100,65,255,0.5)" },
];

export function EditorSidebar({
  layout,
  selectedId,
  onUpdateCanvas,
  onUpdateElement,
}: EditorSidebarProps) {
  const selectedElement = selectedId
    ? layout.elements.find((el) => el.id === selectedId)
    : null;

  return (
    <div className="w-72 border-l border-border bg-card text-card-foreground overflow-y-auto p-4 space-y-4">
      {/* Canvas Settings */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Canvas</h3>
        <div>
          <Label className="text-xs">Background</Label>
          <ColorPicker
            value={layout.canvas.background}
            onChange={(v) => onUpdateCanvas({ background: v })}
          />
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 text-xs"
            onClick={() => onUpdateCanvas({ background: "transparent" })}
          >
            Set Transparent
          </Button>
        </div>
      </div>

      <hr className="border-border" />

      {/* Element Settings */}
      {selectedElement ? (
        selectedElement.type === "text" ? (
          <TextSettings
            element={selectedElement}
            onUpdate={(patch) => onUpdateElement(selectedElement.id, patch)}
          />
        ) : (
          <ImageSettings
            element={selectedElement}
            onUpdate={(patch) => onUpdateElement(selectedElement.id, patch)}
          />
        )
      ) : (
        <p className="text-sm text-muted-foreground">Select an element to edit its properties.</p>
      )}
    </div>
  );
}

function TextSettings({
  element,
  onUpdate,
}: {
  element: OverlayTextElement;
  onUpdate: (patch: Partial<OverlayTextElement>) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Text</h3>

      <div>
        <Label className="text-xs">Font Family</Label>
        <Select
          value={element.fontFamily}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
        >
          {OVERLAY_FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </Select>
      </div>

      <div>
        <Label className="text-xs">Font Size ({element.fontSize}px)</Label>
        <Slider
          value={element.fontSize}
          onChange={(v) => onUpdate({ fontSize: v })}
          min={12}
          max={96}
        />
      </div>

      <div className="flex gap-1">
        <Button
          size="sm"
          variant={element.fontWeight === "bold" ? "default" : "outline"}
          onClick={() =>
            onUpdate({ fontWeight: element.fontWeight === "bold" ? "normal" : "bold" })
          }
        >
          <Bold className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant={element.fontStyle === "italic" ? "default" : "outline"}
          onClick={() =>
            onUpdate({ fontStyle: element.fontStyle === "italic" ? "normal" : "italic" })
          }
        >
          <Italic className="h-3 w-3" />
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant={element.textAlign === "left" ? "default" : "outline"}
          onClick={() => onUpdate({ textAlign: "left" })}
        >
          <AlignLeft className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant={element.textAlign === "center" ? "default" : "outline"}
          onClick={() => onUpdate({ textAlign: "center" })}
        >
          <AlignCenter className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant={element.textAlign === "right" ? "default" : "outline"}
          onClick={() => onUpdate({ textAlign: "right" })}
        >
          <AlignRight className="h-3 w-3" />
        </Button>
      </div>

      <div>
        <Label className="text-xs">Text Color</Label>
        <ColorPicker
          value={element.color}
          onChange={(v) => onUpdate({ color: v })}
        />
      </div>

      <div>
        <Label className="text-xs">Text Shadow</Label>
        <Select
          value={
            TEXT_SHADOW_PRESETS.find((p) => p.value === element.textShadow)?.label ?? "Custom"
          }
          onChange={(e) => {
            const preset = TEXT_SHADOW_PRESETS.find((p) => p.label === e.target.value);
            if (preset) onUpdate({ textShadow: preset.value });
          }}
        >
          {TEXT_SHADOW_PRESETS.map((p) => (
            <option key={p.label} value={p.label}>{p.label}</option>
          ))}
          {!TEXT_SHADOW_PRESETS.find((p) => p.value === element.textShadow) && (
            <option value="Custom">Custom</option>
          )}
        </Select>
        <Input
          className="mt-1 text-xs"
          value={element.textShadow}
          onChange={(e) => onUpdate({ textShadow: e.target.value })}
          placeholder="e.g. 2px 2px 4px rgba(0,0,0,0.8)"
        />
      </div>

      <div>
        <Label className="text-xs">Text Stroke</Label>
        <Input
          className="text-xs"
          value={element.textStroke}
          onChange={(e) => onUpdate({ textStroke: e.target.value })}
          placeholder="e.g. 1px black"
        />
      </div>

      <div>
        <Label className="text-xs">Background Color</Label>
        <ColorPicker
          value={element.backgroundColor}
          onChange={(v) => onUpdate({ backgroundColor: v })}
        />
        <Button
          size="sm"
          variant="ghost"
          className="mt-1 text-xs"
          onClick={() => onUpdate({ backgroundColor: "transparent" })}
        >
          Set Transparent
        </Button>
      </div>

      <div>
        <Label className="text-xs">Padding ({element.padding}px)</Label>
        <Slider
          value={element.padding}
          onChange={(v) => onUpdate({ padding: v })}
          min={0}
          max={40}
        />
      </div>

      <div>
        <Label className="text-xs">Border Radius ({element.borderRadius}px)</Label>
        <Slider
          value={element.borderRadius}
          onChange={(v) => onUpdate({ borderRadius: v })}
          min={0}
          max={50}
        />
      </div>

      <PositionInputs element={element} onUpdate={onUpdate} />
    </div>
  );
}

function ImageSettings({
  element,
  onUpdate,
}: {
  element: OverlayImageElement;
  onUpdate: (patch: Partial<OverlayImageElement>) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Image</h3>

      <div>
        <Label className="text-xs">Border Radius ({element.borderRadius}px)</Label>
        <Slider
          value={element.borderRadius}
          onChange={(v) => onUpdate({ borderRadius: v })}
          min={0}
          max={150}
        />
      </div>

      <div>
        <Label className="text-xs">Border Width ({element.borderWidth}px)</Label>
        <Slider
          value={element.borderWidth}
          onChange={(v) => onUpdate({ borderWidth: v })}
          min={0}
          max={10}
        />
      </div>

      <div>
        <Label className="text-xs">Border Color</Label>
        <ColorPicker
          value={element.borderColor}
          onChange={(v) => onUpdate({ borderColor: v })}
        />
      </div>

      <div>
        <Label className="text-xs">Object Fit</Label>
        <Select
          value={element.objectFit}
          onChange={(e) =>
            onUpdate({ objectFit: e.target.value as "contain" | "cover" | "fill" })
          }
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="fill">Fill</option>
        </Select>
      </div>

      <PositionInputs element={element} onUpdate={onUpdate} />
    </div>
  );
}

function PositionInputs({
  element,
  onUpdate,
}: {
  element: { x: number; y: number; width: number; height: number; zIndex: number };
  onUpdate: (patch: any) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground mt-2">Position & Size</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">X</Label>
          <Input
            type="number"
            className="text-xs"
            value={element.x}
            onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label className="text-xs">Y</Label>
          <Input
            type="number"
            className="text-xs"
            value={element.y}
            onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label className="text-xs">Width</Label>
          <Input
            type="number"
            className="text-xs"
            value={element.width}
            onChange={(e) => onUpdate({ width: Math.max(30, parseInt(e.target.value) || 30) })}
          />
        </div>
        <div>
          <Label className="text-xs">Height</Label>
          <Input
            type="number"
            className="text-xs"
            value={element.height}
            onChange={(e) => onUpdate({ height: Math.max(20, parseInt(e.target.value) || 20) })}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Z-Index</Label>
        <Input
          type="number"
          className="text-xs"
          value={element.zIndex}
          onChange={(e) => onUpdate({ zIndex: parseInt(e.target.value) || 0 })}
        />
      </div>
    </div>
  );
}
