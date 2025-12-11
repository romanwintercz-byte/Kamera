export interface TableRow {
  values: string[];
}

export interface ExtractedData {
  title: string;
  summary: string;
  date: string;
  category: string;
  center: string; // Nové pole pro Středisko
  tags: string[];
  tableHeaders: string[];
  tableRows: TableRow[];
}

export interface DocumentRecord {
  id: string;
  fileName: string;
  uploadDate: string;
  data: ExtractedData;
  rawBase64?: string; // Storing for preview if needed, keeping it simple for now
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  UPLOAD = 'UPLOAD',
  DETAIL = 'DETAIL'
}
