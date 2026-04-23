const LS_KEY = "tlf:sound:v1";

export function loadSoundOn(): boolean {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "off") return false;
    if (v === "on") return true;
  } catch {
    // ignore
  }
  return true; // default: sounds enabled
}

export function saveSoundOn(on: boolean): void {
  try {
    localStorage.setItem(LS_KEY, on ? "on" : "off");
  } catch {
    // ignore
  }
}
