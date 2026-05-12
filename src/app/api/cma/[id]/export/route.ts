import { prisma } from "@/lib/db";
import { requireAuth, jsonError } from "@/lib/api-helpers";

function fmt(n: unknown): string {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString("en-CA", { maximumFractionDigits: 0 });
}

function addr(l: { streetNumber?: string | null; streetName?: string | null; unitNumber?: string | null; city?: string | null }): string {
  const parts = [l.unitNumber ? `${l.unitNumber}-` : "", l.streetNumber, l.streetName].filter(Boolean).join(" ");
  return l.city ? `${parts}, ${l.city}` : parts;
}

function stats(values: number[]): { min: number; max: number; avg: number; median: number } | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length),
    median: sorted.length % 2 === 0
      ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : sorted[Math.floor(sorted.length / 2)],
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const report = await prisma.cmaReport.findFirst({
    where: { id, createdByUserId: auth.user.userId },
    include: {
      comps: { orderBy: { sortOrder: "asc" }, include: { listing: true } },
      soldComps: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!report) return jsonError("CMA report not found", 404);

  const activeListings = report.comps.map((c) => c.listing);
  const activePrices = activeListings.map((l) => Number(l.listPrice));
  const activePpsf = activeListings.filter((l) => l.sqft && Number(l.sqft) > 0).map((l) => Number(l.listPrice) / Number(l.sqft));
  const activeDom = activeListings.map((l) => l.daysOnMarket ?? 0);

  const soldPrices = report.soldComps.map((s) => Number(s.soldPrice));
  const soldPpsf = report.soldComps.filter((s) => s.sqft && Number(s.sqft) > 0).map((s) => Number(s.soldPrice) / Number(s.sqft));
  const soldDom = report.soldComps.map((s) => s.daysOnMarket ?? 0);

  const ap = stats(activePrices);
  const appf = stats(activePpsf);
  const ad = stats(activeDom);
  const sp = stats(soldPrices);
  const sppf = stats(soldPpsf);
  const sd = stats(soldDom);

  const date = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CMA Report — ${report.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; font-size: 12px; line-height: 1.5; padding: 40px; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin: 24px 0 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
  .subject { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
  .subject h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px; }
  .subject .addr { font-size: 16px; font-weight: 600; }
  .subject .details { color: #475569; margin-top: 4px; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .stat-card h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px; }
  .stat-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .stat-label { color: #94a3b8; }
  .stat-val { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; padding: 8px 6px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 6px; border-bottom: 1px solid #f1f5f9; }
  .notice { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; color: #92400e; margin: 20px 0; font-size: 11px; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; text-align: center; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
<h1>Comparative Market Analysis</h1>
<p class="meta">${report.name} &mdash; Prepared ${date}</p>

${report.subjectAddress ? `
<div class="subject">
  <h3>Subject Property</h3>
  <div class="addr">${report.subjectAddress}</div>
  <div class="details">
    ${[report.subjectPropertyType, report.subjectBedrooms != null ? `${report.subjectBedrooms} bed` : null, report.subjectBathrooms != null ? `${report.subjectBathrooms} bath` : null, report.subjectSqft ? `${Number(report.subjectSqft).toLocaleString()} sqft` : null, report.subjectListPrice ? fmt(Number(report.subjectListPrice)) : null].filter(Boolean).join(" &middot; ")}
  </div>
</div>` : ""}

${activeListings.length > 0 ? `
<h2>Active Comparables (${activeListings.length})</h2>
<div class="stats-grid">
  ${ap ? `<div class="stat-card"><h4>Price Range</h4><div class="stat-row"><span class="stat-label">Min</span><span class="stat-val">${fmt(ap.min)}</span></div><div class="stat-row"><span class="stat-label">Max</span><span class="stat-val">${fmt(ap.max)}</span></div><div class="stat-row"><span class="stat-label">Average</span><span class="stat-val">${fmt(ap.avg)}</span></div><div class="stat-row"><span class="stat-label">Median</span><span class="stat-val">${fmt(ap.median)}</span></div></div>` : ""}
  ${appf ? `<div class="stat-card"><h4>Price / Sqft</h4><div class="stat-row"><span class="stat-label">Min</span><span class="stat-val">${fmt(appf.min)}</span></div><div class="stat-row"><span class="stat-label">Max</span><span class="stat-val">${fmt(appf.max)}</span></div><div class="stat-row"><span class="stat-label">Average</span><span class="stat-val">${fmt(appf.avg)}</span></div><div class="stat-row"><span class="stat-label">Median</span><span class="stat-val">${fmt(appf.median)}</span></div></div>` : ""}
  ${ad ? `<div class="stat-card"><h4>Days on Market</h4><div class="stat-row"><span class="stat-label">Min</span><span class="stat-val">${ad.min}</span></div><div class="stat-row"><span class="stat-label">Max</span><span class="stat-val">${ad.max}</span></div><div class="stat-row"><span class="stat-label">Average</span><span class="stat-val">${ad.avg}</span></div><div class="stat-row"><span class="stat-label">Median</span><span class="stat-val">${ad.median}</span></div></div>` : ""}
</div>
<table>
  <thead><tr><th>Address</th><th>MLS#</th><th>Type</th><th>Bed/Bath</th><th>Sqft</th><th>List Price</th><th>$/sqft</th><th>DOM</th></tr></thead>
  <tbody>
    ${activeListings.map((l) => {
      const ppsf = l.sqft && Number(l.sqft) > 0 ? fmt(Number(l.listPrice) / Number(l.sqft)) : "—";
      return `<tr><td>${addr(l)}</td><td>${l.mlsNumber}</td><td>${l.propertyType || "—"}</td><td>${l.bedrooms ?? "—"}/${l.bathrooms ?? "—"}</td><td>${l.sqft ? Number(l.sqft).toLocaleString() : "—"}</td><td><strong>${fmt(l.listPrice)}</strong></td><td>${ppsf}</td><td>${l.daysOnMarket ?? "—"}</td></tr>`;
    }).join("\n    ")}
  </tbody>
</table>` : ""}

${report.soldComps.length > 0 ? `
<h2>Sold Comparables (${report.soldComps.length})</h2>
<div class="stats-grid">
  ${sp ? `<div class="stat-card"><h4>Sold Price Range</h4><div class="stat-row"><span class="stat-label">Min</span><span class="stat-val">${fmt(sp.min)}</span></div><div class="stat-row"><span class="stat-label">Max</span><span class="stat-val">${fmt(sp.max)}</span></div><div class="stat-row"><span class="stat-label">Average</span><span class="stat-val">${fmt(sp.avg)}</span></div><div class="stat-row"><span class="stat-label">Median</span><span class="stat-val">${fmt(sp.median)}</span></div></div>` : ""}
  ${sppf ? `<div class="stat-card"><h4>Sold Price / Sqft</h4><div class="stat-row"><span class="stat-label">Min</span><span class="stat-val">${fmt(sppf.min)}</span></div><div class="stat-row"><span class="stat-label">Max</span><span class="stat-val">${fmt(sppf.max)}</span></div><div class="stat-row"><span class="stat-label">Average</span><span class="stat-val">${fmt(sppf.avg)}</span></div><div class="stat-row"><span class="stat-label">Median</span><span class="stat-val">${fmt(sppf.median)}</span></div></div>` : ""}
  ${sd ? `<div class="stat-card"><h4>Days on Market</h4><div class="stat-row"><span class="stat-label">Min</span><span class="stat-val">${sd.min}</span></div><div class="stat-row"><span class="stat-label">Max</span><span class="stat-val">${sd.max}</span></div><div class="stat-row"><span class="stat-label">Average</span><span class="stat-val">${sd.avg}</span></div><div class="stat-row"><span class="stat-label">Median</span><span class="stat-val">${sd.median}</span></div></div>` : ""}
</div>
<table>
  <thead><tr><th>Address</th><th>Type</th><th>Bed/Bath</th><th>Sqft</th><th>Sold Price</th><th>$/sqft</th><th>Sold Date</th><th>DOM</th></tr></thead>
  <tbody>
    ${report.soldComps.map((s) => {
      const ppsf = s.sqft && Number(s.sqft) > 0 ? fmt(Number(s.soldPrice) / Number(s.sqft)) : "—";
      return `<tr><td>${s.address}</td><td>${s.propertyType || "—"}</td><td>${s.bedrooms ?? "—"}/${s.bathrooms ?? "—"}</td><td>${s.sqft ? Number(s.sqft).toLocaleString() : "—"}</td><td><strong>${fmt(s.soldPrice)}</strong></td><td>${ppsf}</td><td>${new Date(s.soldDate).toLocaleDateString("en-CA")}</td><td>${s.daysOnMarket ?? "—"}</td></tr>`;
    }).join("\n    ")}
  </tbody>
</table>` : ""}

<div class="notice">
  <strong>Note:</strong> Sold data shown above was entered manually by the agent. Automated sold comparable data from the MLS feed is not yet available under the current IDX license. This feature will be enabled when VOW access is active.
</div>

<div class="footer">
  Prepared by Cory Wong Real Estate &mdash; ${date}<br>
  This CMA is for informational purposes only and should not be considered an appraisal.
</div>

<script class="no-print">window.onload = function() { window.print(); }</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="cma-${report.name.replace(/[^a-zA-Z0-9-_ ]/g, "")}.html"`,
    },
  });
}
