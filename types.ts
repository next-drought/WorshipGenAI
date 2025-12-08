export enum InputMode {
  MANUSCRIPT = 'MANUSCRIPT',
  SLIDES = 'SLIDES'
}

export interface ProcessingState {
  step: 'idle' | 'extracting' | 'generating_narrative' | 'translating' | 'assembling' | 'complete' | 'error';
  message: string;
  progress: number;
}

export interface GeneratedProgram {
  markdown: string;
  htmlContent: string; // For DOCX generation
  metadata: {
    date: string;
    sermonTitle: string;
    preacher: string;
  };
}

export interface BulletinData {
  date: string;
  orderOfService: string[];
  hymns: string[];
  scripture: string;
  prayerFocus: string; // Full content of weekly prayer/intercession
  announcements: string[];
  sermonTitle?: string;
  preacher?: string;
}

export type ProcessingError = {
  message: string;
  details?: string;
};