"use client";

import { useState, useEffect, useCallback } from "react";

const VAPID_PUBLIC_KEY = "BC21F7X3cZNPM-47bBkaJkjEn8fww0BYw1J-k_1edIXq60WIPj-eTkrs1-Z8JjnDi7LPVjMhVe6iF8UL8KMk998";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer as ArrayBuffer;
}

type NotifPrefs = {
  water_reminder: boolean;
  workout_reminder: boolean;
  food_reminder: boolean;
  workout_reminder_time: string;
  water_interval_hours: number;
};

type PermissionStatus = "unsupported" | "default" | "granted" | "denied";

export default function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [permStatus, setPermStatus] = useState<PermissionStatus>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [prefs, setPrefs] = useState<NotifPrefs>({
    water_reminder: true,
    workout_reminder: true,
    food_reminder: true,
    workout_reminder_time: "08:00",
    water_interval_hours: 2,
  });

  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/push/preferences");
      if (res.ok) {
        const data = (await res.json()) as NotifPrefs;
        setPrefs(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const isSupported = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(isSupported);
    if (!isSupported) {
      setPermStatus("unsupported");
      return;
    }

    const perm = Notification.permission as PermissionStatus;
    setPermStatus(perm);

    if (perm === "granted") {
      // Check if already subscribed
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          setSubscribed(!!sub);
          if (sub) loadPrefs();
        })
        .catch(() => {});
    }
  }, [loadPrefs]);

  const handleEnable = async () => {
    setLoading(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      setPermStatus(permission as PermissionStatus);
      if (permission !== "granted") {
        setMessage("Permission denied. Please allow notifications in your browser settings.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (res.ok) {
        setSubscribed(true);
        await loadPrefs();
        setMessage("Notifications enabled successfully!");
      } else {
        setMessage("Failed to save subscription. Please try again.");
      }
    } catch {
      setMessage("Failed to enable notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Notifications disabled.");
    } catch {
      setMessage("Failed to disable notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrefs = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setMessage("Preferences saved!");
      } else {
        setMessage("Failed to save preferences.");
      }
    } catch {
      setMessage("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      if (res.ok) {
        setMessage("Test notification sent! Check your notifications.");
      } else {
        setMessage("Failed to send test notification.");
      }
    } catch {
      setMessage("Failed to send test notification.");
    } finally {
      setTesting(false);
    }
  };

  const permLabel = () => {
    if (permStatus === "unsupported") return "Not supported in this browser";
    if (permStatus === "granted" && subscribed) return "Enabled";
    if (permStatus === "denied") return "Blocked — allow in browser settings";
    return "Not enabled";
  };

  const permColor = () => {
    if (permStatus === "granted" && subscribed) return "text-green-600 dark:text-green-400";
    if (permStatus === "denied") return "text-red-500 dark:text-red-400";
    return "text-gray-500 dark:text-gray-400";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">🔔 Push Notifications</h3>
        <span className={`text-xs font-medium ${permColor()}`}>{permLabel()}</span>
      </div>

      {message && (
        <p className={`text-xs px-3 py-2 rounded-lg ${message.includes("success") || message.includes("saved") || message.includes("sent") ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"}`}>
          {message}
        </p>
      )}

      {permStatus === "unsupported" ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Push notifications are not supported in this browser.
        </p>
      ) : (
        <>
          {!subscribed ? (
            <button
              onClick={handleEnable}
              disabled={loading || permStatus === "denied"}
              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Enabling…" : "Enable Notifications"}
            </button>
          ) : (
            <>
              {/* Notification type toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">💧 Water Reminders</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Every 2 hrs, 8am–8pm</p>
                  </div>
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, water_reminder: !p.water_reminder }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prefs.water_reminder ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${prefs.water_reminder ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">🏋️ Workout Reminder</p>
                    <div className="flex items-center gap-2 mt-1">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Time (UTC):</label>
                      <input
                        type="time"
                        value={prefs.workout_reminder_time}
                        onChange={(e) => setPrefs((p) => ({ ...p, workout_reminder_time: e.target.value }))}
                        disabled={!prefs.workout_reminder}
                        className="text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 focus:outline-none focus:border-green-400 disabled:opacity-40"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, workout_reminder: !p.workout_reminder }))}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors mt-0.5 ${prefs.workout_reminder ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${prefs.workout_reminder ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">🥗 Food Diary Reminder</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">7pm UTC daily</p>
                  </div>
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, food_reminder: !p.food_reminder }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prefs.food_reminder ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${prefs.food_reminder ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSavePrefs}
                  disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Preferences"}
                </button>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {testing ? "Sending…" : "🔔 Test Notification"}
                </button>
              </div>

              <button
                onClick={handleDisable}
                disabled={loading}
                className="w-full border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Disabling…" : "Disable Notifications"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
