import jsPDF from "jspdf";
import { OfflineCorridorPack } from "../types/offline";

export function generateSurvivalKitPDF(pack: OfflineCorridorPack): { success: boolean; filename: string } {
  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    const cachedDateStr = new Date(pack.updatedAt).toLocaleString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    // --- 1. HEADER BANNER ---
    doc.setFillColor(24, 24, 27); // Dark zinc
    doc.rect(0, 0, pageWidth, 42, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("TRAVEL GUARDIAN", margin, 18);

    doc.setFontSize(10);
    doc.setTextColor(52, 211, 153); // Emerald accent
    doc.text("OFFLINE SURVIVAL & EMERGENCY KIT", margin, 26);

    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170); // Muted
    doc.text(`[CACHED DATASET — SOURCE TIMESTAMP: ${cachedDateStr} IST]`, margin, 34);

    let y = 52;

    // --- 2. JOURNEY OVERVIEW CARD ---
    doc.setFillColor(244, 244, 245);
    doc.roundedRect(margin, y, contentWidth, 34, 3, 3, "F");

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`${pack.origin.name}  ➔  ${pack.destination.name}`, margin + 5, y + 9);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Corridor: ${pack.packName}`, margin + 5, y + 16);
    doc.text(`Travel Mode: ${pack.travelMode}  |  Route: ${pack.route.name}`, margin + 5, y + 22);
    doc.text(`Distance: ${pack.route.distance}  |  Cached Travel Estimate: ${pack.route.time}`, margin + 5, y + 28);

    // Safety Fit Pill
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(pageWidth - margin - 35, y + 6, 30, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Fit: ${pack.route.safetyScore}/100`, pageWidth - margin - 30, y + 13);

    y += 44;

    // --- 3. NATIONAL EMERGENCY & RESCUE PROTOCOLS ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38); // Danger red
    doc.text("EMERGENCY RESPONSE PROTOCOLS (INDIA)", margin, y);
    y += 6;

    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");

    doc.setFontSize(9);
    doc.setTextColor(153, 27, 27);
    doc.text(`National Emergency Hotline (Police, Fire, Medical): Dial 112`, margin + 5, y + 6);
    doc.text(`Women Travel Helpline: Dial 1091   |   National Ambulance: Dial 108`, margin + 5, y + 12);
    doc.text(`Consular Emergency Line: ${pack.emergencyInfo.consularHelpline || "+91 11 2419 8000"}`, margin + 5, y + 18);

    y += 30;

    // --- 4. VERIFIED SAFE HAVENS & HOSPITALS ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("CACHED SAFE HAVENS & MEDICAL NODES", margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text("Notice: Cached static coordinates. Real-time emergency room availability cannot be verified offline.", margin, y);
    y += 6;

    pack.safeHavens.slice(0, 6).forEach((haven) => {
      doc.setFillColor(244, 244, 245);
      doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
      doc.setFontSize(8.5);
      doc.text(`[${haven.type}] ${haven.name}`, margin + 3, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(82, 82, 91);
      const rightText = haven.phone ? `Phone: ${haven.phone}  |  ${haven.distanceAheadText}` : haven.distanceAheadText;
      doc.text(rightText, pageWidth - margin - doc.getTextWidth(rightText) - 3, y + 6);

      y += 12;
    });

    y += 4;

    // --- 5. TURN-BY-TURN OFFLINE DIRECTIONS ---
    if (y > 210) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("OFFLINE TURN-BY-TURN INSTRUCTIONS", margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text("Follow cached milestone instructions. Rerouting is unavailable while disconnected.", margin, y);
    y += 6;

    pack.turnInstructions.forEach((inst, i) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 250 : 245);
      doc.rect(margin, y, contentWidth, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129);
      doc.text(`Step ${inst.stepIndex}`, margin + 3, y + 5.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(24, 24, 27);
      doc.text(inst.instruction.slice(0, 75), margin + 20, y + 5.5);

      doc.setTextColor(113, 113, 122);
      doc.text(inst.distanceText, pageWidth - margin - doc.getTextWidth(inst.distanceText) - 3, y + 5.5);

      y += 9;
    });

    // --- FOOTER ON FINAL PAGE ---
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(161, 161, 170);
    doc.text("Travel Guardian Offline Intelligence • Generated for disconnected highway travel", margin, pageHeight - 8);

    const filename = `Travel_Guardian_Survival_Kit_${pack.origin.name}_to_${pack.destination.name}.pdf`.replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(filename);

    return { success: true, filename };
  } catch (err) {
    console.error("Failed to generate Survival Kit PDF:", err);
    return { success: false, filename: "" };
  }
}
