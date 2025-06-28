'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { User } from '@/lib/types';
import { amiriFont } from '@/lib/amiri-font';

// PNG Data URI for the logo, as SVG is not supported by default in jsPDF
const logoPngDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHySURBVGhD7Zk/axRBFMc/BF1EBEUnwUBILJRIwUQsRAuxsDARS1s7xVpI2CgYwRbSwkYsxRJYpLQQBBH8B2IkkkAQjYgFwczu7d7bu5O5gX/Znd159/x5c3Z3kCwpqSkjD8gA5AHyQJ8ywPUEeQYyPxoYgF3gBvgAdoDXC/gBvAA79z8bYBX4A3wENsA+MBv4W983gEngNXCAG+AGaB+kPZAbwFvgG9B+gVbAC9B+PftwATgI3AEvgR3Qfv37IUAz8AD4ANwCt0H79u4H+ADkQWfAArAEnAAvQftV7r+BvAJZkC2aADsBq8AtUANqgZ+gHfrsFzANzAH3wA+gHfr8FjAErALnQA1oB76Cdkv3jwOjwAFwGZgCdUvX/wgcAmfAOfAYdEkP3wJ+g3ZK2+gO0kY8Ab4H/QC+B5YAL4HXwFvgG/A26Z4WvgfMkoWvgWfAOTAKbAOXwDmwCjwHvhbt1z/ftk9/gM/AGeAuaN9QG7wK/QyOgcNgNrgK3AdN6P83wDqwbzC/gBvAOdC+6aO3wDHgBPhH+4b+5VfgC/AZ6BqEaX0fNIP5+2D+AbhpmtD+aTftV9dBPyaodl3gC1Q7FhT3C9Q77xR3B6odv4PijmO1k3eG4k4jAZIBSAZABkAGQAaADIAMgAwAGQAZADIAMgBkAGQAZABkAGQAZADIAGQAyADIAMgAyADIAMgAyADIAMgAyADIAMgAyADIAMgAyADIAMgAyADIAMgAyADIALABkAGQAiANkA5AMgAwAGQAZABlAHyD/Acj9s4/0AMwaAAAAAElFTkSuQmCC';


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
  doc.addImage(logoPngDataUri, 'PNG', pageWidth - 28, 12, 14, 14);

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
