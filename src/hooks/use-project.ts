"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, EXAMPLE_TABLES, STORAGE_KEY, restoreProject, type Project, type Settings, type Table } from "@/lib/project";

export function useProject() {
  const [project, setProject] = useState<Project>({ tables: EXAMPLE_TABLES, settings: DEFAULT_SETTINGS });
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "unavailable">("saving");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = restoreProject(localStorage.getItem(STORAGE_KEY));
        if (saved) setProject(saved);
      } catch { setSaveState("unavailable"); }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); setSaveState("saved"); }
      catch { setSaveState("unavailable"); }
    }, 350);
    // Flush pending edits when moving between the studios or leaving the page.
    const flush = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch { /* Reported by the next autosave. */ } };
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [project, ready]);
  const setTables = useCallback((tables: Table[]) => {
    setProject((current) => ({ ...current, tables }));
    setSaveState("saving");
  }, []);
  const updateSettings = useCallback((settings: Partial<Settings>) => {
    setProject((current) => ({ ...current, settings: { ...current.settings, ...settings } }));
    setSaveState("saving");
  }, []);
  return { ...project, setTables, updateSettings, ready, saveState };
}
