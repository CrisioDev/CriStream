import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/ui/color-picker";
import { FileUpload } from "@/components/FileUpload";
import {
  Type,
  Image,
  Video,
  Trash2,
  Eye,
  EyeOff,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Layers,
  Copy,
  ChevronUp,
  ChevronDown,
  Monitor,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/api/client";
import { OVERLAY_FONTS } from "@cristream/shared";
import type { SandboxElement } from "@cristream/shared";

let idCounter = 0;
function makeId() {
  return "sb_" + Date.now().toString(36) + "_" + (++idCounter);
}

const TEXT_SHADOW_PRESETS = [
  { label: "None", value: "" },
  { label: "Drop Shadow", value: "2px 2px 4px rgba(0,0,0,0.8)" },
  { label: "Glow", value: "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5)" },
  { label: "Neon Blue", value: "0 0 10px #00f, 0 0 20px #00f, 0 0 40px #00f" },
  { label: "Neon Pink", value: "0 0 10px #f0f, 0 0 20px #f0f, 0 0 40px #f0f" },
];

const CANVAS_W = 1920;
const CANVAS_H = 1080;

export function SandboxPage() {
  const { activeChannel: channel } = useAuthStore();
  const { emit } = useSocket(channel?.id);

  const [elements, setElements] = useState<SandboxElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch stream preview thumbnail
  useEffect(() => {
    if (!showPreview || !channel) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    const fetchPreview = async () => {
      setPreviewLoading(true);
      const res = await api.get<{ live: boolean; thumbnailUrl: string | null }>(
        `/channels/${channel.id}/stream-preview`
      );
      if (cancelled) return;
      setPreviewLoading(false);
      if (res.data?.live && res.data.thumbnailUrl) {
        setPreviewUrl(res.data.thumbnailUrl);
      } else {
        setPreviewUrl(null);
      }
    };
    fetchPreview();
    const interval = setInterval(fetchPreview, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [showPreview, channel]);

  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestElementsRef = useRef(elements);
  latestElementsRef.current = elements;

  const scheduleEmit = useCallback(
    (nextElements: SandboxElement[]) => {
      if (!channel) return;
      if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
      emitTimerRef.current = setTimeout(() => {
        emit("sandbox:update", { channelId: channel.id, elements: nextElements });
      }, 80);
    },
    [channel, emit]
  );

  const updateElements = useCallback(
    (updater: (prev: SandboxElement[]) => SandboxElement[]) => {
      setElements((prev) => {
        const next = updater(prev);
        scheduleEmit(next);
        return next;
      });
    },
    [scheduleEmit]
  );

  const addElement = useCallback(
    (type: SandboxElement["type"]) => {
      const base: SandboxElement = {
        id: makeId(),
        type,
        x: 100,
        y: 100,
        width: type === "text" ? 400 : 300,
        height: type === "text" ? 60 : 300,
        zIndex: elements.length + 1,
        visible: true,
      };
      if (type === "text") {
        base.content = "New Text";
        base.fontFamily = "Segoe UI";
        base.fontSize = 32;
        base.fontWeight = "normal";
        base.fontStyle = "normal";
        base.color = "#ffffff";
        base.textAlign = "center";
        base.textShadow = "";
        base.backgroundColor = "transparent";
        base.padding = 8;
        base.borderRadius = 0;
      } else {
        base.objectFit = "contain";
        base.borderWidth = 0;
        base.borderColor = "#ffffff";
        base.borderRadius = 0;
        if (type === "video") {
          base.videoMuted = true;
          base.videoLoop = true;
        }
      }
      updateElements((prev) => [...prev, base]);
      setSelectedId(base.id);
    },
    [elements.length, updateElements]
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<SandboxElement>) => {
      updateElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...patch } : el))
      );
    },
    [updateElements]
  );

  const removeElement = useCallback(
    (id: string) => {
      updateElements((prev) => prev.filter((el) => el.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [updateElements, selectedId]
  );

  const duplicateElement = useCallback(
    (id: string) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      const newEl = { ...el, id: makeId(), x: el.x + 20, y: el.y + 20 };
      updateElements((prev) => [...prev, newEl]);
      setSelectedId(newEl.id);
    },
    [elements, updateElements]
  );

  const clearAll = useCallback(() => {
    setElements([]);
    setSelectedId(null);
    if (channel) {
      emit("sandbox:clear", { channelId: channel.id });
    }
  }, [channel, emit]);

  const moveZIndex = useCallback(
    (id: string, direction: "up" | "down") => {
      updateElements((prev) => {
        const idx = prev.findIndex((e) => e.id === id);
        if (idx === -1) return prev;
        const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
        const sIdx = sorted.findIndex((e) => e.id === id);
        if (direction === "up" && sIdx < sorted.length - 1) {
          const swapZ = sorted[sIdx + 1].zIndex;
          return prev.map((e) => {
            if (e.id === id) return { ...e, zIndex: swapZ };
            if (e.id === sorted[sIdx + 1].id) return { ...e, zIndex: sorted[sIdx].zIndex };
            return e;
          });
        }
        if (direction === "down" && sIdx > 0) {
          const swapZ = sorted[sIdx - 1].zIndex;
          return prev.map((e) => {
            if (e.id === id) return { ...e, zIndex: swapZ };
            if (e.id === sorted[sIdx - 1].id) return { ...e, zIndex: sorted[sIdx].zIndex };
            return e;
          });
        }
        return prev;
      });
    },
    [updateElements]
  );

  const selectedElement = selectedId ? elements.find((e) => e.id === selectedId) ?? null : null;

  if (!channel) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">Live Sandbox</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => addElement("text")}>
            <Type className="h-3 w-3 mr-1" /> Text
          </Button>
          <Button size="sm" variant="outline" onClick={() => addElement("image")}>
            <Image className="h-3 w-3 mr-1" /> Image
          </Button>
          <Button size="sm" variant="outline" onClick={() => addElement("video")}>
            <Video className="h-3 w-3 mr-1" /> Video
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            size="sm"
            variant={showPreview ? "default" : "outline"}
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? "Hide stream preview" : "Show stream preview as background"}
          >
            <Monitor className="h-3 w-3 mr-1" />
            {previewLoading ? "Loading..." : showPreview && previewUrl ? "Preview On" : showPreview && !previewUrl ? "Offline" : "Stream Preview"}
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button size="sm" variant="destructive" onClick={clearAll} disabled={elements.length === 0}>
            <Trash2 className="h-3 w-3 mr-1" /> Clear All
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <SandboxCanvas
          elements={elements}
          selectedId={selectedId}
          previewUrl={previewUrl}
          onSelect={setSelectedId}
          onUpdateElement={updateElement}
        />
        <SandboxSidebar
          element={selectedElement}
          elements={elements}
          channelId={channel.id}
          onUpdate={(patch) => selectedId && updateElement(selectedId, patch)}
          onRemove={() => selectedId && removeElement(selectedId)}
          onDuplicate={() => selectedId && duplicateElement(selectedId)}
          onToggleVisible={() => {
            if (selectedElement) {
              updateElement(selectedElement.id, { visible: !selectedElement.visible });
            }
          }}
          onMoveZ={(dir) => selectedId && moveZIndex(selectedId, dir)}
          onSelect={setSelectedId}
        />
      </div>
    </div>
  );
}

