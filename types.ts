export enum RowStatus {
  NEW = 'NEW',
  UPLOADED = 'UPLOADED',
  REVISION = 'REVISION',
  UNUSABLE = 'UNUSABLE'
}

export interface TableRow {
  values: string[];
  status?: RowStatus;
  requiresGisFix?: boolean; // NOVÉ: Příznak, že data vyžadovala úpravu v GIS (nezávislé na stavu)
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

// Mapování: Rok -> { Název střediska -> ROČNÍ cíl v metrech }
export interface AnnualTargets {
  [year: string]: {
    [centerName: string]: number;
  };
}
