
export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '2:3' | '3:2' | '21:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface DualResult {
  studio: string;
  casual: string;
}

export interface AppState {
  originalImage: string | null;
  processedImage: string | null; // For single image results (edit/generate)
  dualResult: DualResult | null; // For the new swap feature
  loading: boolean;
  error: string | null;
  activeTab: 'swap' | 'edit' | 'generate' | 'analyze';
  prompt: string;
  selectedSize: ImageSize;
  selectedAR: AspectRatio;
  analysisResult: string | null;
}

export enum AppTabs {
  SWAP = 'swap',
  EDIT = 'edit',
  GENERATE = 'generate',
  ANALYZE = 'analyze'
}
