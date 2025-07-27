// AI Module Configuration
const AI_CONFIG = {
  // AI Service Provider
  provider: process.env.AI_PROVIDER || 'ollama', // 'ollama' or 'openai'
  
  // Ollama Configuration
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen2.5:3b', // 🚀 Perfect balance: Smart & Fast for MacBook Air (1.9GB)
    timeout: 45000, // 45 seconds (balanced for quality model)
    temperature: 0.7,
    maxTokens: 1000 // Good balance for detailed responses
  },
  
  // OpenAI Configuration (backup option)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
    language: 'nl' // Dutch
  },
  
  // AI Features Configuration
  features: {
    monthlyReports: {
      enabled: true,
      schedule: '0 0 1 * *', // First day of month at midnight
      maxHistoryMonths: 12,
      useRealAI: true, // Enable real AI generation
      summaryModel: 'llama3.2:3b',
      analysisModel: 'qwen2.5:3b'
    },
    trendDetection: {
      enabled: true,
      analysisWindow: 90, // days
      minPatternOccurrences: 3,
      confidenceThreshold: 0.8
    },
    knowledgeEngine: {
      enabled: true,
      similarityThreshold: 0.7,
      maxSuggestions: 5
    },
    dailyBriefing: {
      enabled: true,
      schedule: '0 8 * * *', // Every day at 8 AM
      includeWeatherData: false // Future feature
    }
  },
  
  // Processing Configuration
  processing: {
    batchSize: 100,
    maxConcurrentRequests: 3,
    retryAttempts: 3,
    retryDelay: 1000 // ms
  },
  
  // Security Configuration
  security: {
    encryptData: true,
    anonymizePersonalData: true,
    auditAllRequests: true,
    maxDataRetentionDays: 365
  },
  
  // Performance Configuration
  performance: {
    cacheResults: true,
    cacheExpiryHours: 24,
    enableLogging: true,
    logLevel: process.env.AI_LOG_LEVEL || 'info'
  }
};

module.exports = AI_CONFIG; 