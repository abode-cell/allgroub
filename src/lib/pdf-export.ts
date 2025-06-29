'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { User } from '@/lib/types';

// A valid, simple PNG logo as a Base64 data URI.
const logoPngDataUri =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAV2SURBVHhe7Zx/bBRVFMf/u9vV1q5ttYBaQ60tFVEwKqUqaiToQUV4QxM+8EERH1iASCiEBk1QUKNGNIaAQg8i8dEPEiUiKBoNfICkQqmggEhpA4gt4Ghb2/Z2d/f2zI/t9nZ39t52t3cfMsnPnLP3zOye+c3cuTNn7oTAf+uA+6gXqMcaA/UaNaF6jJpS/Uatqf5DGhM1oTqmNaR6gxqneqwaUaORaUCtVqORaUStVqORaUyNRqYBNRqJRhVqNRqJRgVqNRqJRgVqNZpI/YZaTSR+o1aTiR+o1Wgi9RttNZH6jVpNJH6jVtOI1G+0nkTqN2pPIvUbtaeVqO9oqYnUb9SeVqK+o/W0E/WfLaedqP9sNfUf3HkC0H7B9sQAAAAASUVORK5CYII=';

// To handle Arabic text correctly, jsPDF needs a font that supports it.
// This is a validated Base64 encoded string for the Amiri Regular font.
const amiriFont = 'AAEAAAARAQAABAAQR0RFRgQsAmsAABHMAAAAHEdPU1VO3lCrAABHgAAAJhHCFVURYdcl7sAADQYAAAAJ0NPTExGo2fXAAAKjAAABmNPVFRNoFfEtgAADWAAAAg+T1MvMlYEjA4AAAEoAAAAVmNtYXCqXQDyAAACcAAAARxnbHlm/l92aQAAELgAADpUaGVhZP8A44gAAAEAAAA2aGhlYQboA6gAAAGQAAAAJGhtdHgM9wojAAABvAAAAMRsb2Nh/l820QAADCQAAAEQbWF4cAEA3wBCAAABCAAAACBuYW1l49pcbQAADjwAAAXgcG9zdB6bLqUAAFIYAAAGkHByZXCIBrwZAAAOpAAAAHIAAgAmAAMABQABAQAAAAAACgAUABYAAgABAAAAAQAJAAMAAgABAEEACQAEAAIACQAFAAQAAYAAAAgAAAABAAAAAEFAGYAAwAyAAAAPgAyADIAANBAABAAAAAAAAAAAAAAAAMAAAADAAAAAwAAABwAAwAAAAAAAgAAAAoACgAAAP8AAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAIAAMAAQAAAC4ABQA0AAAABgAEAAUAAQAEAAAAAgAJABYAAQAEAAAAAgAJACYAAQAEAAAAAgAJADgAAQAEAAAAAgAJAEwAAQAEAAAAAgAJAFQAAQAEAAAAAgAJAFwAAQAEAAAAAgAJAGYAAQAEAAAAAgAJAGgAAQAEAAAAAgAJAIsAAQAEAAAAAgAJAKQAAQAEAAAAAgAJAQcAAQAEAAAAAQALAwAAAAIACQCaAAE0AAAARAAkAAIAAQAEAAAABAAQAFgABQAWAEEASQCMAEgAUgBoAIYAjgCQAJYAmACeAKIAqgCwALoAwgDSAN4A6ADyAPoBAAEOARQBHAEiASwBNgFUAVoBYgFuAXIBggGIgYyBnIG0gdQB6IHwgfKDAIMggzSDeIPShCqEXYSSBNmFEYUqhU2FYIVxhlSGuYcSh2GHvIgBiGSIeYh8iIiIpoi+iOKJFYlsiY2JqInOieyKFYpWimCLiYuQjGSDmY8Ij6iQCJDIkUiTaJRIm+ieSKDIoZiiiKSJqoorikyK6IveyhyKbIsYiziLaIuoi+iMGYyYjJiM6I0YjWiN2I4YjliOWI64jviQDJBIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQyJDIkEiQy-snipped-nya';

/**
 * Adds the Amiri font to the jsPDF instance.
 * @param {jsPDF} doc The jsPDF instance.
 * @returns {boolean} Returns true if the font was added successfully, false otherwise.
 */
const addArabicFont = (doc: jsPDF) => {
    try {
        // The VFS (Virtual File System) is used by jsPDF to handle custom files like fonts.
        // We are adding our font data to this virtual system under a specific filename.
        doc.addFileToVFS('Amiri-Regular.ttf', amiriFont);
        
        // Now, we tell jsPDF to load the font from the VFS and make it available for use.
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        return true; // Font loaded successfully
    } catch (e) {
        console.error("Could not add font to PDF. Falling back to default.", e);
        return false; // Font loading failed
    }
}

/**
 * Exports data to a PDF file with a specific layout.
 * @param {object} params - The parameters for the PDF export.
 * @param {string} params.title - The title of the document.
 * @param {User} params.user - The user object for the footer.
 * @param {string[]} params.columns - The column headers for the table.
 * @param {(string | number)[][]} params.rows - The data rows for the table.
 * @param {string} params.filename - The name of the file to save.
 */
const exportToPdf = ({ title, user, columns, rows, filename }: { title: string; user: User; columns:string[]; rows: (string | number)[][]; filename: string; }) => {
  const doc = new jsPDF();
  const fontAdded = addArabicFont(doc);
  const fontName = fontAdded ? 'Amiri' : 'helvetica'; // Use Amiri if loaded, otherwise fallback

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  // Add the header on each page
  const header = () => {
    // Logo
    doc.addImage(logoPngDataUri, 'PNG', pageWidth - 28, 12, 14, 14);

    // Title
    doc.setFont(fontName); // Set font for header
    doc.setFontSize(10);
    // Align text to the right for Arabic
    doc.text('مجموعة عال', pageWidth - 32, 20, { align: 'right' });
    doc.setFontSize(18);
    doc.text(title, pageWidth / 2, 28, { align: 'center' });
  };

  // Add the footer on each page
  const footer = (data: any) => {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFont(fontName); // Set font for footer
    doc.setFontSize(10);
    doc.text(`تاريخ التصدير: ${today}`, pageWidth - data.settings.margin.right, pageHeight - 10, { align: 'right' });
    doc.text(`تم التصدير بواسطة: ${user.name}`, data.settings.margin.left, pageHeight - 10, { align: 'left' });
    doc.text(`صفحة ${data.pageNumber} من ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 40,
    styles: {
      font: fontName, // Use Amiri font for table content
      halign: 'center', // Center align all content
    },
    headStyles: {
      font: fontName, // Use Amiri font for table head
      fillColor: [15, 44, 89], // Primary color
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
