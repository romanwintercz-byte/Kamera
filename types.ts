export enum RowStatus {
  NEW = 'NEW',
  UPLOADED = 'UPLOADED',
  REVISION = 'REVISION',
  UNUSABLE = 'UNUSABLE'
}

export interface TableRow {
  values: string[];
  status?: RowStatus; // Volitelné, protože starší data to nemají
}

export interface ExtractedData {
  title: string;
  summary: string;
  date: string;
  category: string;
  center: string;
  tags: string[];
  tableHeaders: string[];
  tableRows: TableRow[];
}

export interface DocumentRecord {
  id: string;
  fileName: string;
  uploadDate: string;
  data: ExtractedData;
  rawBase64?: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  UPLOAD = 'UPLOAD',
  DETAIL = 'DETAIL'
}

// Mapování: Název střediska -> Měsíční cíl v metrech
export interface MonthlyTargets {
  [centerName: string]: number;
}
