import { useRef, useEffect, useState, useCallback } from "react";
import type { OverlayLayoutConfig, OverlayElement } from "@cristream/shared";
import { EditorElement } from "./EditorElement";

interface EditorCanvasProps {
  layout: OverlayLayoutConfig;
  selectedId: string | null;
  imageUrl?: string;
  previewText: string;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, patch: Partial<OverlayElement>) => void;
}

export function EditorCanvas({
  layout,
  selectedId,
  imageUrl,
  previewText,
  onSelect,
  onUpdateElement,
}: EditorCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const sx = width / layout.canvas.width;
      const sy = height / layout.canvas.height;
      setScale(Math.min(sx, sy, 1));
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [layout.canvas.width, layout.canvas.height]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onSelect(null);
      }
    },
    [onSelect]
  );

  const scaledWidth = layout.canvas.width * scale;
  const scaledHeight = layout.canvas.height * scale;

  return (
    <div ref={wrapperRef} className="flex-1 flex items-center justify-center overflow-hidden p-4">
      <div style={{ width: scaledWidth, height: scaledHeight, flexShrink: 0 }}>
        <div
          style={{
            width: layout.canvas.width,
            height: layout.canvas.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "relative",
            background:
              layout.canvas.background === "transparent"
                ? `repeating-conic-gradient(#808080 0% 25%, #a0a0a0 0% 50%) 50% / 20px 20px`
                : layout.canvas.background,
            borderRadius: 4,
            boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
          onClick={handleCanvasClick}
        >
        {layout.elements.map((el) => (
          <EditorElement
            key={el.id}
            element={el}
            selected={el.id === selectedId}
            scale={scale}
            imageUrl={el.type === "image" ? imageUrl : undefined}
            previewText={previewText}
            onSelect={() => onSelect(el.id)}
            onUpdate={(patch) => onUpdateElement(el.id, patch)}
          />
        ))}
        </div>
      </div>
    </div>
  );
}
