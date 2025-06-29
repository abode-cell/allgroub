'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { User } from '@/lib/types';
// Custom Arabic font and logo have been removed to fix export crashes.
// A standard font will be used as a fallback.

const exportToPdf = ({ title, user, columns, rows, filename }: { title: string; user: User; columns: string[]; rows: (string | number)[][]; filename: string; }) => {
  const doc = new jsPDF();
  
  // The custom font code has been removed to prevent crashing.

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  // Add the header on each page
  const header = () => {
    // Logo is removed to prevent crashes.

    // Title
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text('مجموعة عال', pageWidth - 20, 20, { align: 'right' });
    doc.setFontSize(18);
    doc.text(title, pageWidth / 2, 28, { align: 'center' });
  };
  
  // Add the footer on each page
  const footer = (data: any) => {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`تاريخ التصدير: ${today}`, pageWidth - data.settings.margin.right, pageHeight - 10, { align: 'right' });
    doc.text(`تم التصدير بواسطة: ${user.name}`, data.settings.margin.left, pageHeight - 10, { align: 'left' });
    doc.text(`صفحة ${data.pageNumber} من ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 40,
    styles: {
      // font: 'Amiri', // Font removed to fix crash
      halign: 'center', 
    },
    headStyles: {
      fillColor: [15, 44, 89], // Primary color #0F2C59
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [244, 244, 245], // Muted color
    },
    didDrawPage: (data) => {
      header();
      footer(data);
    },
    margin: { top: 40 }
  });

  doc.save(`${filename}.pdf`);
};

export { exportToPdf };
