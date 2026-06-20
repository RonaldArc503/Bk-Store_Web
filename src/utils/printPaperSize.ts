export type PaperSize = '58mm' | '72mm' | '80mm' | 'letter'

export const PAPER_SIZE_OPTIONS: { value: PaperSize; label: string }[] = [
  { value: '58mm', label: 'POS-58 / 58 mm (57.5 mm)' },
  { value: '72mm', label: 'Térmico 72 mm' },
  { value: '80mm', label: 'LR2000 / térmico 80 mm (79.5 mm)' },
  { value: 'letter', label: 'Carta' },
]

export function getPaperWidthMm(paperSize: PaperSize): number {
  if (paperSize === 'letter') return 216
  return Number.parseInt(paperSize, 10)
}

export function getPaperWidthCss(paperSize: PaperSize): string {
  return paperSize === 'letter' ? '216mm' : paperSize
}

export function getPaperTailwindWidthClass(paperSize: PaperSize): string {
  if (paperSize === 'letter') return 'w-[216mm]'
  return `w-[${paperSize}]`
}

export function isLetterPaper(paperSize: PaperSize): boolean {
  return paperSize === 'letter'
}

export function getThermalLineHeight(paperSize: PaperSize): number {
  return paperSize === '58mm' ? 4 : 5
}

export function getThermalFontSize(paperSize: PaperSize): number {
  return paperSize === '58mm' ? 6 : 7
}

export function getThermalTicketMaxNameLen(paperSize: PaperSize): number {
  if (paperSize === '58mm') return 14
  if (paperSize === '72mm') return 28
  return 36
}

export function getReportMaxNameLen(paperSize: PaperSize): number {
  if (paperSize === '58mm') return 22
  if (paperSize === '72mm') return 26
  return 30
}

export function getReportTitleFontSize(paperSize: PaperSize): number {
  return paperSize === '58mm' ? 10 : 14
}

export function getReportTotalFontSize(paperSize: PaperSize): number {
  return paperSize === '58mm' ? 9 : 11
}
