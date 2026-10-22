/**
 * RealtimeUploadTicker — Legacy wrapper updated to modern white SaaS notification banner.
 * Completely removes dark styling and "REALTIME" wording.
 * Reuses WatcherToast for consistent, premium SaaS experience.
 */
import React from "react";
import WatcherToast from "./WatcherToast";

export default function RealtimeUploadTicker({ onNavigate, lang = "vi", event, onDismiss }) {
  if (!event) return null;
  return <WatcherToast event={event} onDismiss={onDismiss} lang={lang} onNavigate={onNavigate} />;
}
