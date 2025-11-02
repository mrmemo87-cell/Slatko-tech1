
import { CURRENCY } from './constants';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatDate = (isoDate: string): string => {
  return new Date(isoDate).toLocaleDateString('ru-RU'); // Using a common format
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const todayISO = () => new Date().toISOString().split('T')[0];

export const exportToCsv = (filename: string, rows: (string | number)[][]) => {
  const processRow = (row: (string | number)[]) => {
    let finalVal = '';
    for (let j = 0; j < row.length; j++) {
      let innerValue = row[j] === null || row[j] === undefined ? '' : row[j].toString();
      if (typeof row[j] === 'string') {
        innerValue = innerValue.replace(/"/g, '""');
        if (innerValue.search(/("|,|\n)/g) >= 0)
          innerValue = '"' + innerValue + '"';
      }
      if (j > 0)
        finalVal += ',';
      finalVal += innerValue;
    }
    return finalVal + '\n';
  };

  let csvFile = '';
  for (let i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  const blob = new Blob([`\uFEFF${csvFile}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
