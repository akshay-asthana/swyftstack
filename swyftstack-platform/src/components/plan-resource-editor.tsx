"use client";

// Grouped plan resource editor (§9). Plans need not include every resource:
// each section has a feature toggle, and a resource's limit inputs are disabled
// when the resource itself is turned off.
import { useState } from "react";

interface Group {
  title: string;
  features: string[];
  limits: [name: string, label: string][];
}

const GROUPS: Group[] = [
  { title: "Organization", features: [], limits: [["maxProjects", "Max projects"]] },
  {
    title: "Compute",
    features: ["app_hosting", "static_hosting", "serverless_api"],
    limits: [
      ["maxVcpuSeconds", "Runtime vCPU-seconds"],
      ["maxBuildVcpuSeconds", "Build vCPU-seconds"],
    ],
  },
  {
    title: "Databases",
    features: ["postgres_database", "database_import"],
    limits: [
      ["maxDatabases", "Max databases"],
      ["maxDatabaseStorageBytes", "Combined DB storage (bytes)"],
    ],
  },
  {
    title: "Storage",
    features: ["object_storage"],
    limits: [
      ["maxStorageBuckets", "Max storage buckets"],
      ["maxObjectStorageBytes", "Object storage (bytes)"],
    ],
  },
  { title: "Network", features: [], limits: [["maxEgressBytes", "Egress (bytes)"]] },
  {
    title: "Backups",
    features: ["backups"],
    limits: [
      ["dailyDbBackups", "Daily DB backups"],
      ["backupRetentionHours", "Backup retention (hours)"],
    ],
  },
  {
    title: "Collaboration",
    features: ["team_members", "custom_domain"],
    limits: [
      ["maxTeamMembers", "Max team members"],
      ["maxCustomDomains", "Max custom domains"],
    ],
  },
  { title: "Developer Experience", features: ["logs", "env_vars"], limits: [] },
];

// limit input -> the feature that must be enabled for it to apply (null = always).
const LIMIT_GATE: Record<string, string | null> = {
  maxProjects: null,
  maxDatabases: "postgres_database",
  maxStorageBuckets: "object_storage",
  maxDatabaseStorageBytes: "postgres_database",
  maxObjectStorageBytes: "object_storage",
  maxEgressBytes: null,
  maxVcpuSeconds: "app_hosting",
  maxBuildVcpuSeconds: "app_hosting",
  dailyDbBackups: "backups",
  backupRetentionHours: "backups",
  maxTeamMembers: "team_members",
  maxCustomDomains: "custom_domain",
};

const FEATURE_LABELS: Record<string, string> = {
  app_hosting: "App hosting",
  static_hosting: "Static hosting",
  serverless_api: "Serverless API",
  postgres_database: "PostgreSQL database",
  database_import: "Database import",
  object_storage: "Object storage",
  custom_domain: "Custom domains",
  backups: "Backups",
  team_members: "Team members",
  logs: "Logs",
  env_vars: "Env vars",
};

export function PlanResourceEditor({
  features,
  limits,
}: {
  features: Record<string, boolean>;
  limits: Record<string, string>;
}) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(features);
  const toggle = (k: string) => setEnabled((e) => ({ ...e, [k]: !e[k] }));

  return (
    <div style={{ marginTop: 12 }}>
      {GROUPS.map((g) => (
        <fieldset
          key={g.title}
          style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "10px 14px 14px", marginBottom: 12 }}
        >
          <legend className="small" style={{ fontWeight: 700 }}>{g.title}</legend>

          {g.features.length > 0 && (
            <div className="check-grid" style={{ marginBottom: g.limits.length ? 12 : 0 }}>
              {g.features.map((f) => (
                <label className="check" key={f}>
                  <input
                    type="checkbox"
                    name={`feature:${f}`}
                    checked={enabled[f] ?? false}
                    onChange={() => toggle(f)}
                  />
                  {FEATURE_LABELS[f] ?? f}
                </label>
              ))}
            </div>
          )}

          {g.limits.length > 0 && (
            <div className="grid compact">
              {g.limits.map(([name, label]) => {
                const gate = LIMIT_GATE[name];
                const off = gate ? !(enabled[gate] ?? false) : false;
                return (
                  <div key={name}>
                    <label>{label}</label>
                    <input
                      name={name}
                      defaultValue={limits[name] ?? ""}
                      disabled={off}
                      placeholder={off ? "resource disabled" : "blank = unlimited"}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </fieldset>
      ))}
    </div>
  );
}
