export interface BackendActivityEntry {
  step: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warn';
  timestamp?: string;
}

export interface DrugItem {
  id: string;
  name: string;
  registrationNumber?: string;
  source: string;
}

export interface UnitItem {
  id: string;
  name: string;
}

export interface TransactionHistoryItem {
  id: string;
  type: string;
  date: string;
  status: string;
  reason?: string;
  referenceNumber?: string;
  items: string; // JSON string
  attempts: number;
  errorMessage?: string;
}

export interface PrescriptionItem {
  drugCode?: string;
  drugName?: string;
  unitName?: string;
  prescribedQuantity?: number;
  usageInstruction?: string;
  soldQuantity?: number;
}

export interface PrescriptionData {
  maDonThuoc: string;
  patientName?: string;
  patientBirthDate?: string;
  diagnosis?: string;
  doctorName?: string;
  items: PrescriptionItem[];
}