// ── Canvas ──

function SandboxCanvas({
  elements,
  selectedId,
  previewUrl,
  onSelect,
  onUpdateElement,
}: {
  elements: SandboxElement[];
  selectedId: string | null;
  previewUrl: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, patch: Partial<SandboxElement>) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setScale(Math.min(width / CANVAS_W, height / CANVAS_H, 1));
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="flex-1 flex items-center justify-center overflow-hidden p-4">
      <div style={{ width: CANVAS_W * scale, height: CANVAS_H * scale, flexShrink: 0 }}>
        <div
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "relative",
            background: previewUrl
              ? `url(${previewUrl}) center/cover no-repeat`
              : "repeating-conic-gradient(#808080 0% 25%, #a0a0a0 0% 50%) 50% / 20px 20px",
            borderRadius: 4,
            boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onSelect(null);
          }}
        >
          {elements.map((el) => (
            <SandboxElementView
              key={el.id}
              element={el}
              selected={el.id === selectedId}
              scale={scale}
              onSelect={() => onSelect(el.id)}
              onUpdate={(patch) => onUpdateElement(el.id, patch)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Element View ──

function SandboxElementView({
  element,
  selected,
  scale,
  onSelect,
  onUpdate,
}: {
  element: SandboxElement;
  selected: boolean;
  scale: number;
  onSelect: () => void;
  onUpdate: (patch: Partial<SandboxElement>) => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number; elX: number; elY: number } | null>(null);
  const resizeRef = useRef<{
    corner: string;
    startX: number;
    startY: number;
    elX: number;
    elY: number;
    elW: number;
    elH: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      onSelect();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, elX: element.x, elY: element.y };
    },
    [element.x, element.y, onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (resizeRef.current) {
        const r = resizeRef.current;
        const dx = (e.clientX - r.startX) / scale;
        const dy = (e.clientY - r.startY) / scale;
        let newX = r.elX, newY = r.elY, newW = r.elW, newH = r.elH;
        if (r.corner.includes("r")) newW = Math.max(30, r.elW + dx);
        if (r.corner.includes("b")) newH = Math.max(20, r.elH + dy);
        if (r.corner.includes("l")) { newW = Math.max(30, r.elW - dx); newX = r.elX + (r.elW - newW); }
        if (r.corner.includes("t")) { newH = Math.max(20, r.elH - dy); newY = r.elY + (r.elH - newH); }
        onUpdate({ x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) });
        return;
      }
      if (dragRef.current) {
        const d = dragRef.current;
        onUpdate({ x: Math.round(d.elX + (e.clientX - d.startX) / scale), y: Math.round(d.elY + (e.clientY - d.startY) / scale) });
      }
    },
    [scale, onUpdate]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  const handleResizeDown = useCallback(
    (corner: string, e: React.PointerEvent) => {
      e.stopPropagation();
      onSelect();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      resizeRef.current = {
        corner,
        startX: e.clientX,
        startY: e.clientY,
        elX: element.x,
        elY: element.y,
        elW: element.width,
        elH: element.height,
      };
    },
    [element.x, element.y, element.width, element.height, onSelect]
  );

  const corners = ["tl", "tr", "bl", "br"];
  const cornerPos: Record<string, React.CSSProperties> = {
    tl: { top: -4, left: -4, cursor: "nwse-resize" },
    tr: { top: -4, right: -4, cursor: "nesw-resize" },
    bl: { bottom: -4, left: -4, cursor: "nesw-resize" },
    br: { bottom: -4, right: -4, cursor: "nwse-resize" },
  };

  const opacity = element.visible ? 1 : 0.3;

  return (
    <div
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        cursor: "move",
        outline: selected ? "2px solid #3b82f6" : "1px dashed rgba(255,255,255,0.3)",
        opacity,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {element.type === "text" ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            fontFamily: `'${element.fontFamily || "Segoe UI"}', sans-serif`,
            fontSize: element.fontSize || 24,
            fontWeight: element.fontWeight || "normal",
            fontStyle: element.fontStyle || "normal",
            color: element.color || "#ffffff",
            textAlign: element.textAlign || "left",
            textShadow: element.textShadow || "none",
            background: element.backgroundColor || "transparent",
            padding: element.padding || 0,
            borderRadius: element.borderRadius || 0,
            display: "flex",
            alignItems: "center",
            justifyContent: element.textAlign === "right" ? "flex-end" : element.textAlign === "center" ? "center" : "flex-start",
            overflow: "hidden",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            pointerEvents: "none",
          }}
        >
          {element.content || ""}
        </div>
      ) : element.type === "video" && element.src ? (
        <video
          src={element.src}
          autoPlay
          loop={element.videoLoop !== false}
          muted={element.videoMuted !== false}
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: element.objectFit || "contain",
            borderRadius: element.borderRadius || 0,
            border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor || "#fff"}` : "none",
            pointerEvents: "none",
          }}
        />
      ) : element.type === "image" && element.src ? (
        <img
          src={element.src}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: element.objectFit || "contain",
            borderRadius: element.borderRadius || 0,
            border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor || "#fff"}` : "none",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#333",
            borderRadius: element.borderRadius || 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
            fontSize: 14,
            pointerEvents: "none",
          }}
        >
          {element.type === "video" ? "Video" : "Image"}
        </div>
      )}

      {selected &&
        corners.map((c) => (
          <div
            key={c}
            style={{
              position: "absolute",
              width: 8,
              height: 8,
              background: "#3b82f6",
              border: "1px solid white",
              ...cornerPos[c],
              zIndex: 10000,
              pointerEvents: "auto",
            }}
            onPointerDown={(e) => handleResizeDown(c, e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        ))}
    </div>
  );
}

