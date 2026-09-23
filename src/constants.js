export const FIRMS = ['PMMPL', 'RKL', 'PURAB'];

export const VEHICLE_STATUS_OPTIONS = [
  'Has reached',
  'Material has reached',
  'Will reach today evening',
  'Will reach in 1 hr',
  'Will reach today at 2 PM',
  'Will reach in 3 days',
  'In transit',
  'Has not been confirmed',
  'Raw material not ready',
  'Other (custom)'
];

export const STATUS_CATEGORIES = {
  REACHED: ['Has reached', 'Material has reached'],
  TRANSIT: [
    'Will reach today evening',
    'Will reach in 1 hr',
    'Will reach today at 2 PM',
    'Will reach in 3 days',
    'In transit'
  ],
  PENDING: [
    'Has not been confirmed',
    'Raw material not ready'
  ]
};

export function getStatusCategory(status = '') {
  const norm = status.trim().toLowerCase();
  if (STATUS_CATEGORIES.REACHED.some(s => s.toLowerCase() === norm)) {
    return 'reached';
  }
  if (STATUS_CATEGORIES.TRANSIT.some(s => s.toLowerCase() === norm)) {
    return 'transit';
  }
  if (STATUS_CATEGORIES.PENDING.some(s => s.toLowerCase() === norm)) {
    return 'pending';
  }
  return 'other';
}

/**
 * Format timestamp to mm/dd/yyyy hh:mm:ss
 */
export function formatEntryDate(dateStr) {
  if (!dateStr) return '-';
  // Try parsing ISO or 'YYYY-MM-DD HH:mm:ss'
  const match = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    const hours = (match[4] || '00').padStart(2, '0');
    const minutes = (match[5] || '00').padStart(2, '0');
    const seconds = (match[6] || '00').padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  }

  return dateStr;
}

export function getStatusBadgeStyle(status = '') {
  const cat = getStatusCategory(status);
  switch (cat) {
    case 'reached':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        label: 'Reached'
      };
    case 'transit':
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500 animate-pulse',
        label: 'In Transit / Scheduled'
      };
    case 'pending':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        dot: 'bg-rose-500',
        label: 'Pending / Action Req.'
      };
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        dot: 'bg-slate-400',
        label: 'Custom Status'
      };
  }
}

// Initial demo mock records in case Google Script URL is not yet connected
export const INITIAL_DEMO_RECORDS = [
  {
    slNo: 1,
    invoiceNo: 'PMMPL/26-27/089',
    vendorName: 'Apex Steels & Alloys Ltd',
    material: 'MS Structural Steel Angles 50x50',
    vehicleStatus: 'Has reached',
    vehicleNo: 'GJ25U9491',
    remark: 'Unloaded at Bay 3, weighbridge slip verified',
    attachmentLink: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    attachmentName: 'PMMPL-26-27-089_Apex_Steels.jpg',
    firm: 'PMMPL',
    createdAt: '2026-09-22 09:30:15',
    updatedAt: '2026-09-22 11:45:00'
  },
  {
    slNo: 2,
    invoiceNo: 'PMMPL/26-27/094',
    vendorName: 'Gujarat Polytex Polymers',
    material: 'HDPE Granules Grade 5000S',
    vehicleStatus: 'Will reach today evening',
    vehicleNo: 'MH04AB3214',
    remark: 'Driver contacted near toll plaza, expected 6:30 PM',
    attachmentLink: '',
    attachmentName: '',
    firm: 'PMMPL',
    createdAt: '2026-09-22 14:15:20',
    updatedAt: '2026-09-22 14:15:20'
  },
  {
    slNo: 3,
    invoiceNo: 'PMMPL/26-27/101',
    vendorName: 'Superfast Fasteners Corp',
    material: 'High Tensile Hex Bolts M16x60',
    vehicleStatus: 'Has not been confirmed',
    vehicleNo: 'RJ14GC7820',
    remark: 'Dispatch delayed from vendor warehouse',
    attachmentLink: '',
    attachmentName: '',
    firm: 'PMMPL',
    createdAt: '2026-09-21 16:40:00',
    updatedAt: '2026-09-22 10:00:00'
  },
  {
    slNo: 1,
    invoiceNo: 'RKL/2026/452',
    vendorName: 'Kalyani Minerals & Chemicals',
    material: 'Industrial Grade Soda Ash Dense',
    vehicleStatus: 'Material has reached',
    vehicleNo: 'GJ06AX1129',
    remark: 'Bag count 400 pcs checked and verified by QA',
    attachmentLink: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
    attachmentName: 'RKL-2026-452_Kalyani_Minerals.jpg',
    firm: 'RKL',
    createdAt: '2026-09-22 08:20:00',
    updatedAt: '2026-09-22 09:15:00'
  },
  {
    slNo: 2,
    invoiceNo: 'RKL/2026/470',
    vendorName: 'Bharat Petroleum Gas Logistics',
    material: 'LPG Industrial Cylinder Racks',
    vehicleStatus: 'Will reach in 1 hr',
    vehicleNo: 'GJ01CZ8841',
    remark: 'Vehicle crossed industrial ring road',
    attachmentLink: '',
    attachmentName: '',
    firm: 'RKL',
    createdAt: '2026-09-23 09:00:00',
    updatedAt: '2026-09-23 10:15:00'
  },
  {
    slNo: 3,
    invoiceNo: 'RKL/2026/488',
    vendorName: 'Precision Tools & Dies',
    material: 'CNC Tool Inserts & Collets',
    vehicleStatus: 'Raw material not ready',
    vehicleNo: '',
    remark: 'Vendor heat-treatment process pending',
    attachmentLink: '',
    attachmentName: '',
    firm: 'RKL',
    createdAt: '2026-09-20 11:10:00',
    updatedAt: '2026-09-21 14:00:00'
  },
  {
    slNo: 1,
    invoiceNo: 'PURAB/26/881',
    vendorName: 'Jindal Sheet Metal Works',
    material: 'Cold Rolled Steel Sheets 2mm',
    vehicleStatus: 'In transit',
    vehicleNo: 'DD01E4921',
    remark: 'GPS tracking active, expected tomorrow noon',
    attachmentLink: '',
    attachmentName: '',
    firm: 'PURAB',
    createdAt: '2026-09-22 17:00:00',
    updatedAt: '2026-09-23 08:30:00'
  },
  {
    slNo: 2,
    invoiceNo: 'PURAB/26/895',
    vendorName: 'Shree Krishna Packaging',
    material: 'Corrugated 5-Ply Shipping Boxes',
    vehicleStatus: 'Has reached',
    vehicleNo: 'DN09H2039',
    remark: 'Full truck load delivered to store warehouse 2',
    attachmentLink: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    attachmentName: 'PURAB-26-895_Krishna_Packaging.jpg',
    firm: 'PURAB',
    createdAt: '2026-09-23 07:45:00',
    updatedAt: '2026-09-23 09:20:00'
  },
  {
    slNo: 3,
    invoiceNo: 'PURAB/26/902',
    vendorName: 'Delta Electric Controls',
    material: 'VFD Panels & Contactor Switches',
    vehicleStatus: 'Will reach today at 2 PM',
    vehicleNo: 'MH12RN5512',
    remark: 'Special handling equipment needed for offloading',
    attachmentLink: '',
    attachmentName: '',
    firm: 'PURAB',
    createdAt: '2026-09-23 09:30:00',
    updatedAt: '2026-09-23 09:30:00'
  }
];
