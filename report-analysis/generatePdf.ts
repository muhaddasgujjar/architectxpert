import PDFDocument from "pdfkit";
import type { ClusterResult } from "./clustering";

function formatPKR(amount: number): string {
  if (amount >= 10000000) return `PKR ${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `PKR ${(amount / 100000).toFixed(2)} Lac`;
  return `PKR ${amount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function drawScoreBar(doc: any, x: number, y: number, width: number, score: number, color: string) {
  doc.roundedRect(x, y, width, 7, 3).fill("#1a1a2e");
  const fillWidth = Math.max(3, (score / 100) * width);
  doc.roundedRect(x, y, fillWidth, 7, 3).fill(color);
}

function getScoreColor(score: number): string {
  if (score >= 85) return "#22c55e";
  if (score >= 70) return "#3b82f6";
  if (score >= 55) return "#fbbf24";
  return "#ef4444";
}

function drawFooter(doc: any, pageNum: number) {
  const footerY = doc.page.height - 32;
  doc.rect(0, footerY - 3, doc.page.width, 35).fill("#0d0d20");
  doc.fontSize(6.5).font("Helvetica").fillColor("#555570")
    .text("ArchitectXpert — AI-Powered Architectural Analysis Platform", 50, footerY + 2)
    .text("Auto-generated report. Consult a licensed architect for final decisions.", 50, footerY + 12);
  doc.fontSize(6.5).fillColor("#555570")
    .text(`Page ${pageNum} of 2`, doc.page.width - 120, footerY + 2, { width: 70, align: "right" });
}

export function generateReport(result: ClusterResult, fileName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 35, bottom: 35, left: 45, right: 45 },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pw = doc.page.width - 90;
    const blue = "#3b82f6";
    const gold = "#fbbf24";
    const bg = "#0a0a14";
    const card = "#111122";
    const white = "#f0f0f5";
    const muted = "#8888aa";
    const dim = "#555570";

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(bg);

    doc.rect(0, 0, doc.page.width, 110).fill("#0d0d20");
    doc.rect(0, 108, doc.page.width, 2).fill(blue);

    doc.fontSize(24).font("Helvetica-Bold").fillColor(white).text("ArchitectXpert", 45, 25);
    doc.fontSize(9).font("Helvetica").fillColor(blue).text("AI-POWERED FLOORPLAN ANALYSIS REPORT", 45, 52);

    doc.fontSize(7).fillColor(muted)
      .text(`Generated: ${new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })} | Source: ${fileName}`, 45, 72)
      .text(`Model: GPT-4o Vision + K-Means Clustering (k=5) | Cluster #${result.clusterId}`, 45, 84);

    doc.fontSize(7).fillColor(dim).text("CONFIDENTIAL", doc.page.width - 120, 35, { width: 75, align: "right" });

    let y = 125;

    doc.roundedRect(45, y, pw, 48, 5).fill(card);
    doc.roundedRect(45, y, 3, 48, 1).fill(blue);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(blue).text("LAYOUT CLASSIFICATION", 60, y + 10);
    doc.fontSize(16).font("Helvetica-Bold").fillColor(white).text(result.clusterLabel, 60, y + 24);
    doc.fontSize(7).font("Helvetica").fillColor(muted).text(`${result.complexity} layout · ${result.estimatedRooms} rooms · ${result.layoutType}`, 60, y + 40);
    y += 58;

    const mw = (pw - 12) / 4;
    [
      { l: "TOTAL AREA", v: `${result.totalArea.toLocaleString()} sqft`, c: white },
      { l: "COVERED", v: `${result.coveredArea.toLocaleString()} sqft`, c: white },
      { l: "EST. COST", v: formatPKR(result.estimatedCostPKR), c: gold },
      { l: "ENERGY", v: result.energyEfficiency, c: "#22c55e" },
    ].forEach((m, i) => {
      const mx = 45 + i * (mw + 4);
      doc.roundedRect(mx, y, mw, 42, 4).fill(card);
      doc.fontSize(6).font("Helvetica").fillColor(dim).text(m.l, mx + 8, y + 8, { width: mw - 16 });
      doc.fontSize(12).font("Helvetica-Bold").fillColor(m.c).text(m.v, mx + 8, y + 22, { width: mw - 16 });
    });
    y += 52;

    doc.fontSize(9).font("Helvetica-Bold").fillColor(white).text("Performance Scores", 45, y);
    y += 15;

    const scores = [
      { label: "Traffic Flow", score: result.flowScore },
      { label: "Space Efficiency", score: result.spaceEfficiency },
      { label: "Ventilation", score: result.ventilationScore },
      { label: "Natural Light", score: result.naturalLightScore },
      { label: "Structural Integrity", score: result.structuralIntegrity },
      { label: "Accessibility", score: result.accessibilityScore },
    ];
    const scw = (pw - 16) / 2;
    scores.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sx = 45 + col * (scw + 16);
      const sy = y + row * 22;
      doc.fontSize(7).font("Helvetica").fillColor(muted).text(s.label, sx, sy, { width: 90 });
      doc.fontSize(7).font("Helvetica-Bold").fillColor(getScoreColor(s.score)).text(`${s.score}%`, sx + 90, sy, { width: 30 });
      drawScoreBar(doc, sx + 125, sy + 1, scw - 135, s.score, getScoreColor(s.score));
    });
    y += Math.ceil(scores.length / 2) * 22 + 12;

    doc.fontSize(9).font("Helvetica-Bold").fillColor(white).text("Room Distribution", 45, y);
    y += 14;

    doc.roundedRect(45, y, pw, 15, 2).fill("#151530");
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(dim)
      .text("ROOM", 55, y + 4)
      .text("AREA (SQFT)", 280, y + 4)
      .text("RATING", 400, y + 4);
    y += 17;

    const maxRooms = Math.min(result.roomDistribution.length, 10);
    result.roomDistribution.slice(0, maxRooms).forEach((room, i) => {
      const rowBg = i % 2 === 0 ? card : "#0e0e22";
      doc.roundedRect(45, y, pw, 16, 1).fill(rowBg);
      doc.fontSize(7).font("Helvetica").fillColor(white).text(room.name, 55, y + 4);
      doc.fontSize(7).font("Helvetica").fillColor(muted).text(room.area.toString(), 280, y + 4);
      const rc = room.rating === "Excellent" ? "#22c55e" : room.rating === "Good" ? blue : gold;
      doc.fontSize(6.5).font("Helvetica-Bold").fillColor(rc).text(room.rating.toUpperCase(), 400, y + 4);
      y += 17;
    });

    y += 10;

    doc.roundedRect(45, y, pw, 50, 5).fill(card);
    doc.roundedRect(45, y, pw, 3, 1).fill(gold);
    doc.fontSize(7).font("Helvetica").fillColor(dim).text("ESTIMATED CONSTRUCTION COST", 58, y + 10);
    doc.fontSize(18).font("Helvetica-Bold").fillColor(gold).text(formatPKR(result.estimatedCostPKR), 58, y + 22);
    doc.fontSize(7).font("Helvetica").fillColor(muted)
      .text(`@ PKR ${result.costPerSqft.toLocaleString()}/sqft · ${result.clusterLabel}`, 58, y + 42);

    drawFooter(doc, 1);

    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(bg);

    doc.rect(0, 0, doc.page.width, 50).fill("#0d0d20");
    doc.rect(0, 48, doc.page.width, 2).fill(blue);
    doc.fontSize(14).font("Helvetica-Bold").fillColor(white).text("AI Recommendations & Analysis", 45, 18);

    y = 65;

    doc.fontSize(9).font("Helvetica-Bold").fillColor(white).text("Recommendations", 45, y);
    y += 15;

    const maxRecs = Math.min(result.recommendations.length, 8);
    result.recommendations.slice(0, maxRecs).forEach((rec, i) => {
      const recText = rec.length > 150 ? rec.substring(0, 147) + "..." : rec;
      doc.roundedRect(45, y, pw, 28, 3).fill(card);
      doc.circle(58, y + 14, 3.5).fill(blue);
      doc.fontSize(6).font("Helvetica-Bold").fillColor("#0a0a14").text(`${i + 1}`, 54.5, y + 11, { width: 7, align: "center" });
      doc.fontSize(7).font("Helvetica").fillColor(white).text(recText, 72, y + 6, { width: pw - 40, lineGap: 2 });
      y += 32;
    });

    if (result.warnings && result.warnings.length > 0) {
      y += 8;
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#ef4444").text("Warnings", 45, y);
      y += 14;

      const maxWarnings = Math.min(result.warnings.length, 4);
      result.warnings.slice(0, maxWarnings).forEach((warning) => {
        const wText = warning.length > 140 ? warning.substring(0, 137) + "..." : warning;
        doc.roundedRect(45, y, pw, 22, 3).fill("#1a0a0a");
        doc.roundedRect(45, y, 2.5, 22, 1).fill("#ef4444");
        doc.fontSize(7).font("Helvetica").fillColor("#ff6b6b").text(wText, 58, y + 6, { width: pw - 25 });
        y += 26;
      });
    }

    y += 12;
    doc.fontSize(9).font("Helvetica-Bold").fillColor(white).text("Project Summary", 45, y);
    y += 15;

    const summaryItems = [
      ["Layout Type", result.clusterLabel],
      ["Complexity", result.complexity],
      ["Total Area", `${result.totalArea.toLocaleString()} sqft`],
      ["Covered Area", `${result.coveredArea.toLocaleString()} sqft`],
      ["Rooms Detected", result.estimatedRooms.toString()],
      ["Cost per Sqft", `PKR ${result.costPerSqft.toLocaleString()}`],
      ["Total Estimated Cost", formatPKR(result.estimatedCostPKR)],
      ["Energy Rating", result.energyEfficiency],
      ["Source File", fileName],
      ["Analysis Date", new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })],
    ];

    const sumColW = (pw - 8) / 2;
    summaryItems.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sx = 45 + col * (sumColW + 8);
      const sy = y + row * 18;
      doc.roundedRect(sx, sy, sumColW, 16, 2).fill(i % 4 < 2 ? card : "#0e0e22");
      doc.fontSize(6.5).font("Helvetica").fillColor(dim).text(item[0], sx + 8, sy + 4);
      doc.fontSize(6.5).font("Helvetica-Bold").fillColor(white).text(item[1], sx + sumColW / 2, sy + 4, { width: sumColW / 2 - 8, align: "right" });
    });
    y += Math.ceil(summaryItems.length / 2) * 18 + 12;

    doc.roundedRect(45, y, pw, 32, 4).fill(card);
    doc.fontSize(6.5).font("Helvetica").fillColor(dim)
      .text("ANALYSIS METHOD", 58, y + 6);
    doc.fontSize(7).font("Helvetica").fillColor(muted)
      .text("GPT-4o Vision AI for image analysis and room identification + K-Means Unsupervised Clustering (k=5) for layout classification.", 58, y + 16, { width: pw - 30 });

    y += 42;
    doc.roundedRect(45, y, pw, 22, 3).fill("#0d1a0d");
    doc.roundedRect(45, y, 2.5, 22, 1).fill("#22c55e");
    doc.fontSize(7).font("Helvetica").fillColor("#22c55e")
      .text("All cost estimates use 2024-25 Pakistani market rates (Punjab/Islamabad region). Reference: PBC 2021, LDA/CDA building codes.", 58, y + 7, { width: pw - 25 });

    drawFooter(doc, 2);

    doc.end();
  });
}