// ── Sidebar ──

function SandboxSidebar({
  element,
  elements,
  channelId,
  onUpdate,
  onRemove,
  onDuplicate,
  onToggleVisible,
  onMoveZ,
  onSelect,
}: {
  element: SandboxElement | null;
  elements: SandboxElement[];
  channelId: string;
  onUpdate: (patch: Partial<SandboxElement>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onToggleVisible: () => void;
  onMoveZ: (dir: "up" | "down") => void;
  onSelect: (id: string | null) => void;
}) {
  const uploadMedia = async (type: "image" | "video", file: File) => {
    const uploadType = type === "video" ? "video" : "image";
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/channels/${channelId}/uploads/${uploadType}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      onUpdate({ src: data.data.url });
    }
  };

  return (
    <div className="w-72 border-l border-border bg-card text-card-foreground overflow-y-auto p-4 space-y-4 shrink-0">
      {/* Layer List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Layers className="h-3 w-3" /> Layers
        </h3>
        {elements.length === 0 && (
          <p className="text-xs text-muted-foreground">No elements yet. Add text, images, or videos using the toolbar.</p>
        )}
        {[...elements]
          .sort((a, b) => b.zIndex - a.zIndex)
          .map((el) => (
            <button
              key={el.id}
              onClick={() => onSelect(el.id)}
              className={`flex items-center gap-2 w-full rounded px-2 py-1 text-xs text-left transition-colors ${
                element?.id === el.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {el.type === "text" ? <Type className="h-3 w-3 shrink-0" /> : el.type === "image" ? <Image className="h-3 w-3 shrink-0" /> : <Video className="h-3 w-3 shrink-0" />}
              <span className="truncate flex-1">
                {el.type === "text" ? (el.content || "Text").slice(0, 20) : el.type === "image" ? "Image" : "Video"}
              </span>
              {!el.visible && <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />}
            </button>
          ))}
      </div>

      <hr className="border-border" />

      {element ? (
        <>
          {/* Element actions */}
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={onToggleVisible} title={element.visible ? "Hide" : "Show"}>
              {element.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="outline" onClick={onDuplicate} title="Duplicate">
              <Copy className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => onMoveZ("up")} title="Move Up">
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => onMoveZ("down")} title="Move Down">
              <ChevronDown className="h-3 w-3" />
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="destructive" onClick={onRemove} title="Delete">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {element.type === "text" && (
            <TextProperties element={element} onUpdate={onUpdate} />
          )}
          {(element.type === "image" || element.type === "video") && (
            <MediaProperties element={element} onUpdate={onUpdate} onUpload={uploadMedia} />
          )}

          <PositionProperties element={element} onUpdate={onUpdate} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Select an element to edit its properties.</p>
      )}
    </div>
  );
}

