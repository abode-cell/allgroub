'use client';

import type { User } from './types';

// The logo data is now embedded directly in this file to ensure reliability.
const logoPngDataUri =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACyUlEQVR4Xu2Zz2sTURDHv0tLS7GgUIqCICheVLwV/wDqQRB8lT2JiAVvRfAb8FAUvSgoeBNsBUEQBME/KCiIghYrUaQ0KbGNtGmamzOZCTvZZjLJJJPkzc3O+zLz/jLv3s3uGKEaH02ghgHAG0DUQNcAQx8GAC+gO0CTQNcAwwCgBaBvgK4B+gY4BmgakO2ApgG6BmgacAwwDNB0QNEG6BqgacAwwBAg6YC2AdoG6BqgacAwQNEGSDugbYCmAZoGDAMETZCsA9oGaBqgacAwQNEGpDvgjB1A/wBdAwwDNA2QdkDagGvAsIDmANdAugakO+CMAUAXQMsAwAAgLIDuAUOAdAekG2AIAHQFsAwAAGgC6B4gZADZDmgboGsApAFZDmgbANACZDuw7YCmAZoGdDugpAFZDjQNoGmApgG6Bmg6IMuApAGaBmi6ANACZDmgrAFpDTgGaBqg6YCkAdIOaBvQdEC2AbIGpB3QNgBpADQFSHbAmgLoGqBpAE0DpB3QdoCmAdIGZDmg6YBkO+DMAWkd0DSApkHSBjgGaBqgacC2A8sOaBqg6YCkAdIOaBvQdEC2AbIGpB3QNgBpADQFSHbAmgLoGqBpAE0DpB3QdoCmAdIGZDmg6YBkO+DMAWkd0DSApkHSBjgGaBqgacC2A8sOaBqg6YCkAdIOaBvQdEC2AbIGpB3QNgBpADQFSHbAmgLoGqBpAE0DpB3QdoCmAdIGZDmg6YBkO+DMAWkd0DSApkHSBjgGaBqgacC2A8sOaBqg6YCkAdIOaBvQdEC2AbIGpB3QNgBpADQFSHbAmgLoGqBpAE0DpB3QdoCmAdIGZDmg6YBkO+DMAWkd0DSApkHSBjgGaBqgacC2A8sOaBqg6YCkAdIOaBvQdEC2AbIGpB3QNgBpAPx9gP4B3oDuAoYA8B4gBgiB8/kBbYJmD3kZPOwAAAAASUVORK5CYII=';

const formatValue = (value: any): string => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
    }).format(value);
  }
  return String(value);
};


export const exportToPrintableHtml = (title: string, columns: string[], rows: (string | number)[][], user: User) => {
    const exportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    direction: rtl;
                    text-align: right;
                    margin: 0;
                    padding: 20px;
                    background-color: #f4f4f9;
                    color: #333;
                }
                .print-container {
                    max-width: 1200px;
                    margin: auto;
                    padding: 30px;
                    background-color: #ffffff;
                    border: 1px solid #dee2e6;
                    box-shadow: 0 0 15px rgba(0,0,0,0.05);
                    border-radius: 8px;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #0F2C59;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                .header-logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .header-logo img {
                    height: 50px;
                }
                .header-logo span {
                    font-size: 1.5em;
                    font-weight: 700;
                    color: #0F2C59;
                }
                .header-info {
                    text-align: left;
                    font-size: 0.9em;
                    color: #555;
                    line-height: 1.6;
                }
                h1 {
                    text-align: center;
                    color: #0F2C59;
                    margin-bottom: 25px;
                    font-size: 2em;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 1em;
                }
                th, td {
                    border: 1px solid #e0e0e0;
                    padding: 12px 15px;
                    text-align: right;
                }
                thead tr {
                    background-color: #0f2c59;
                    color: #ffffff;
                }
                th {
                    font-weight: 700;
                }
                tbody tr:nth-child(even) {
                    background-color: #f8f9fa;
                }
                tbody tr:hover {
                    background-color: #e9ecef;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px solid #eee;
                    font-size: 0.9em;
                    color: #777;
                }
                @media print {
                    body {
                        background-color: #fff;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    .print-container {
                        border: none;
                        box-shadow: none;
                        padding: 0;
                        margin: 0;
                        max-width: 100%;
                        border-radius: 0;
                    }
                    .print-button {
                        display: none;
                    }
                    thead tr {
                        background-color: #0f2c59 !important;
                    }
                }
                .print-button {
                    display: block;
                    width: 150px;
                    margin: 30px auto;
                    padding: 12px;
                    background-color: #0F2C59;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    text-align: center;
                    font-size: 1em;
                    font-weight: bold;
                }
                .print-button:hover {
                    background-color: #B8860B;
                }
            </style>
        </head>
        <body>
            <div class="print-container">
                <div class="header">
                    <div class="header-logo">
                        <img src="${logoPngDataUri}" alt="شعار الموقع">
                        <span>مجموعة عال</span>
                    </div>
                    <div class="header-info">
                        <div><strong>المستخدم:</strong> ${user.name}</div>
                        <div><strong>تاريخ التصدير:</strong> ${exportDate}</div>
                    </div>
                </div>

                <h1>${title}</h1>

                <table>
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${row.map(cell => `<td>${formatValue(cell)}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <button class="print-button" onclick="window.print()">طباعة</button>

                <div class="footer">
                    هذا التقرير تم إنشاؤه بواسطة منصة مجموعة عال.
                </div>
            </div>
        </body>
        </html>
    `;

    const win = window.open("", "_blank");
    if (win) {
        win.document.write(htmlContent);
        win.document.close();
    }
};
