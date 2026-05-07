"use client";

import { useEffect, useState } from "react";

interface Alert {
  id: string;
  alertType: string;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
  savedSearch: { name: string };
  listing: {
    mlsNumber: string;
    listPrice: string;
    streetNumber: string | null;
    streetName: string | null;
    city: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
  };
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  NEW_LISTING: "New Listing",
  PRICE_CHANGE: "Price Change",
  STATUS_CHANGE: "Status Change",
  OPEN_HOUSE: "Open House",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-500">Loading alerts...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Property Alerts</h1>
        <p className="text-slate-500 mt-1">
          Notifications when new listings match your saved search criteria
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-lg">No alerts yet</p>
          <p className="text-slate-400 mt-1">
            Enable alerts on your saved searches to get notified about matching listings
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const l = alert.listing;
            const address = [l.streetNumber, l.streetName].filter(Boolean).join(" ");
            const isUnread = !alert.readAt;

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-lg border p-4 ${
                  isUnread ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          alert.alertType === "NEW_LISTING"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : alert.alertType === "PRICE_CHANGE"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <div className="mt-2 font-medium text-slate-900">
                      {address || "Address TBD"}, {l.city}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      ${Number(l.listPrice).toLocaleString()}
                      {l.bedrooms != null && ` · ${l.bedrooms} bed`}
                      {l.bathrooms != null && ` · ${l.bathrooms} bath`}
                      {" · MLS# "}{l.mlsNumber}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      From search: {alert.savedSearch.name}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
