import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type ExportRow = Record<string, string | number | null | undefined>;

export const exportRowsToExcel = (
  rows: ExportRow[],
  fileName: string,
  sheetName = 'Data'
) => {
  if (rows.length === 0) return Promise.resolve();
  return exportRowsToStyledExcel(rows, fileName, sheetName);
};

const exportRowsToStyledExcel = async (
  rows: ExportRow[],
  fileName: string,
  sheetName = 'Data'
) => {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  const columns = Object.keys(rows[0]);
  const titleRowIndex = 1;
  const headerRowIndex = 3;
  const dataStartRowIndex = 4;

  worksheet.mergeCells(titleRowIndex, 1, titleRowIndex, columns.length);
  const titleCell = worksheet.getCell(titleRowIndex, 1);
  titleCell.value = `${sheetName} Report`;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF111827' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  const headerRow = worksheet.getRow(headerRowIndex);
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF111827' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
  });
  headerRow.height = 22;

  rows.forEach((row, rowIndex) => {
    const excelRow = worksheet.getRow(dataStartRowIndex + rowIndex);
    columns.forEach((column, columnIndex) => {
      const value = row[column];
      const cell = excelRow.getCell(columnIndex + 1);
      cell.value = value == null ? '' : String(value);
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };

      if (rowIndex % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }
    });
  });

  columns.forEach((column, index) => {
    const maxLength = Math.max(
      column.length,
      ...rows.map((row) => String(row[column] ?? '').length)
    );
    worksheet.getColumn(index + 1).width = Math.min(Math.max(maxLength + 2, 12), 42);
  });

  worksheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];
  worksheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const exportRowsToPdf = (
  rows: ExportRow[],
  title: string,
  fileName: string
) => {
  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const body = rows.map((row) => columns.map((column) => String(row[column] ?? '')));

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(title, 40, 40);

  autoTable(doc, {
    head: [columns],
    body,
    startY: 56,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [39, 39, 42] },
  });

  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
};
