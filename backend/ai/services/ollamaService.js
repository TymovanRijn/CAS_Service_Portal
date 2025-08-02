const AI_CONFIG = require('../config');

// Use global fetch (available in Node.js 18+) or require node-fetch as fallback
const fetch = globalThis.fetch || require('node-fetch');

class OllamaService {
  constructor() {
    this.config = AI_CONFIG.ollama;
    // Forceer IPv4: vervang 'localhost' door '127.0.0.1'
    this.baseUrl = this.config.baseUrl.replace('localhost', '127.0.0.1');
  }

  /**
   * Generate text using Ollama model
   * @param {string} prompt - The prompt to send to the AI
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Generated text
   */
  async generateText(prompt, options = {}) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || this.config.model || 'qwen2.5:7b',
          prompt: prompt,
          stream: false,
          options: {
            temperature: options.temperature || this.config.temperature,
            num_predict: options.maxTokens || this.config.maxTokens,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const generationTime = Date.now() - startTime;
      
      console.log(`🤖 Ollama generation completed in ${generationTime}ms`);
      
      return data.response;
      
    } catch (error) {
      console.error('❌ Ollama generation error:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Test Ollama connection
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models
   * @returns {Promise<Array>} List of available models
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  /**
   * Generate Dutch monthly report summary
   * @param {Object} data - Monthly data to summarize
   * @returns {Promise<string>} Dutch AI-generated summary
   */
  async generateMonthlySummary(data) {
    const prompt = this.buildMonthlySummaryPrompt(data);
    
    return await this.generateText(prompt, {
      model: 'llama3.2:3b',
      temperature: 0.7,
      maxTokens: 1000
    });
  }

  /**
   * Build prompt for monthly summary generation
   * @param {Object} data - Monthly data
   * @returns {string} Formatted prompt
   */
  buildMonthlySummaryPrompt(data) {
    const { stats, month } = data;
    const monthName = this.getMonthName(month);
    
    return `Je bent een AI assistent die professionele maandrapportages schrijft voor een luchthaven beveiligingssysteem (CAS Service Portal).

GEGEVENS VOOR ${monthName.toUpperCase()}:
- Totaal incidenten: ${stats.totalIncidents}
- Totaal acties: ${stats.totalActions}
- Voltooide acties: ${stats.completedActions}
- Hoge prioriteit incidenten: ${stats.incidentsByPriority.High || 0}
- Gemiddelde prioriteit incidenten: ${stats.incidentsByPriority.Medium || 0}
- Lage prioriteit incidenten: ${stats.incidentsByPriority.Low || 0}
- Open incidenten: ${stats.incidentsByStatus.Open || 0}
- In behandeling: ${stats.incidentsByStatus['In Progress'] || 0}
- Gesloten incidenten: ${stats.incidentsByStatus.Closed || 0}

MEEST VOORKOMENDE CATEGORIEËN:
${Object.entries(stats.incidentsByCategory).map(([cat, count]) => `- ${cat}: ${count} incidenten`).join('\n')}

MEEST GETROFFEN LOCATIES:
${Object.entries(stats.incidentsByLocation).map(([loc, count]) => `- ${loc}: ${count} incidenten`).join('\n')}

Schrijf een professionele Nederlandse samenvatting van maximaal 500 woorden die bevat:

1. **Overzicht van de maand** - Kernstatistieken en algemene prestaties
2. **Belangrijkste bevindingen** - Trends, patronen en opvallende zaken
3. **Risicogebieden** - Locaties of categorieën die extra aandacht vereisen  
4. **Prestatie-evaluatie** - Beoordeling van actie voltooiing en responstijden
5. **Aanbevelingen** - Concrete actiepunten voor verbetering

Gebruik een zakelijke, professionele toon. Begin direct met de samenvatting zonder inleiding. Gebruik opsommingstekens waar relevant.`;
  }

  /**
   * Generate trend analysis
   * @param {Object} currentData - Current month data
   * @param {Object} previousData - Previous month data
   * @returns {Promise<string>} AI-generated trend analysis
   */
  async generateTrendAnalysis(currentData, previousData) {
    if (!previousData) {
      return "Geen vorige maand data beschikbaar voor trendanalyse.";
    }

    const prompt = `Analyseer de trends tussen deze twee maanden voor een luchthaven beveiligingssysteem:

VORIGE MAAND:
- Incidenten: ${previousData.totalIncidents}
- Voltooide acties: ${previousData.completedActions}

DEZE MAAND:
- Incidenten: ${currentData.stats.totalIncidents}
- Voltooide acties: ${currentData.stats.completedActions}

Schrijf een korte trendanalyse in het Nederlands (max 200 woorden) die de veranderingen beschrijft en mogelijke oorzaken suggereert.`;

    return await this.generateText(prompt, {
      model: 'qwen2.5:3b',
      temperature: 0.6,
      maxTokens: 300
    });
  }

  /**
   * Get Dutch month name
   * @param {string} month - Month in YYYY-MM format
   * @returns {string} Dutch month name
   */
  getMonthName(month) {
    const [year, monthNum] = month.split('-');
    const monthNames = [
      'januari', 'februari', 'maart', 'april', 'mei', 'juni',
      'juli', 'augustus', 'september', 'oktober', 'november', 'december'
    ];
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
  }
}

module.exports = OllamaService; 