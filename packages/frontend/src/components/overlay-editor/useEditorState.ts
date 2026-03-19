import { useState, useCallback } from "react";
import type { OverlayLayoutConfig, OverlayElement } from "@streamguard/shared";
import { DEFAULT_LAYOUT_CONFIG } from "@streamguard/shared";

const MAX_UNDO = 20;

interface EditorState {
  layout: OverlayLayoutConfig;
  selectedId: string | null;
  undoStack: OverlayLayoutConfig[];
  isDirty: boolean;
}

export function useEditorState(initial: OverlayLayoutConfig | null) {
  const [state, setState] = useState<EditorState>({
    layout: initial ?? (DEFAULT_LAYOUT_CONFIG as OverlayLayoutConfig),
    selectedId: null,
    undoStack: [],
    isDirty: false,
  });

  const pushUndo = useCallback((prev: OverlayLayoutConfig) => {
    setState((s) => ({
      ...s,
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), prev],
    }));
  }, []);

  const updateElement = useCallback(
    (id: string, patch: Partial<OverlayElement>) => {
      setState((s) => {
        pushUndo(s.layout);
        return {
          ...s,
          isDirty: true,
          layout: {
            ...s.layout,
            elements: s.layout.elements.map((el) =>
              el.id === id ? ({ ...el, ...patch } as OverlayElement) : el
            ),
          },
        };
      });
    },
    [pushUndo]
  );

  const updateCanvas = useCallback(
    (patch: Partial<OverlayLayoutConfig["canvas"]>) => {
      setState((s) => {
        pushUndo(s.layout);
        return {
          ...s,
          isDirty: true,
          layout: {
            ...s.layout,
            canvas: { ...s.layout.canvas, ...patch },
          },
        };
      });
    },
    [pushUndo]
  );

  const setSelectedId = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedId: id }));
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (s.undoStack.length === 0) return s;
      const prev = s.undoStack[s.undoStack.length - 1];
      return {
        ...s,
        layout: prev,
        undoStack: s.undoStack.slice(0, -1),
        isDirty: true,
      };
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setState((s) => {
      pushUndo(s.layout);
      return {
        ...s,
        layout: DEFAULT_LAYOUT_CONFIG as OverlayLayoutConfig,
        isDirty: true,
        selectedId: null,
      };
    });
  }, [pushUndo]);

  const setLayout = useCallback((layout: OverlayLayoutConfig) => {
    setState({
      layout,
      selectedId: null,
      undoStack: [],
      isDirty: false,
    });
  }, []);

  return {
    layout: state.layout,
    selectedId: state.selectedId,
    isDirty: state.isDirty,
    canUndo: state.undoStack.length > 0,
    updateElement,
    updateCanvas,
    setSelectedId,
    undo,
    resetToDefault,
    setLayout,
  };
}
