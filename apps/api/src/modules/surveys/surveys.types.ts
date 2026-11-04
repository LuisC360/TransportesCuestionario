export interface SurveyOption {
  id: string;
  label: string;
}

export interface SurveyQuestion {
  id: string;
  prompt: string;
  options: SurveyOption[];
  minSelections: number;
  maxSelections: number;
}

export interface SurveyDefinition {
  version: number;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  createdBy: string;
  createdAt: Date;
}

export interface ISurvey {
  isActive: boolean;
  currentVersion: number;
  createdBy: string;
  versions: SurveyDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyDefinitionInput {
  title: string;
  description: string;
  questions: Array<{
    id?: string;
    prompt: string;
    options: Array<{ id?: string; label: string }>;
    minSelections: number;
    maxSelections?: number;
  }>;
}
