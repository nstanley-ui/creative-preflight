import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { createCreative, Trafficker, Platform, Severity, type Creative } from "./Trafficker";
import { digestInputs, type DigestResult } from "./ingest/Digest";

interface Placement {
  id: string;
  tag: string;
  dimensions: string;
  width: number;
  height: number;
  raw: any;
}

type IngestedCreative = {
  id: string;
  name: string;
  kind: "image" | "video";
  width?: number;
  height?: number;
  duration?: number;
  source: "standalone" | "zip" | "url";
};

function creativesFromDigest(d: DigestResult | null): IngestedCreative[] {
  if (!d) return [];
  return d.items
    .filter((it) => it.type === "creative_image" || it.type === "creative_video")
    .map((it) => ({
      id: it.id,
      name: it.name,
      kind: it.type === "creative_video" ? "video" : "image",
      width: it.meta?.width,
      height: it.meta?.height,
      duration: it.meta?.duration,
      source: it.source === "mojo" ? "standalone" : it.source,
    }));
}

function placementsFromDigest(d: DigestResult | null): Placement[] {
  if (!d) return [];
  const out: Placement[] = [];
  let idx = 0;

  for (const sheet of d.sheets) {
    for (const row of sheet.rows) {
      const tag = row?.[4];
      const dims = row?.[10];

      if (dims && typeof dims === "string" && dims.includes("x") && tag) {
        const [w, h] = dims.split("x").map(Number);
        if (!isNaN(w) && !isNaN(h)) {
          out.push({
            id: `${sheet.name}_ROW_${idx++}`,
            tag: String(tag),
            dimensions: dims,
            width: w,
            height: h,
            raw: row,
          });
        }
      }
    }
  }
  return out;
}

function getStatusIcon(status: Severity) {
  if (status === Severity.PASS) return "✅";
  if (status === Severity.WARNING) return "⚠️";
  return "🚫";
}

function getNextAction(status: Severity) {
  if (status === Severity.BLOCKER) return "Fix blockers before trafficking";
  if (status === Severity.WARNING) return "Review warnings or apply auto-fixes";
  return "Clear to traffic";
}

function getBusinessContext(issue: string): string {
  // More specific, ops-focused context
  if (issue.includes("Aspect Ratio")) return "Platform will reject at QA stage. Fix dimensions before upload.";
  if (issue.includes("Text density")) return "May trigger low-quality score. Consider reducing text or A/B testing.";
  if (issue.includes("Missing required tag")) return "Required for programmatic buys. Creative won't traffic without it.";
  if (issue.includes("campaign name")) return "Helps with reporting attribution. Optional but recommended for multi-campaign tracking.";
  return "Review required.";
}

