import { useCallback, useEffect, useRef, useState } from "react";
import { iobrokerClient } from "@/services/iobrokerClient";
import {
  createDefaultFloorplanDesigner,
  createDefaultFloorplanImages,
  type FloorplanDesignerData,
  type FloorplanFloor,
  type FloorplanFloorView,
  type FloorplanImagesConfig,
  type FloorplanLevel,
} from "@/types/domain";

const UNDO_LIMIT = 50;

interface UseFloorplanDesignerResult {
  data: FloorplanDesignerData;
  images: FloorplanImagesConfig;
  level: FloorplanLevel;
  setLevel: (level: FloorplanLevel) => void;
  floor: FloorplanFloor;
  floorView: FloorplanFloorView;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error: string | null;
  canUndo: boolean;
  updateFloor: (updater: (floor: FloorplanFloor) => FloorplanFloor) => void;
  updateFloorView: (updater: (view: FloorplanFloorView) => FloorplanFloorView) => void;
  updateSettings: (updater: (settings: FloorplanDesignerData["settings"]) => FloorplanDesignerData["settings"]) => void;
  updateImages: (updater: (images: FloorplanImagesConfig) => FloorplanImagesConfig) => void;
  undo: () => void;
  save: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFloorplanDesigner(): UseFloorplanDesignerResult {
  const [data, setData] = useState<FloorplanDesignerData>(createDefaultFloorplanDesigner());
  const [images, setImages] = useState<FloorplanImagesConfig>(createDefaultFloorplanImages());
  const [level, setLevel] = useState<FloorplanLevel>("EG");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dataDirty, setDataDirty] = useState(false);
  const [imagesDirty, setImagesDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs statt funktionaler setState-Updater, damit pushUndoSnapshot() garantiert genau
  // einmal pro Aufruf feuert (React StrictMode ruft funktionale Updater ggf. doppelt auf).
  const dataRef = useRef(data);
  const imagesRef = useRef(images);
  const undoStack = useRef<FloorplanDesignerData[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [nextData, nextImages] = await Promise.all([
        iobrokerClient.getConfig<FloorplanDesignerData>("/floorplan/designer"),
        iobrokerClient.getConfig<FloorplanImagesConfig>("/floorplan/images"),
      ]);
      dataRef.current = nextData;
      imagesRef.current = nextImages;
      undoStack.current = [];
      setData(nextData);
      setImages(nextImages);
      setCanUndo(false);
      setDataDirty(false);
      setImagesDirty(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pushUndoSnapshot = useCallback((snapshot: FloorplanDesignerData) => {
    undoStack.current.push(snapshot);
    if (undoStack.current.length > UNDO_LIMIT) {
      undoStack.current.shift();
    }
    setCanUndo(true);
  }, []);

  const updateFloor = useCallback(
    (updater: (floor: FloorplanFloor) => FloorplanFloor) => {
      const prev = dataRef.current;
      pushUndoSnapshot(prev);
      const next: FloorplanDesignerData = { ...prev, [level]: updater(prev[level]) };
      dataRef.current = next;
      setData(next);
      setDataDirty(true);
    },
    [level, pushUndoSnapshot]
  );

  const updateFloorView = useCallback(
    (updater: (view: FloorplanFloorView) => FloorplanFloorView) => {
      const prev = dataRef.current;
      const next: FloorplanDesignerData = {
        ...prev,
        settings: {
          ...prev.settings,
          floorView: { ...prev.settings.floorView, [level]: updater(prev.settings.floorView[level]) },
        },
      };
      dataRef.current = next;
      setData(next);
      setDataDirty(true);
    },
    [level]
  );

  const updateSettings = useCallback(
    (updater: (settings: FloorplanDesignerData["settings"]) => FloorplanDesignerData["settings"]) => {
      const prev = dataRef.current;
      const next: FloorplanDesignerData = { ...prev, settings: updater(prev.settings) };
      dataRef.current = next;
      setData(next);
      setDataDirty(true);
    },
    []
  );

  const updateImages = useCallback((updater: (images: FloorplanImagesConfig) => FloorplanImagesConfig) => {
    const next = updater(imagesRef.current);
    imagesRef.current = next;
    setImages(next);
    setImagesDirty(true);
  }, []);

  const undo = useCallback(() => {
    const snapshot = undoStack.current.pop();
    if (!snapshot) {
      return;
    }
    dataRef.current = snapshot;
    setData(snapshot);
    setDataDirty(true);
    setCanUndo(undoStack.current.length > 0);
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      if (dataDirty) {
        await iobrokerClient.putConfig("/floorplan/designer", dataRef.current);
        setDataDirty(false);
      }
      if (imagesDirty) {
        await iobrokerClient.putConfig("/floorplan/images", imagesRef.current);
        setImagesDirty(false);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }, [dataDirty, imagesDirty]);

  return {
    data,
    images,
    level,
    setLevel,
    floor: data[level],
    floorView: data.settings.floorView[level],
    isLoading,
    isSaving,
    isDirty: dataDirty || imagesDirty,
    error,
    canUndo,
    updateFloor,
    updateFloorView,
    updateSettings,
    updateImages,
    undo,
    save,
    refresh,
  };
}
