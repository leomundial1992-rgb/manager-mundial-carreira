export function notify(text: string) {
  window.dispatchEvent(new CustomEvent("mm-toast", { detail: text }));
}
export function goTab(tab: string, sub?: string) {
  window.dispatchEvent(new CustomEvent("mm-tab", { detail: { tab, sub } }));
}
