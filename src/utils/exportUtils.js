import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatEntryDate } from '../constants';

/**
 * Helper to load logo as base64 Data URL for jsPDF
 */
async function getLogoDataUrl() {
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          console.warn('Canvas conversion failed:', e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = '/logo.png';
    });
  } catch (err) {
    console.warn('Error loading logo for PDF:', err);
    return null;
  }
}

/**
 * Export records to formatted Excel (.xlsx)
 */
export function exportToExcel(records, firmName = 'ALL') {
  if (!records || records.length === 0) {
    alert('No records available to export.');
    return;
  }

  const exportData = records.map((r, index) => ({
    'S No': index + 1,
    'Entry Date': formatEntryDate(r.createdAt),
    'Firm': r.firm || firmName,
    'Invoice No.': r.invoiceNo || 'N/A',
    'Vendor Name': r.vendorName || '',
    'Material': r.material || '',
    'Vehicle Status': r.vehicleStatus || '',
    'Vehicle No.': r.vehicleNo || '',
    'Remark': r.remark || '',
    'Attachment Name': r.attachmentName || '',
    'Attachment Link': r.attachmentLink || '',
    'Created At': formatEntryDate(r.createdAt),
    'Updated At': formatEntryDate(r.updatedAt)
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  const colWidths = [
    { wch: 8 },  // S No
    { wch: 20 }, // Entry Date
    { wch: 10 }, // Firm
    { wch: 18 }, // Invoice No
    { wch: 28 }, // Vendor Name
    { wch: 30 }, // Material
    { wch: 22 }, // Vehicle Status
    { wch: 14 }, // Vehicle No
    { wch: 35 }, // Remark
    { wch: 25 }, // Attachment Name
    { wch: 35 }, // Attachment Link
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${firmName} Report`);

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Vehicle_Report_${firmName}_${dateStr}.xlsx`);
}

/**
 * Export records to PDF document with company logo, clean white theme and chosen orientation
 * Title: VEHICLE TRACKING REPORT
 */
export async function exportToPDF(records, firmName = 'ALL', orientation = 'landscape') {
  if (!records || records.length === 0) {
    alert('No records available to export.');
    return;
  }

  const doc = new jsPDF({
    orientation: orientation,
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const generatedDate = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const docMonth = new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' }).toUpperCase();

  // Summary counts
  const totalCount = records.length;
  const reachedCount = records.filter(r => (r.vehicleStatus || '').toLowerCase().includes('reach')).length;
  const transitCount = records.filter(r => (r.vehicleStatus || '').toLowerCase().includes('transit') || (r.vehicleStatus || '').toLowerCase().includes('will reach')).length;
  const pendingCount = totalCount - reachedCount - transitCount;

  // Clean White Header Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 56, 'F');

  // Bottom Border Line for Header
  doc.setDrawColor(15, 23, 42); // Slate 900
  doc.setLineWidth(1.5);
  doc.line(20, 50, pageWidth - 20, 50);

  // Load and embed company logo directly on white background
  const logoData = await getLogoDataUrl();
  let textStartX = 24;

  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', 20, 10, 32, 32);
      textStartX = 60;
    } catch (e) {
      console.warn('Could not render logo in PDF:', e);
    }
  }

  // Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('TRANSIT LOGISTICS & MATERIAL INWARD SYSTEM', textStartX, 20);

  // Exact Title in Clean Dark Font: "VEHICLE TRACKING REPORT"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(orientation === 'portrait' ? 14 : 16);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('VEHICLE TRACKING REPORT', textStartX, 36);

  // Right Header Meta Card
  const rightMetaX = pageWidth - 190;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Target Firm: ${firmName}  |  Doc: TVT-${docMonth}`, rightMetaX, 22);
  doc.text(`Generated: ${generatedDate}`, rightMetaX, 33);
  doc.text(`Total Records: ${totalCount} Vehicles`, rightMetaX, 44);

  // Table columns & rows
  const tableColumns = [
    'S No',
    'Entry Date',
    'Firm',
    'Invoice No.',
    'Vendor Name',
    'Material',
    'Status',
    'Vehicle No.',
    'Remark'
  ];

  const tableRows = records.map((r, i) => [
    i + 1,
    formatEntryDate(r.createdAt),
    r.firm || '',
    r.invoiceNo || '-',
    r.vendorName || '-',
    r.material || '-',
    r.vehicleStatus || '-',
    r.vehicleNo || '-',
    r.remark || '-'
  ]);

  const columnStyles = orientation === 'portrait' ? {
    0: { cellWidth: 26, halign: 'center' }, // S No
    1: { cellWidth: 72, halign: 'center' }, // Entry Date
    2: { cellWidth: 38, halign: 'center' }, // Firm
    3: { cellWidth: 68 },                   // Invoice No
    4: { cellWidth: 92 },                   // Vendor Name
    5: { cellWidth: 95 },                   // Material
    6: { cellWidth: 72 },                   // Status
    7: { cellWidth: 60, halign: 'center' }, // Vehicle No
    8: { cellWidth: 'auto' }                // Remark
  } : {
    0: { cellWidth: 30, halign: 'center' }, // S No
    1: { cellWidth: 88, halign: 'center' }, // Entry Date
    2: { cellWidth: 44, halign: 'center' }, // Firm
    3: { cellWidth: 80 },                   // Invoice No
    4: { cellWidth: 115 },                  // Vendor Name
    5: { cellWidth: 125 },                  // Material
    6: { cellWidth: 90 },                   // Status
    7: { cellWidth: 70, halign: 'center' }, // Vehicle No
    8: { cellWidth: 'auto' }                // Remark
  };

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 58,
    margin: { left: 20, right: 20 },
    theme: 'grid',
    styles: {
      fontSize: orientation === 'portrait' ? 7 : 7.8,
      cellPadding: 4,
      overflow: 'linebreak',
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240], // Slate 200 border
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [15, 23, 42],     // Deep Slate 900
      textColor: [255, 255, 255],  // Crisp White
      fontStyle: 'bold',
      lineColor: [15, 23, 42],
      lineWidth: 0.5,
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [250, 252, 254] // Subtle Slate 50
    },
    columnStyles: columnStyles,
    didDrawCell: function(data) {
      // Highlight reached rows in elegant soft champagne yellow
      if (data.section === 'body') {
        const rowData = records[data.row.index];
        const status = (rowData?.vehicleStatus || '').toLowerCase();
        if (status.includes('reach')) {
          doc.setFillColor(254, 252, 232); // Pale Champagne #FEFCE8
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(15, 23, 42);
          doc.text(data.cell.text, data.cell.x + data.cell.padding('left'), data.cell.y + data.cell.height / 2 + 2.5);
        }
      }
    },
    didDrawPage: function(data) {
      // Page Number & Footer
      const str = `Page ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        str,
        data.settings.margin.left,
        pageHeight - 12
      );
      doc.text(
        `Transit Vehicle Tracker ERP • Confidential Internal Record • ${generatedDate}`,
        pageWidth - 260,
        pageHeight - 12
      );
    }
  });

  // Check if we can add signature blocks at the end of the table
  const finalY = doc.lastAutoTable.finalY || 400;
  if (finalY + 65 < pageHeight - 20) {
    const signBoxWidth = (pageWidth - 80) / 3;
    const startY = finalY + 25;

    // Prepared By
    doc.setDrawColor(203, 213, 225);
    doc.setLineDash([2, 2], 0);
    doc.rect(20, startY, signBoxWidth, 42);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('PREPARED BY', 20 + signBoxWidth / 2, startY + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Logistics Desk Clerk', 20 + signBoxWidth / 2, startY + 34, { align: 'center' });

    // Verified By
    const box2X = 20 + signBoxWidth + 20;
    doc.rect(box2X, startY, signBoxWidth, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('VERIFIED BY', box2X + signBoxWidth / 2, startY + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Security Gate Incharge', box2X + signBoxWidth / 2, startY + 34, { align: 'center' });

    // Authorized By
    const box3X = box2X + signBoxWidth + 20;
    doc.rect(box3X, startY, signBoxWidth, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('AUTHORIZED BY', box3X + signBoxWidth / 2, startY + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Plant / Stores Manager', box3X + signBoxWidth / 2, startY + 34, { align: 'center' });

    doc.setLineDash([], 0); // reset
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`Vehicle_Tracking_Report_${firmName}_${orientation}_${dateStr}.pdf`);
}
