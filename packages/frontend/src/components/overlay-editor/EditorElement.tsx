import { useRef, useCallback } from "react";
import type { OverlayElement } from "@streamguard/shared";

interface EditorElementProps {
  element: OverlayElement;
  selected: boolean;
  scale: number;
  imageUrl?: string;
  previewText: string;
  onSelect: () => void;
  onUpdate: (patch: Partial<OverlayElement>) => void;
}

export function EditorElement({
  element,
  selected,
  scale,
  imageUrl,
  previewText,
  onSelect,
  onUpdate,
}: EditorElementProps) {
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
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        elX: element.x,
        elY: element.y,
      };
    },
    [element.x, element.y, onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (resizeRef.current) {
        const r = resizeRef.current;
        const dx = (e.clientX - r.startX) / scale;
        const dy = (e.clientY - r.startY) / scale;
        let newX = r.elX,
          newY = r.elY,
          newW = r.elW,
          newH = r.elH;

        if (r.corner.includes("r")) newW = Math.max(30, r.elW + dx);
        if (r.corner.includes("b")) newH = Math.max(20, r.elH + dy);
        if (r.corner.includes("l")) {
          newW = Math.max(30, r.elW - dx);
          newX = r.elX + (r.elW - newW);
        }
        if (r.corner.includes("t")) {
          newH = Math.max(20, r.elH - dy);
          newY = r.elY + (r.elH - newH);
        }
        onUpdate({ x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) });
        return;
      }

      if (dragRef.current) {
        const d = dragRef.current;
        const dx = (e.clientX - d.startX) / scale;
        const dy = (e.clientY - d.startY) / scale;
        onUpdate({ x: Math.round(d.elX + dx), y: Math.round(d.elY + dy) });
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
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
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
  const cornerPositions: Record<string, React.CSSProperties> = {
    tl: { top: -4, left: -4, cursor: "nwse-resize" },
    tr: { top: -4, right: -4, cursor: "nesw-resize" },
    bl: { bottom: -4, left: -4, cursor: "nesw-resize" },
    br: { bottom: -4, right: -4, cursor: "nwse-resize" },
  };

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    zIndex: element.zIndex,
    cursor: "move",
    outline: selected ? "2px solid #3b82f6" : "1px dashed rgba(255,255,255,0.3)",
  };

  return (
    <div
      style={containerStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {element.type === "image" ? (
        <img
          src={imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect width='300' height='300' fill='%23333' rx='12'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23888' font-size='24'%3EImage%3C/text%3E%3C/svg%3E"}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            borderRadius: element.borderRadius,
            objectFit: element.objectFit || "contain",
            border: element.borderWidth
              ? `${element.borderWidth}px solid ${element.borderColor || "#fff"}`
              : "none",
            pointerEvents: "none",
          }}
          draggable={false}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            fontFamily: `'${element.fontFamily}', sans-serif`,
            fontSize: element.fontSize,
            fontWeight: element.fontWeight,
            fontStyle: element.fontStyle,
            color: element.color,
            textAlign: element.textAlign,
            textShadow: element.textShadow || "none",
            WebkitTextStroke: element.textStroke || undefined,
            background: element.backgroundColor || "transparent",
            padding: element.padding,
            borderRadius: element.borderRadius,
            display: "flex",
            alignItems: "center",
            justifyContent:
              element.textAlign === "left"
                ? "flex-start"
                : element.textAlign === "right"
                ? "flex-end"
                : "center",
            overflow: "hidden",
            wordBreak: "break-word",
            pointerEvents: "none",
          }}
        >
          {previewText}
        </div>
      )}

      {/* Resize handles */}
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
              ...cornerPositions[c],
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
