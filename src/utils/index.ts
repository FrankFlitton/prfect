// Re-export all utility classes for easy importing
export { GitAnalyzer, type CommitInfo } from './GitAnalyzer';
export { OutputProcessor } from './OutputProcessor';
export { 
  OllamaClient, 
  type OllamaResponse, 
  type OllamaModel, 
  type OllamaGenerateOptions, 
  type OllamaGenerateRequest 
} from './OllamaClient';