export default function App() {
  const [formData, setFormData] = useState({
    filename: "creative_v1.jpg",
    width: 1080,
    height: 1080,
    text_density: "low" as "low" | "medium" | "high",
    campaign_objective: "awareness" as "awareness" | "demand_gen",
    campaign_name: "",
  });

  const [reports, setReports] = useState<Record<string, Creative> | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    Platform.META,
    Platform.GOOGLE,
    Platform.TIKTOK,
  ]);
  const [viewPlatform, setViewPlatform] = useState<Platform>(Platform.LINKEDIN);

  useEffect(() => {
    if (selectedPlatforms.length === 0) return;
    if (!selectedPlatforms.includes(viewPlatform)) setViewPlatform(selectedPlatforms[0]);
  }, [selectedPlatforms, viewPlatform]);

  // Unified ingest
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState("");
  const [uploadStats, setUploadStats] = useState("");
  const [gsheetUrl, setGsheetUrl] = useState("");

  const creatives = useMemo(() => creativesFromDigest(digest), [digest]);
  const [selectedCreativeId, setSelectedCreativeId] = useState("");
  const placements = useMemo(() => placementsFromDigest(digest), [digest]);
  const [selectedPlacementId, setSelectedPlacementId] = useState("");

  const selectedPlacement = useMemo(
    () => placements.find((p) => p.id === selectedPlacementId),
    [placements, selectedPlacementId]
  );

  const primaryPlatform: Platform = viewPlatform ?? (selectedPlatforms[0] ?? Platform.LINKEDIN);
  const primaryReport: Creative | null = reports ? reports[primaryPlatform] ?? null : null;

  // Enhanced magic moment state
  const [lastBefore, setLastBefore] = useState<{ filename: string; width: number; height: number } | null>(null);
  const [magicApplied, setMagicApplied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [revealedFixes, setRevealedFixes] = useState<number>(0);

  const runDigest = async (files: FileList | File[], gsheet?: string) => {
    setIngesting(true);
    setIngestMsg("Analyzing upload...");
    setUploadStats("");

    try {
      const result = await digestInputs(files, gsheet?.trim() ? gsheet.trim() : undefined);
      setDigest(result);

      const foundCreatives = creativesFromDigest(result).length;
      const foundSheets = result.items.filter((i) => i.type === "tag_sheet").length;

      setIngestMsg(`Extracted ${foundCreatives} creative(s), ${foundSheets} sheet(s). Specs auto-populated.`);

      const pl = placementsFromDigest(result);
      if (pl.length > 0) setUploadStats(`✅ ${pl.length} trafficking tags parsed from media plan.`);
      else if (foundSheets > 0) setUploadStats(`✅ Spreadsheet detected (no placement rows matched).`);
      else setUploadStats(`✅ Upload complete.`);

      // Auto-select first creative
      const firstCreative = creativesFromDigest(result)[0];
      if (firstCreative) {
        setSelectedCreativeId(firstCreative.id);
        setFormData((prev) => ({
          ...prev,
          filename: firstCreative.name,
          width: firstCreative.width ?? prev.width,
          height: firstCreative.height ?? prev.height,
        }));
      }
      setSelectedPlacementId("");
    } catch (e: any) {
      console.error(e);
      setIngestMsg(`Error: ${e?.message ?? String(e)}`);
      setUploadStats("❌ Upload failed");
    } finally {
      setIngesting(false);
    }
  };

  const handleSelectPlacement = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPlacementId(id);
    const p = placements.find((x) => x.id === id);
    if (p) setFormData((prev) => ({ ...prev, width: p.width, height: p.height }));
  };

  const handleRun = async () => {
    setLastBefore({ filename: formData.filename, width: Number(formData.width), height: Number(formData.height) });
    setMagicApplied(false);
    setRevealedFixes(0);

    // Enhanced scanning animation
    setScanning(true);
    const scanSteps = [
      "Validating dimensions against platform specs...",
      "Checking aspect ratios and safe zones...",
      "Analyzing file naming conventions...",
      "Cross-referencing trafficking requirements...",
      "Finalizing pre-flight report...",
    ];

    for (let i = 0; i < scanSteps.length; i++) {
      setScanProgress(scanSteps[i]);
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
    }

    const newReports: Record<string, Creative> = {};
    selectedPlatforms.forEach((platform) => {
      const creative = createCreative(
        formData.filename,
        platform,
        Number(formData.width),
        Number(formData.height),
        formData.text_density,
        formData.campaign_objective,
        formData.campaign_name || undefined,
        selectedPlacement?.tag
      );
      const trafficker = new Trafficker(creative);
      newReports[platform] = trafficker.validate();
    });
    setReports(newReports);
    setScanning(false);
  };

  const applyMagicFixes = async () => {
    if (!primaryReport || !lastBefore) return;

    // Progressive reveal of fixes
    setRevealedFixes(0);
    for (let i = 1; i <= primaryReport.fixes.length; i++) {
      await new Promise((r) => setTimeout(r, 300));
      setRevealedFixes(i);
    }

    // Apply fixes
    setFormData((prev) => ({
      ...prev,
      filename: primaryReport.filename,
      width: primaryReport.width,
      height: primaryReport.height,
    }));

    setMagicApplied(true);

    // Re-run validation to show updated status
    const newReports: Record<string, Creative> = {};
    selectedPlatforms.forEach((platform) => {
      const creative = createCreative(
        primaryReport.filename,
        platform,
        primaryReport.width,
        primaryReport.height,
        formData.text_density,
        formData.campaign_objective,
        formData.campaign_name || undefined,
        selectedPlacement?.tag
      );
      const trafficker = new Trafficker(creative);
      newReports[platform] = trafficker.validate();
    });
    setReports(newReports);
  };

  return (
    <div className="container">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>Mojo Creative Pre-Flight</h1>
        <p style={{ margin: 0, marginTop: 4, color: "#6b7280", fontWeight: 600 }}>
          Validate trafficking specs, auto-fix issues, prevent platform rejections
        </p>
      </div>

      <div
        style={{
          background: dragOver ? "#f0f9ff" : "#f9fafb",
          border: dragOver ? "2px dashed #3b82f6" : "2px dashed #d1d5db",
          borderRadius: 16,
          padding: 32,
          textAlign: "center",
          marginBottom: 24,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) runDigest(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.m4v,.xlsx,.xls,.csv,.zip"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) runDigest(e.target.files);
          }}
        />
        <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {ingesting ? "Analyzing..." : "Drop Anything"}
        </div>
        <div style={{ fontSize: 14, color: "#6b7280" }}>
          Images, videos, Excel/CSV media plans, or ZIP archives — Mojo extracts specs automatically
        </div>
        {ingestMsg && <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700, color: "#111827" }}>{ingestMsg}</div>}
        {uploadStats && <div style={{ marginTop: 6, fontSize: 13, color: "#059669" }}>{uploadStats}</div>}
      </div>

      {creatives.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Select Creative</label>
          <select
            value={selectedCreativeId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedCreativeId(id);
              const c = creatives.find((x) => x.id === id);
              if (c) {
                setFormData((prev) => ({
                  ...prev,
                  filename: c.name,
                  width: c.width ?? prev.width,
                  height: c.height ?? prev.height,
                }));
              }
            }}
            style={{ width: "100%" }}
          >
            {creatives.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.width}×{c.height}) — {c.kind}
              </option>
            ))}
          </select>
        </div>
      )}

      {placements.length > 0 && (
        <div className="card" style={{ marginBottom: 24, background: "#fef3c7", border: "1px solid #fbbf24" }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
            🏷️ Optional: Match to Trafficking Tag
          </label>
          <select value={selectedPlacementId} onChange={handleSelectPlacement} style={{ width: "100%" }}>
            <option value="">— None —</option>
            {placements.map((p) => (
              <option key={p.id} value={p.id}>
                {p.tag} ({p.dimensions})
              </option>
            ))}
          </select>
          <div style={{ fontSize: "0.85em", color: "#78350f", marginTop: 6, fontStyle: "italic" }}>
            Mojo detected {placements.length} placement(s) from your media plan. Select one to validate dimensions and tag requirements.
          </div>
        </div>
      )}

      {gsheetUrl.trim() === "" && (
        <div className="card" style={{ marginBottom: 24, background: "#f0f9ff", border: "1px solid #3b82f6" }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>🔗 Optional: Google Sheet URL</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={gsheetUrl}
              onChange={(e) => setGsheetUrl(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="secondary-btn"
              onClick={() => {
                if (gsheetUrl.trim()) runDigest([], gsheetUrl);
              }}
            >
              Load
            </button>
          </div>
          <div style={{ fontSize: "0.85em", color: "#1e40af", marginTop: 6 }}>
            Paste a public Google Sheets link to import trafficking tags directly.
          </div>
        </div>
      )}

      <div className="grid">
        <div className="form-area">
          <div className="card">
            <h2>Creative Specs</h2>

            <div className="form-group">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span>Platforms to Validate</span>
                <button className="secondary-btn small" onClick={() => setSelectedPlatforms([])}>Clear All</button>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, maxHeight: 240, overflowY: "auto", border: "1px solid #ddd", padding: 10, borderRadius: 8 }}>
                {Object.values(Platform).map((p) => (
                  <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9em" }}>
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(p)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedPlatforms((prev) => [...prev, p]);
                        else setSelectedPlatforms((prev) => prev.filter((x) => x !== p));
                      }}
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Filename</label>
              <input type="text" value={formData.filename} onChange={(e) => setFormData({ ...formData, filename: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Campaign Name (Optional)</label>
              <input type="text" value={formData.campaign_name} onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })} />
            </div>

            <div className="row">
              <div className="form-group">
                <label>Width</label>
                <input type="number" value={formData.width} onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>Height</label>
                <input type="number" value={formData.height} onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })} />
              </div>
            </div>

            <div className="form-group">
              <label>Text Density</label>
              <select value={formData.text_density} onChange={(e) => setFormData({ ...formData, text_density: e.target.value as any })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label>Objective</label>
              <select value={formData.campaign_objective} onChange={(e) => setFormData({ ...formData, campaign_objective: e.target.value as any })}>
                <option value="awareness">Awareness</option>
                <option value="demand_gen">Demand Gen</option>
              </select>
            </div>

            <button onClick={handleRun} className="primary-btn">Run Pre-Flight Check</button>

            <div className="form-group" style={{ marginTop: 10 }}>
              <label>View Platform Report</label>
              <select value={viewPlatform} onChange={(e) => setViewPlatform(e.target.value as Platform)}>
                {selectedPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <div style={{ fontSize: "0.8em", color: "#666", marginTop: 4 }}>Run once, then flip between platform views.</div>
            </div>
          </div>
        </div>

        <div className="results-area">
          {scanning && (
            <div className="card scanning-card">
              <div className="scanning-indicator">
                <div className="scanning-spinner"></div>
                <div className="scanning-text">
                  <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Analyzing Creative...</div>
                  <div style={{ color: "#6b7280", fontSize: 14 }}>{scanProgress}</div>
                </div>
              </div>
            </div>
          )}

          {!scanning && primaryReport && (
            <>
              <div className="card">
                <h2>Trafficking Pre-Flight</h2>
                <p style={{ marginTop: -10, color: "#666", fontSize: "0.9em", marginBottom: 20 }}>
                  Validates creative specs before platform submission — catches rejections, applies safe fixes, prevents wasted spend.
                </p>

                {/* Intelligent summary badge */}
                {primaryReport.fixes.length > 0 && (
                  <div className="mojo-badge">
                    <span className="badge-icon">🧠</span>
                    <span>
                      Mojo detected <strong>{primaryReport.issues.length} issue(s)</strong> and 
                      auto-fixed <strong>{primaryReport.fixes.length}</strong>
                    </span>
                  </div>
                )}

                <div className="summary-grid">
                  <div className="stat">
                    <span className="label">Flight Status</span>
                    <span className={`value ${primaryReport.status}`}>{primaryReport.status} {getStatusIcon(primaryReport.status)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Flagged</span>
                    <span className="value">{primaryReport.issues.length}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Auto-Fixed</span>
                    <span className="value">{primaryReport.fixes.length}</span>
                  </div>
                  <div className="stat full-width">
                    <span className="label">Top Risk</span>
                    <span className="value">{primaryReport.issues[0] || "None"}</span>
                  </div>
                  <div className="stat full-width" style={{ background: "#f9fafb" }}>
                    <span className="label">Next Step</span>
                    <span className="value">{getNextAction(primaryReport.status)}</span>
                  </div>
                </div>
              </div>

              {primaryReport && lastBefore && primaryReport.fixes.length > 0 && (
                <div className={`card magic-card ${magicApplied ? "magic-applied" : ""}`}>
                  <div>
                    <h2 style={{ margin: 0 }}>✨ Auto-Fix Available</h2>
                    <div className="magic-sub">One-click to apply Mojo's safe corrections and improve trafficking readiness.</div>
                  </div>

                  <div className="before-after">
                    <div className="pane">
                      <div className="pane-title">Current</div>
                      <div className="kv"><span>File</span><code>{lastBefore.filename}</code></div>
                      <div className="kv"><span>Dims</span><code>{lastBefore.width}×{lastBefore.height}</code></div>
                    </div>

                    <div className="arrow">→</div>

                    <div className="pane">
                      <div className="pane-title">Fixed</div>
                      <div className="kv"><span>File</span><code>{primaryReport.filename}</code></div>
                      <div className="kv"><span>Dims</span><code>{primaryReport.width}×{primaryReport.height}</code></div>
                    </div>
                  </div>

                  {/* Progressive reveal of fixes */}
                  {revealedFixes > 0 && (
                    <div className="fixes-reveal">
                      {primaryReport.fixes.slice(0, revealedFixes).map((fix, i) => (
                        <div key={i} className="fix-item" style={{ animationDelay: `${i * 100}ms` }}>
                          ✓ {fix}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="magic-actions">
                    <button className="magic-btn" onClick={applyMagicFixes} disabled={magicApplied}>
                      {magicApplied ? "✅ Fixes Applied" : "✨ Apply Auto-Fixes"}
                    </button>
                    <div className="magic-notes">
                      {primaryReport.fixes.length} fix{primaryReport.fixes.length === 1 ? "" : "es"} ready • Zero risk
                    </div>
                  </div>
                </div>
              )}

              <div className="card">
                <h2>Detailed Report</h2>
                <div><strong>Asset:</strong> <code>{primaryReport.filename}</code></div>

                {primaryReport.issues.length > 0 && (
                  <div className="report-section">
                    <h3>⚠️ Flags (Manual Review Required)</h3>
                    <ul>
                      {primaryReport.issues.map((issue, i) => (
                        <li key={i}>
                          <strong>{issue}</strong>
                          <div style={{ fontSize: "0.85em", color: "#555", marginTop: 2, fontStyle: "italic" }}>
                            {getBusinessContext(issue)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {primaryReport.fixes.length > 0 && (
                  <div className="report-section" style={{ borderTop: "2px solid #e0e0e0", marginTop: 20 }}>
                    <h3>✅ Mojo Auto-Corrections</h3>
                    <ul style={{ color: "#16a34a", fontWeight: 700 }}>
                      {primaryReport.fixes.map((fix, i) => <li key={i}>{fix}</li>)}
                    </ul>
                  </div>
                )}

                {primaryReport.status === Severity.PASS && <div className="success-msg">✅ Clear to traffic!</div>}
              </div>
            </>
          )}

          {!scanning && !primaryReport && (
            <div className="card" style={{ opacity: 0.75 }}>
              <h2>Trafficking Pre-Flight</h2>
              <p style={{ marginTop: -10, color: "#666", fontSize: "0.9em", marginBottom: 20 }}>
                Validates creative specs before platform submission — catches rejections, applies safe fixes, prevents wasted spend.
              </p>
              <div className="summary-grid">
                <div className="stat">
                  <span className="label">Flight Status</span>
                  <span className="value" style={{ color: "#999" }}>PENDING ⏳</span>
                </div>
                <div className="stat"><span className="label">Flagged</span><span className="value">--</span></div>
                <div className="stat"><span className="label">Auto-Fixed</span><span className="value">--</span></div>
                <div className="stat full-width"><span className="label">Top Risk</span><span className="value" style={{ color: "#999", fontStyle: "italic" }}>Upload creative to analyze</span></div>
                <div className="stat full-width" style={{ background: "#f5f5f5" }}><span className="label">Next Step</span><span className="value">run pre-flight check</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
