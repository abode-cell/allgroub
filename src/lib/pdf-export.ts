'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { User } from '@/lib/types';
import { amiriFont } from '@/lib/amiri-font';

// PNG Data URI for the logo, as SVG is not supported by default in jsPDF
const logoPngDataUri = 'data:image/png;base64,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';

// ... other code ...
'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { User } from '@/lib/types';
import { amiriFont } from '@/lib/amiri-font';

// PNG Data URI for the logo, as SVG is not supported by default in jsPDF
const logoPngDataUri = 'data:image/png;base64,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';
type ExportOptions = {
  title: string;
  user: User;
  columns: string[];
  rows: (string | number)[][];
  filename: string;
};

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
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
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
     doc.text(
      `صفحة ${i} من ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }


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
    didDrawPage: (data) => {
        // Footer on each page
        doc.setFontSize(10);
        doc.text(
            `تاريخ التصدير: ${today}`,
            data.settings.margin.right,
            pageHeight - 10,
            { align: 'right' }
        );
        doc.text(`تم التصدير بواسطة: ${user.name}`, data.settings.margin.left, pageHeight - 10, {
            align: 'left',
        });
        const pageNum = doc.internal.getNumberOfPages();
        doc.text(
            `صفحة ${pageNum}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }
  });

  doc.save(`${filename}.pdf`);
};
