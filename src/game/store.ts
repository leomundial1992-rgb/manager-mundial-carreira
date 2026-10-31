import { useSyncExternalStore } from "react";
import type { GameState } from "./types";

let state: GameState | null = null;
let version = 0;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const DB = "manager-mundial";
const STORE = "saves";
const KEY = "carreira";

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function saveNow() {
  if (!state) return;
  const d = await db();
  await new Promise<void>((res, rej) => {
    const tx = d.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(JSON.stringify(state), KEY);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  localStorage.setItem("mm-has-save", "1");
}
export async function loadSave(): Promise<GameState | null> {
  try {
    const d = await db();
    const raw = await new Promise<string | undefined>((res, rej) => {
      const r = d.transaction(STORE).objectStore(STORE).get(KEY);
      r.onsuccess = () => res(r.result as string | undefined);
      r.onerror = () => rej(r.error);
    });
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}
export async function deleteSave() {
  const d = await db();
  d.transaction(STORE, "readwrite").objectStore(STORE).delete(KEY);
  localStorage.removeItem("mm-has-save");
  state = null;
  emit();
}
export const hasSaveHint = () => typeof window !== "undefined" && localStorage.getItem("mm-has-save") === "1";

function emit() {
  version++;
  listeners.forEach((l) => l());
}
export function setGame(s: GameState) {
  state = s;
  emit();
  scheduleSave();
}
export function getGame() { return state; }
export function mutate(fn: (s: GameState) => void) {
  if (!state) return;
  fn(state);
  emit();
  scheduleSave();
}
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveNow(), 600);
}
export function useGame(): GameState | null {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version, () => 0);
  return state;
}
