import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Toast = { id: number; title: string; body: string };

type Ctx = {
  soundEnabled: boolean;
  pushEnabled: boolean;
  permission: NotificationPermission | "unsupported";
  toasts: Toast[];
  setSoundEnabled: (v: boolean) => void;
  requestPush: () => Promise<void>;
  disablePush: () => void;
  notify: (title: string, body: string) => void;
  dismiss: (id: number) => void;
};

const NotifContext = createContext<Ctx | null>(null);

const STORE_KEY = "tableflash.notif";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as { sound: boolean; push: boolean };
  } catch (err) {
    console.debug(err);
  }
  return { sound: true, push: false };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState(() =>
    typeof window === "undefined" ? { sound: true, push: false } : loadPrefs(),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const supported = typeof window !== "undefined" && "Notification" in window;
  const permission: Ctx["permission"] = supported ? Notification.permission : "unsupported";

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(prefs));
    } catch (err) {
      console.debug(err);
    }
  }, [prefs]);

  const playBeep = useCallback(() => {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      [0, 0.18].forEach((t) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(880, now + t);
        o.frequency.exponentialRampToValueAtTime(1320, now + t + 0.1);
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.18);
        o.connect(g).connect(ctx.destination);
        o.start(now + t);
        o.stop(now + t + 0.2);
      });
    } catch (err) {
      console.debug(err);
    }
  }, []);

  const notify = useCallback(
    (title: string, body: string) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, title, body }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
      if (prefs.sound) playBeep();
      if (prefs.push && supported && Notification.permission === "granted") {
        try {
          new Notification(title, { body, icon: "/favicon.ico", tag: "tableflash-order" });
        } catch (err) {
          console.debug(err);
        }
      }
    },
    [prefs.sound, prefs.push, supported, playBeep],
  );

  const requestPush = useCallback(async () => {
    if (!supported) return;
    const p = await Notification.requestPermission();
    if (p === "granted") setPrefs((s) => ({ ...s, push: true }));
  }, [supported]);

  const disablePush = useCallback(() => setPrefs((s) => ({ ...s, push: false })), []);
  const setSoundEnabled = useCallback((v: boolean) => setPrefs((s) => ({ ...s, sound: v })), []);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return (
    <NotifContext.Provider
      value={{
        soundEnabled: prefs.sound,
        pushEnabled: prefs.push,
        permission,
        toasts,
        setSoundEnabled,
        requestPush,
        disablePush,
        notify,
        dismiss,
      }}
    >
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}

// Aucune simulation : les notifications n'apparaîtront que pour de vraies commandes.
export function useOrderSimulator() {
  // no-op
}
