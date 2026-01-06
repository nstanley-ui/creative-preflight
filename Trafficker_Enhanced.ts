export enum Severity {
  PASS = "PASS",
  WARNING = "WARNING",
  BLOCKER = "BLOCKER"
}

export enum Platform {
  LINKEDIN = "LinkedIn",
  META = "Meta",
  GOOGLE = "Google",
  TIKTOK = "TikTok",
  X = "X",
  REDDIT = "Reddit",
  DV360 = "DV360"
}

export type Creative = {
  filename: string;
  platform: Platform;
  width: number;
  height: number;
  text_density: "low" | "medium" | "high";
  campaign_objective: "awareness" | "demand_gen";
  campaign_name?: string;
  placement_tag?: string;

  status: Severity;
  issues: string[];
  fixes: string[];
};

export function createCreative(
  filename: string,
  platform: Platform,
  width: number,
  height: number,
  text_density: "low" | "medium" | "high",
  campaign_objective: "awareness" | "demand_gen",
  campaign_name?: string,
  placement_tag?: string
): Creative {
  return {
    filename,
    platform,
    width,
    height,
    text_density,
    campaign_objective,
    campaign_name,
    placement_tag,
    status: Severity.PASS,
    issues: [],
    fixes: []
  };
}

// Enhanced pre-flight validator with better operator language
export class Trafficker {
  creative: Creative;

  constructor(c: Creative) {
    this.creative = structuredClone(c);
  }

  validate(): Creative {
    const c = this.creative;
    const issues: string[] = [];
    const fixes: string[] = [];

    // Platform-specific requirements
    if ((c.platform === Platform.DV360 || c.platform === Platform.GOOGLE) && !c.placement_tag) {
      issues.push("Missing placement tag (required for programmatic trafficking).");
    }

    // Enhanced aspect ratio validation with specific platform context
    const ratio = c.width / c.height;
    const approx = (a: number, b: number) => Math.abs(a - b) < 0.02;
    
    const standardRatios = [
      { ratio: 1, name: "1:1 (Square)" },
      { ratio: 16/9, name: "16:9 (Landscape)" },
      { ratio: 9/16, name: "9:16 (Story)" },
      { ratio: 1.91, name: "1.91:1 (Feed)" },
      { ratio: 4/5, name: "4:5 (Portrait)" }
    ];

    const matchesStandard = standardRatios.some(sr => approx(ratio, sr.ratio));

    if (!matchesStandard) {
      issues.push(
        `Non-standard aspect ratio ${c.width}:${c.height} (${ratio.toFixed(2)}:1) — Platform may reject or crop unexpectedly.`
      );
    }

    // Text density warnings with business context
    if (c.text_density === "high") {
      if (c.platform === Platform.META) {
        issues.push("High text density on Meta — Triggers 20% text rule, may throttle delivery or increase CPM.");
      } else {
        issues.push("High text density — May reduce quality score and increase cost per result.");
      }
    }

    // Campaign naming best practices
    if (!c.campaign_name || c.campaign_name.trim().length === 0) {
      issues.push("Missing campaign name — Recommended for attribution tracking and reporting breakouts.");
    } else {
      // Check for common naming issues
      if (c.campaign_name.toLowerCase().includes("test") || c.campaign_name.toLowerCase().includes("draft")) {
        issues.push("Campaign name contains 'test' or 'draft' — Confirm this is not a production campaign.");
      }
    }

    // File size warnings for video
    if (c.filename.match(/\.(mp4|mov|webm|m4v)$/i)) {
      // Note: We can't check actual file size in this demo, but we can flag format issues
      if (!c.filename.match(/\.(mp4|mov)$/i) && c.platform === Platform.LINKEDIN) {
        issues.push("LinkedIn prefers MP4 or MOV format for videos — Other formats may have compatibility issues.");
      }
    }

    // Auto-fix: normalize filename (more specific language)
    const orig = c.filename;
    let safe = orig
      .replace(/\s+/g, "_")  // Replace spaces with underscores
      .replace(/__+/g, "_")  // Collapse multiple underscores
      .replace(/[^\w\-_.]/g, "");  // Remove special characters

    // Additional normalization: ensure no leading/trailing underscores
    safe = safe.replace(/^_+|_+$/g, "");

    if (safe !== orig) {
      c.filename = safe;
      fixes.push(`Normalized filename for ad server compatibility: "${orig}" → "${safe}"`);
    }

    // Auto-fix: dimension normalization for common sizes
    if (c.width === 1200 && c.height === 1200) {
      // Already optimal
    } else if (approx(ratio, 1) && (c.width !== 1080 || c.height !== 1080)) {
      // Suggest standard square size
      if (c.width > 1080 && c.height > 1080) {
        fixes.push(`Dimensions ${c.width}×${c.height} exceed standard. Consider 1080×1080 for optimal delivery.`);
      }
    }

    // Detect common dimension typos
    if (c.width === 108 && c.height === 108) {
      c.width = 1080;
      c.height = 1080;
      fixes.push("Auto-corrected likely typo: 108×108 → 1080×1080");
    } else if (c.width === 192 && c.height === 108) {
      c.width = 1920;
      c.height = 1080;
      fixes.push("Auto-corrected likely typo: 192×108 → 1920×1080");
    }

    // Status determination logic
    const hasBlocker = issues.some(i => 
      i.includes("Non-standard aspect ratio") || 
      i.includes("Missing placement tag") ||
      i.includes("may reject")
    );
    
    const hasWarning = issues.length > 0 && !hasBlocker;

    c.issues = issues;
    c.fixes = fixes;
    c.status = hasBlocker ? Severity.BLOCKER : hasWarning ? Severity.WARNING : Severity.PASS;

    // Special case: If we have fixes and would otherwise be PASS, keep as WARNING to prompt review
    if (fixes.length > 0 && c.status === Severity.PASS) {
      c.status = Severity.WARNING;
    }

    return c;
  }
}
