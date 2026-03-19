import { useCallback, useEffect, useRef, useState } from "react";
import type { OverlayLayoutConfig, AlertSettingsDto } from "@streamguard/shared";
import { ANIMATION_TYPES } from "@streamguard/shared";
import { Button } from "@/components/ui/button";
import { useEditorState } from "./useEditorState";
import { EditorCanvas } from "./EditorCanvas";
import { EditorSidebar } from "./EditorSidebar";
import { Undo2, RotateCcw, Eye, Save, X } from "lucide-react";

interface OverlayEditorProps {
  alert: AlertSettingsDto;
  onSave: (layoutConfig: OverlayLayoutConfig) => Promise<void>;
  onClose: () => void;
}

export function OverlayEditor({ alert, onSave, onClose }: OverlayEditorProps) {
  const {
    layout,
    selectedId,
    isDirty,
    canUndo,
    updateElement,
    updateCanvas,
    setSelectedId,
    undo,
    resetToDefault,
  } = useEditorState(alert.layoutConfig);

  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const previewText = alert.textTemplate
    .replace("{user}", "TestUser")
    .replace("{amount}", "5")
    .replace("{reward}", "TestReward");

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(layout);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [layout, onSave, onClose]);

  const handlePreview = useCallback(() => {
    setPreviewing(true);
    const anim = alert.animationType || "fade";

    if (previewRef.current) {
      const el = previewRef.current;
      el.className = "preview-overlay anim-" + anim + "-in";

      setTimeout(() => {
        el.className = "preview-overlay anim-" + anim + "-out";
        setTimeout(() => {
          el.className = "preview-overlay";
          setPreviewing(false);
        }, 600);
      }, (alert.duration || 5) * 1000);
    }
  }, [alert.animationType, alert.duration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.key === "Escape") {
        if (selectedId) {
          setSelectedId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, selectedId, setSelectedId, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col dark text-foreground">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold capitalize">{alert.alertType} Layout Editor</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!canUndo}
            onClick={undo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3 w-3 mr-1" /> Undo
          </Button>
          <Button size="sm" variant="outline" onClick={resetToDefault}>
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePreview}
            disabled={previewing}
          >
            <Eye className="h-3 w-3 mr-1" /> Preview
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <EditorCanvas
          layout={layout}
          selectedId={selectedId}
          imageUrl={alert.imageFileUrl || undefined}
          previewText={previewText}
          onSelect={setSelectedId}
          onUpdateElement={updateElement}
        />
        <EditorSidebar
          layout={layout}
          selectedId={selectedId}
          onUpdateCanvas={updateCanvas}
          onUpdateElement={updateElement}
        />
      </div>

      {/* Preview animation overlay */}
      {previewing && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
          <style>{`
            @keyframes slideIn { from { transform: translateY(-100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes slideOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100px); opacity: 0; } }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.1); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }
            @keyframes bounceOut { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.3); opacity: 0; } }
            @keyframes zoomIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes zoomOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0); opacity: 0; } }
            .anim-slide-in { animation: slideIn 0.5s ease-out forwards; }
            .anim-slide-out { animation: slideOut 0.5s ease-in forwards; }
            .anim-fade-in { animation: fadeIn 0.5s ease-out forwards; }
            .anim-fade-out { animation: fadeOut 0.5s ease-in forwards; }
            .anim-bounce-in { animation: bounceIn 0.6s ease-out forwards; }
            .anim-bounce-out { animation: bounceOut 0.4s ease-in forwards; }
            .anim-zoom-in { animation: zoomIn 0.4s ease-out forwards; }
            .anim-zoom-out { animation: zoomOut 0.4s ease-in forwards; }
          `}</style>
          <div
            ref={previewRef}
            className="preview-overlay"
            style={{
              width: layout.canvas.width,
              height: layout.canvas.height,
              position: "relative",
            }}
          >
            {layout.elements
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((el) => {
                if (el.type === "image") {
                  if (!alert.imageFileUrl) return null;
                  return (
                    <img
                      key={el.id}
                      src={alert.imageFileUrl}
                      alt=""
                      style={{
                        position: "absolute",
                        left: el.x,
                        top: el.y,
                        width: el.width,
                        height: el.height,
                        zIndex: el.zIndex,
                        borderRadius: el.borderRadius,
                        objectFit: el.objectFit,
                        border: el.borderWidth
                          ? `${el.borderWidth}px solid ${el.borderColor}`
                          : "none",
                      }}
                    />
                  );
                }
                return (
                  <div
                    key={el.id}
                    style={{
                      position: "absolute",
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      zIndex: el.zIndex,
                      fontFamily: `'${el.fontFamily}', sans-serif`,
                      fontSize: el.fontSize,
                      fontWeight: el.fontWeight,
                      fontStyle: el.fontStyle,
                      color: el.color,
                      textAlign: el.textAlign,
                      textShadow: el.textShadow || "none",
                      WebkitTextStroke: el.textStroke || undefined,
                      background: el.backgroundColor || "transparent",
                      padding: el.padding,
                      borderRadius: el.borderRadius,
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        el.textAlign === "left"
                          ? "flex-start"
                          : el.textAlign === "right"
                          ? "flex-end"
                          : "center",
                      overflow: "hidden",
                      wordBreak: "break-word",
                    }}
                  >
                    {previewText}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
