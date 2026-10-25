import { jsPDF } from 'jspdf';

export async function exportMinutesToPDF({ roomCode, cards, annotationsMap = {} }) {
  if (!cards || cards.length === 0) {
    alert('No meeting minutes cards to export yet.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Cover / Header Banner
  doc.setFillColor(7, 8, 12);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('MUDRĀ', margin, 70);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Spatial Presentation & Meeting Minutes Report', margin, 95);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Room #${roomCode} • Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, 115);

  doc.setDrawColor(255, 255, 255, 0.1);
  doc.setLineWidth(1);
  doc.line(margin, 130, pageWidth - margin, 130);

  let currentY = 160;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const userAnnotation = annotationsMap[card.id] || {};
    const annotatedImage = userAnnotation.imageData || card.image_data;
    const personalNotes = userAnnotation.note || '';

    // Check if new page is needed
    if (currentY + 360 > pageHeight - margin) {
      doc.addPage();
      doc.setFillColor(7, 8, 12);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      currentY = 50;
    }

    // Card Header Bar
    doc.setFillColor(18, 20, 29);
    doc.roundedRect(margin, currentY, contentWidth, 32, 6, 6, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Slide #${card.slide_index} • ${card.title}`, margin + 12, currentY + 20);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(card.timestamp, pageWidth - margin - 70, currentY + 20);

    currentY += 42;

    // Slide Image Snapshot or Resource Link Card
    if (card.type === 'link' || (!annotatedImage && card.url)) {
      doc.setFillColor(6, 78, 59); // Emerald-900
      doc.roundedRect(margin, currentY, contentWidth, 54, 4, 4, 'F');

      doc.setTextColor(52, 211, 153); // Emerald-400
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('DISPATCHED STAGE RESOURCE URL:', margin + 12, currentY + 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('courier', 'bold');
      doc.text(card.url || '', margin + 12, currentY + 38);

      currentY += 66;

      if (card.takeaway) {
        doc.setTextColor(203, 213, 225);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const takeawayLines = doc.splitTextToSize(card.takeaway, contentWidth);
        doc.text(takeawayLines, margin, currentY);
        currentY += takeawayLines.length * 12 + 8;
      }
    } else if (annotatedImage) {
      try {
        const imgWidth = contentWidth * 0.55;
        const imgHeight = (imgWidth * 9) / 16;
        doc.addImage(annotatedImage, 'JPEG', margin, currentY, imgWidth, imgHeight);

        // Right side details: Takeaway & Action Items
        const textX = margin + imgWidth + 20;
        const textWidth = contentWidth - imgWidth - 20;
        let textY = currentY + 12;

        doc.setTextColor(245, 158, 11); // Amber
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('CORE TAKEAWAY', textX, textY);
        textY += 14;

        doc.setTextColor(226, 232, 240);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const takeawayLines = doc.splitTextToSize(card.takeaway || '', textWidth);
        doc.text(takeawayLines, textX, textY);
        textY += takeawayLines.length * 12 + 10;

        if (card.action_items && card.action_items.length > 0) {
          doc.setTextColor(16, 185, 129); // Emerald
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('ACTION ITEMS', textX, textY);
          textY += 14;

          doc.setTextColor(203, 213, 225);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          card.action_items.forEach((item) => {
            const itemLines = doc.splitTextToSize(`• ${item}`, textWidth);
            doc.text(itemLines, textX, textY);
            textY += itemLines.length * 11 + 4;
          });
        }

        currentY += imgHeight + 15;
      } catch (err) {
        console.warn('Failed to embed slide image in PDF:', err);
        currentY += 40;
      }
    }

    // Personal Notes (if attendee added any)
    if (personalNotes.trim()) {
      doc.setFillColor(255, 255, 255, 0.03);
      doc.roundedRect(margin, currentY, contentWidth, 38, 4, 4, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.text(`Personal Notes: ${personalNotes}`, margin + 10, currentY + 22);
      currentY += 48;
    } else {
      currentY += 15;
    }

    // Divider
    doc.setDrawColor(255, 255, 255, 0.05);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 25;
  }

  doc.save(`Mudra_Meeting_Minutes_Room_${roomCode}.pdf`);
}
