
export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '2:3' | '3:2' | '21:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface StorySlide {
  image: string;
  text: string;
  type: 'problem' | 'belief' | 'twist' | 'principle' | 'process' | 'result' | 'insight' | 'cta';
  textPosition: 'top' | 'middle' | 'bottom';
  badgePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface StoryDraft {
  slides: {
    type: string;
    caption: string;
    visualPrompt: string; // The technical prompt for the image generator
  }[];
  storyData: {
    name: string;
    styleType: string;
  };
}

export interface StoryResult {
  slides: StorySlide[];
  storyData: {
    name: string;
    styleType: string;
  };
}

export interface DualResult {
  studio: string;
  casual: string;
}

export interface AppState {
  originalImage: string | null;
  processedImage: string | null; // For single image results (edit/generate)
  currentDraft: StoryDraft | null; // NEW: The intermediate draft state
  storyResult: StoryResult | null; // For the final stylist story
  loading: boolean;
  error: string | null;
  activeTab: 'story' | 'edit' | 'generate' | 'analyze';
  prompt: string;
  selectedSize: ImageSize;
  selectedAR: AspectRatio;
  analysisResult: string | null;
}

export enum AppTabs {
  STORY = 'story',
  EDIT = 'edit',
  GENERATE = 'generate',
  ANALYZE = 'analyze'
}
