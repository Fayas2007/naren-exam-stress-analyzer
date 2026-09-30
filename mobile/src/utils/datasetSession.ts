// mobile/src/utils/datasetSession.ts
import { ColumnMappingState, UploadResponse } from '../types';

export interface DatasetSession {
  datasetId: string;
  filename: string;
  mappings: ColumnMappingState;
  rawCsvText: string;
  uploadResult: UploadResponse | null;
}

let activeSession: DatasetSession = {
  datasetId: '',
  filename: '',
  mappings: { stress_score: '' },
  rawCsvText: '',
  uploadResult: null,
};

export const setDatasetSession = (data: Partial<DatasetSession>) => {
  activeSession = {
    ...activeSession,
    ...data,
  };
};

export const getDatasetSession = (): DatasetSession => {
  return activeSession;
};

export const clearDatasetSession = () => {
  activeSession = {
    datasetId: '',
    filename: '',
    mappings: { stress_score: '' },
    rawCsvText: '',
    uploadResult: null,
  };
};
