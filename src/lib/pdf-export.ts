'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { User } from '@/lib/types';
import { amiriFont } from '@/lib/amiri-font';

const logoSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-primary"><path d="M12 2L2 22H22L12 2Z" stroke="#0F2C59" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 11L7 22" stroke="#0F2C59" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 11L17 22" stroke="#0F2C59" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8.5 18H15.5" stroke="#0F2C59" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

interface ExportOptions {
  title: string;
  user: User;
  columns: string[];
  rows: (string | number)[][];
  filename: string;
}

export const exportToPdf = ({
  title,
  user,
  columns,
  rows,
  filename,
}: ExportOptions) => {
  const doc = new jsPDF();

  // Add Amiri font for Arabic support
  try {
    doc.addFileToVFS('Amiri-Regular.ttf', amiriFont);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    doc.setFont('Amiri');
  } catch (e) {
    console.error("Could not add font to PDF", e);
  }

  // Header
  const today = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Logo
  const svgAsDataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(logoSvg)))}`;
  doc.addImage(svgAsDataUri, 'SVG', pageWidth - 28, 12, 14, 14);

  // Title
  doc.setFontSize(10);
  doc.text('مجموعة عال', 20, 20, { align: 'left' });
  doc.setFontSize(18);
  doc.text(title, pageWidth / 2, 28, { align: 'center' });

  // Footer
  doc.setFontSize(10);
  doc.text(
    `تاريخ التصدير: ${today}`,
    pageWidth - 20,
    pageHeight - 10,
    { align: 'right' }
  );
  doc.text(`تم التصدير بواسطة: ${user.name}`, 20, pageHeight - 10, {
    align: 'left',
  });

  // Table
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 40,
    styles: {
      font: 'Amiri',
      halign: 'right', // Align all cell text to the right for Arabic
    },
    headStyles: {
      fillColor: [15, 44, 89], // Primary color #0F2C59
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center', // Center align header text
    },
    alternateRowStyles: {
      fillColor: [244, 244, 245], // Muted color from globals.css
    },
  });

  doc.save(`${filename}.pdf`);
};
