
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

const MULTI_LETTER_MAP: Record<string, string> = {
  shch: 'щ',
  sch: 'щ',
  yo: 'ё',
  yu: 'ю',
  ya: 'я',
  ye: 'е',
  yi: 'и',
  ey: 'ей',
  ay: 'ай',
  oi: 'ой',
  zh: 'ж',
  kh: 'х',
  ts: 'ц',
  ch: 'ч',
  sh: 'ш'
};

const SINGLE_LETTER_MAP: Record<string, string> = {
  a: 'а',
  b: 'б',
  c: 'к',
  d: 'д',
  e: 'е',
  f: 'ф',
  g: 'г',
  h: 'х',
  i: 'и',
  j: 'й',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  q: 'к',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  v: 'в',
  w: 'в',
  x: 'кс',
  y: 'ы',
  z: 'з'
};

const applyCase = (source: string, target: string) => {
  if (!source) return target;
  if (source === source.toUpperCase()) {
    return target.toUpperCase();
  }
  if (source[0] === source[0].toUpperCase()) {
    return target[0]?.toUpperCase() + target.slice(1);
  }
  return target;
};

export const transliterateToCyrillic = (input: string): string => {
  if (!input) {
    return '';
  }

  let result = '';
  let index = 0;

  while (index < input.length) {
    const remaining = input.slice(index);
    let matched = false;

    for (const length of [4, 3, 2]) {
      const segment = remaining.slice(0, length);
      if (!segment) continue;
      const replacement = MULTI_LETTER_MAP[segment.toLowerCase()];
      if (replacement) {
        result += applyCase(segment, replacement);
        index += length;
        matched = true;
        break;
      }
    }

    if (matched) {
      continue;
    }

    const currentChar = input[index];
    const singleReplacement = SINGLE_LETTER_MAP[currentChar.toLowerCase()];
    if (singleReplacement) {
      result += applyCase(currentChar, singleReplacement);
    } else {
      result += currentChar;
    }
    index += 1;
  }

  return result;
};