// ── Text Properties ──

function TextProperties({
  element,
  onUpdate,
}: {
  element: SandboxElement;
  onUpdate: (patch: Partial<SandboxElement>) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Text</h3>

      <div>
        <Label className="text-xs">Content</Label>
        <textarea
          className="w-full rounded-md border bg-background text-foreground px-2 py-1 text-sm min-h-[60px] resize-y"
          value={element.content || ""}
          onChange={(e) => onUpdate({ content: e.target.value })}
        />
      </div>

      <div>
        <Label className="text-xs">Font Family</Label>
        <Select value={element.fontFamily || "Segoe UI"} onChange={(e) => onUpdate({ fontFamily: e.target.value })}>
          {OVERLAY_FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </Select>
      </div>

      <div>
        <Label className="text-xs">Font Size ({element.fontSize || 24}px)</Label>
        <Slider value={element.fontSize || 24} onChange={(v) => onUpdate({ fontSize: v })} min={8} max={120} />
      </div>

      <div className="flex gap-1">
        <Button size="sm" variant={element.fontWeight === "bold" ? "default" : "outline"} onClick={() => onUpdate({ fontWeight: element.fontWeight === "bold" ? "normal" : "bold" })}>
          <Bold className="h-3 w-3" />
        </Button>
        <Button size="sm" variant={element.fontStyle === "italic" ? "default" : "outline"} onClick={() => onUpdate({ fontStyle: element.fontStyle === "italic" ? "normal" : "italic" })}>
          <Italic className="h-3 w-3" />
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant={element.textAlign === "left" ? "default" : "outline"} onClick={() => onUpdate({ textAlign: "left" })}>
          <AlignLeft className="h-3 w-3" />
        </Button>
        <Button size="sm" variant={element.textAlign === "center" ? "default" : "outline"} onClick={() => onUpdate({ textAlign: "center" })}>
          <AlignCenter className="h-3 w-3" />
        </Button>
        <Button size="sm" variant={element.textAlign === "right" ? "default" : "outline"} onClick={() => onUpdate({ textAlign: "right" })}>
          <AlignRight className="h-3 w-3" />
        </Button>
      </div>

      <div>
        <Label className="text-xs">Text Color</Label>
        <ColorPicker value={element.color || "#ffffff"} onChange={(v) => onUpdate({ color: v })} />
      </div>

      <div>
        <Label className="text-xs">Text Shadow</Label>
        <Select
          value={TEXT_SHADOW_PRESETS.find((p) => p.value === element.textShadow)?.label ?? "Custom"}
          onChange={(e) => {
            const preset = TEXT_SHADOW_PRESETS.find((p) => p.label === e.target.value);
            if (preset) onUpdate({ textShadow: preset.value });
          }}
        >
          {TEXT_SHADOW_PRESETS.map((p) => (
            <option key={p.label} value={p.label}>{p.label}</option>
          ))}
          {!TEXT_SHADOW_PRESETS.find((p) => p.value === element.textShadow) && <option value="Custom">Custom</option>}
        </Select>
      </div>

      <div>
        <Label className="text-xs">Background Color</Label>
        <ColorPicker value={element.backgroundColor || "transparent"} onChange={(v) => onUpdate({ backgroundColor: v })} />
        <Button size="sm" variant="ghost" className="mt-1 text-xs" onClick={() => onUpdate({ backgroundColor: "transparent" })}>
          Set Transparent
        </Button>
      </div>

      <div>
        <Label className="text-xs">Padding ({element.padding || 0}px)</Label>
        <Slider value={element.padding || 0} onChange={(v) => onUpdate({ padding: v })} min={0} max={40} />
      </div>

      <div>
        <Label className="text-xs">Border Radius ({element.borderRadius || 0}px)</Label>
        <Slider value={element.borderRadius || 0} onChange={(v) => onUpdate({ borderRadius: v })} min={0} max={50} />
      </div>
    </div>
  );
}

// ── Media Properties ──

function MediaProperties({
  element,
  onUpdate,
  onUpload,
}: {
  element: SandboxElement;
  onUpdate: (patch: Partial<SandboxElement>) => void;
  onUpload: (type: "image" | "video", file: File) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {element.type === "video" ? "Video" : "Image"}
      </h3>

      <div>
        <Label className="text-xs">Source URL</Label>
        <Input
          className="text-xs"
          value={element.src || ""}
          onChange={(e) => onUpdate({ src: e.target.value })}
          placeholder="https://... or /uploads/..."
        />
      </div>

      <FileUpload
        accept={element.type === "video" ? "video/mp4,video/webm" : "image/*"}
        label={`Upload ${element.type === "video" ? "Video" : "Image"}`}
        onUpload={(file) => onUpload(element.type as "image" | "video", file)}
      />

      <div>
        <Label className="text-xs">Object Fit</Label>
        <Select value={element.objectFit || "contain"} onChange={(e) => onUpdate({ objectFit: e.target.value as "contain" | "cover" | "fill" })}>
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="fill">Fill</option>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Border Radius ({element.borderRadius || 0}px)</Label>
        <Slider value={element.borderRadius || 0} onChange={(v) => onUpdate({ borderRadius: v })} min={0} max={150} />
      </div>

      <div>
        <Label className="text-xs">Border Width ({element.borderWidth || 0}px)</Label>
        <Slider value={element.borderWidth || 0} onChange={(v) => onUpdate({ borderWidth: v })} min={0} max={10} />
      </div>

      {(element.borderWidth ?? 0) > 0 && (
        <div>
          <Label className="text-xs">Border Color</Label>
          <ColorPicker value={element.borderColor || "#ffffff"} onChange={(v) => onUpdate({ borderColor: v })} />
        </div>
      )}

      {element.type === "video" && (
        <>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Muted</Label>
            <Switch checked={element.videoMuted !== false} onCheckedChange={(v) => onUpdate({ videoMuted: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Loop</Label>
            <Switch checked={element.videoLoop !== false} onCheckedChange={(v) => onUpdate({ videoLoop: v })} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Position Properties ──

function PositionProperties({
  element,
  onUpdate,
}: {
  element: SandboxElement;
  onUpdate: (patch: Partial<SandboxElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground mt-2 uppercase tracking-wider">Position & Size</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">X</Label>
          <Input type="number" className="text-xs" value={element.x} onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <Label className="text-xs">Y</Label>
          <Input type="number" className="text-xs" value={element.y} onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <Label className="text-xs">Width</Label>
          <Input type="number" className="text-xs" value={element.width} onChange={(e) => onUpdate({ width: Math.max(30, parseInt(e.target.value) || 30) })} />
        </div>
        <div>
          <Label className="text-xs">Height</Label>
          <Input type="number" className="text-xs" value={element.height} onChange={(e) => onUpdate({ height: Math.max(20, parseInt(e.target.value) || 20) })} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Z-Index</Label>
        <Input type="number" className="text-xs" value={element.zIndex} onChange={(e) => onUpdate({ zIndex: parseInt(e.target.value) || 0 })} />
      </div>
    </div>
  );
}
