const { pool } = require('../../config/db');
const AI_CONFIG = require('../config');
const OllamaService = require('./ollamaService');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class SummaryService {
  constructor() {
    this.config = AI_CONFIG;
    this.cache = new Map(); // Simple in-memory cache
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    this.ollamaService = new OllamaService(); // Initialize Ollama service
  }

  /**
   * Generate monthly summary report using AI
   * @param {string} month - Month in YYYY-MM format
   * @returns {Object} Generated summary report
   */
  async generateMonthlySummary(month) {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 Generating AI summary for ${month}`);
      
      // Check cache first (but skip for testing AI)
      const cacheKey = `summary_${month}`;
      const cached = this.getFromCache(cacheKey);
      if (cached && !process.env.FORCE_AI_REGENERATION) {
        console.log(`✅ Using cached summary for ${month} (${Date.now() - startTime}ms)`);
        return cached;
      }
      
      // 1. Collect data for the month (optimized)
      console.log(`📊 Collecting data for ${month}...`);
      const dataStartTime = Date.now();
      const data = await this.collectMonthlyDataOptimized(month);
      console.log(`📊 Data collection completed in ${Date.now() - dataStartTime}ms`);
      
      // 2. Generate AI summary (using real AI!)
      console.log(`🤖 Generating AI summary with Ollama...`);
      const summaryStartTime = Date.now();
      const aiSummary = await this.generateAISummary(data);
      console.log(`🤖 AI summary generation completed in ${Date.now() - summaryStartTime}ms`);
      
      // 3. Generate PDF report
      console.log(`📄 Generating PDF report...`);
      const pdfStartTime = Date.now();
      const pdfPath = await this.generatePDFReport(aiSummary, data);
      console.log(`📄 PDF generation completed in ${Date.now() - pdfStartTime}ms`);
      
      // Add PDF path to summary
      aiSummary.pdfPath = pdfPath;
      aiSummary.pdfUrl = `/api/ai/summaries/${month}/pdf`;
      
      // 4. Save summary to database
      console.log(`💾 Saving summary to database...`);
      const saveStartTime = Date.now();
      const savedSummary = await this.saveSummary(month, aiSummary, data);
      console.log(`💾 Database save completed in ${Date.now() - saveStartTime}ms`);
      
      // Cache the result
      this.setCache(cacheKey, savedSummary);
      
      console.log(`✅ AI summary generated successfully for ${month} (Total: ${Date.now() - startTime}ms)`);
      return savedSummary;
      
    } catch (error) {
      console.error(`❌ Error generating monthly summary for ${month} (${Date.now() - startTime}ms):`, error);
      throw error;
    }
  }

  /**
   * Optimized data collection with single query approach
   * @param {string} month - Month in YYYY-MM format
   * @returns {Object} Collected data
   */
  async collectMonthlyDataOptimized(month) {
    const client = await pool.connect();
    
    try {
      // Parse month and calculate proper date range
      const [year, monthNum] = month.split('-').map(Number);
      const firstDay = new Date(year, monthNum - 1, 1);
      const lastDay = new Date(year, monthNum, 0); // Last day of month
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      
      // Single optimized query for both incidents and actions
      const combinedQuery = `
        WITH incident_data AS (
          SELECT 
            i.*,
            c.name as category_name,
            l.name as location_name,
            u.username as created_by_name
          FROM Incidents i
          LEFT JOIN Categories c ON i.category_id = c.id
          LEFT JOIN Locations l ON i.location_id = l.id
          LEFT JOIN Users u ON i.created_by = u.id
          WHERE DATE(i.created_at) >= $1 AND DATE(i.created_at) <= $2
        ),
        action_data AS (
          SELECT 
            a.*,
            i.title as incident_title,
            i.priority as incident_priority
          FROM Actions a
          LEFT JOIN Incidents i ON a.incident_id = i.id
          WHERE DATE(a.created_at) >= $1 AND DATE(a.created_at) <= $2
        ),
        incident_stats AS (
          SELECT 
            COUNT(*) as total_incidents,
            COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_priority,
            COUNT(CASE WHEN priority = 'Medium' THEN 1 END) as medium_priority,
            COUNT(CASE WHEN priority = 'Low' THEN 1 END) as low_priority,
            COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_incidents,
            COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_incidents,
            COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed_incidents
          FROM incident_data
        ),
        action_stats AS (
          SELECT 
            COUNT(*) as total_actions,
            COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_actions,
            COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_actions,
            COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_actions
          FROM action_data
        )
        SELECT 
          (SELECT json_agg(incident_data.*) FROM incident_data) as incidents,
          (SELECT json_agg(action_data.*) FROM action_data) as actions,
          (SELECT row_to_json(incident_stats.*) FROM incident_stats) as incident_stats,
          (SELECT row_to_json(action_stats.*) FROM action_stats) as action_stats
      `;
      
      const result = await client.query(combinedQuery, [startDate, endDate]);
      const row = result.rows[0];
      
      const incidents = row.incidents || [];
      const actions = row.actions || [];
      const incidentStats = row.incident_stats || {};
      const actionStats = row.action_stats || {};
      
      // Build comprehensive stats
      const stats = {
        totalIncidents: parseInt(incidentStats.total_incidents) || 0,
        totalActions: parseInt(actionStats.total_actions) || 0,
        incidentsByPriority: {
          High: parseInt(incidentStats.high_priority) || 0,
          Medium: parseInt(incidentStats.medium_priority) || 0,
          Low: parseInt(incidentStats.low_priority) || 0
        },
        incidentsByStatus: {
          Open: parseInt(incidentStats.open_incidents) || 0,
          'In Progress': parseInt(incidentStats.in_progress_incidents) || 0,
          Closed: parseInt(incidentStats.closed_incidents) || 0
        },
        actionsByStatus: {
          Pending: parseInt(actionStats.pending_actions) || 0,
          'In Progress': parseInt(actionStats.in_progress_actions) || 0,
          Completed: parseInt(actionStats.completed_actions) || 0
        },
        completedActions: parseInt(actionStats.completed_actions) || 0,
        avgIncidentsPerDay: (parseInt(incidentStats.total_incidents) || 0) / 30,
        avgActionsPerIncident: (parseInt(actionStats.total_actions) || 0) / Math.max(parseInt(incidentStats.total_incidents) || 1, 1),
        // Group by category and location (simplified)
        incidentsByCategory: this.groupBy(incidents, 'category_name'),
        incidentsByLocation: this.groupBy(incidents, 'location_name')
      };

      // Get previous month stats (optimized - only basic stats)
      const prevMonth = this.getPreviousMonth(month);
      const prevMonthStats = await this.getPreviousMonthStatsOptimized(prevMonth, client);

      return {
        month,
        incidents: incidents.slice(0, 50), // Limit for performance
        actions: actions.slice(0, 50), // Limit for performance
        stats,
        prevMonthStats,
        trends: this.calculateTrends(stats, prevMonthStats)
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Optimized previous month stats - only get essential numbers
   */
  async getPreviousMonthStatsOptimized(prevMonth, client = null) {
    const shouldReleaseClient = !client;
    if (!client) {
      client = await pool.connect();
    }
    
    try {
      const [year, monthNum] = prevMonth.split('-').map(Number);
      const firstDay = new Date(year, monthNum - 1, 1);
      const lastDay = new Date(year, monthNum, 0);
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      
      // Lightweight query - only get counts
      const statsQuery = `
        WITH incident_counts AS (
          SELECT COUNT(*) as total_incidents
          FROM Incidents 
          WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2
        ),
        action_counts AS (
          SELECT 
            COUNT(*) as total_actions,
            COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_actions
          FROM Actions 
          WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2
        )
        SELECT 
          (SELECT total_incidents FROM incident_counts) as total_incidents,
          (SELECT total_actions FROM action_counts) as total_actions,
          (SELECT completed_actions FROM action_counts) as completed_actions
      `;
      
      const result = await client.query(statsQuery, [startDate, endDate]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        totalIncidents: parseInt(row.total_incidents) || 0,
        totalActions: parseInt(row.total_actions) || 0,
        completedActions: parseInt(row.completed_actions) || 0
      };
      
    } catch (error) {
      console.warn(`Could not get previous month stats for ${prevMonth}:`, error.message);
      return null;
    } finally {
      if (shouldReleaseClient) {
        client.release();
      }
    }
  }

  /**
   * Generate AI summary using the configured AI provider
   * @param {Object} data - Monthly data to summarize
   * @returns {Object} AI generated summary
   */
  async generateAISummary(data) {
    try {
      console.log('🔍 Starting AI summary generation...');
      
      // Test Ollama connection first
      console.log('🔗 Testing Ollama connection...');
      const isConnected = await this.ollamaService.testConnection();
      console.log(`🔗 Ollama connection result: ${isConnected}`);
      
      if (!isConnected) {
        console.warn('⚠️ Ollama not available, falling back to structured summary');
        return this.generateStructuredSummary(data);
      }

      // Generate AI text summary
      console.log(`🤖 Generating AI text with Ollama...`);
      const aiText = await this.ollamaService.generateMonthlySummary(data);
      console.log(`✅ AI text generated: ${aiText.length} characters`);
      
      // Generate trend analysis if previous data exists
      let trendAnalysis = null;
      if (data.prevMonthStats) {
        console.log(`📈 Generating trend analysis...`);
        trendAnalysis = await this.ollamaService.generateTrendAnalysis(data, data.prevMonthStats);
        console.log(`✅ Trend analysis generated: ${trendAnalysis ? trendAnalysis.length : 0} characters`);
      }

      // Combine AI text with structured data
      console.log(`🔧 Combining AI text with structured data...`);
      const result = this.combineAIWithStructuredData(data, aiText, trendAnalysis);
      console.log(`✅ Combined AI summary created with provider: ${result.aiProvider}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ AI generation failed, falling back to structured summary:', error);
      console.error('Error details:', error.stack);
      return this.generateStructuredSummary(data);
    }
  }

  /**
   * Combine AI-generated text with structured data
   * @param {Object} data - Monthly data
   * @param {string} aiText - AI-generated summary text
   * @param {string} trendAnalysis - AI-generated trend analysis
   * @returns {Object} Combined AI summary
   */
  combineAIWithStructuredData(data, aiText, trendAnalysis) {
    const { stats, trends } = data;
    
    // Parse key insights from structured data
    const topCategory = this.getTopItem(stats.incidentsByCategory);
    const topLocation = this.getTopItem(stats.incidentsByLocation);
    const highPriorityCount = stats.incidentsByPriority.High || 0;
    const completionRate = stats.totalActions > 0 
      ? ((stats.completedActions / stats.totalActions) * 100).toFixed(1)
      : '0.0';

    return {
      overview: {
        totalIncidents: stats.totalIncidents,
        totalActions: stats.totalActions,
        completionRate: parseFloat(completionRate),
        avgIncidentsPerDay: parseFloat(stats.avgIncidentsPerDay.toFixed(1))
      },
      aiGeneratedSummary: aiText, // This is the real AI-generated content!
      aiTrendAnalysis: trendAnalysis,
      keyInsights: [
        `Meest voorkomende categorie: ${topCategory.name} (${topCategory.count} incidenten)`,
        `Meest getroffen locatie: ${topLocation.name} (${topLocation.count} incidenten)`,
        `Hoge prioriteit incidenten: ${highPriorityCount}`,
        `Actie voltooiingspercentage: ${completionRate}%`
      ],
      trends: {
        incidentTrend: trends.incidentChange > 0 ? 'stijgend' : 'dalend',
        incidentChange: trends.incidentChange,
        actionCompletionTrend: trends.actionCompletionChange > 0 ? 'verbeterd' : 'verslechterd',
        actionCompletionChange: trends.actionCompletionChange
      },
      recommendations: this.generateRecommendations(data),
      actionPoints: this.generateActionPoints(data),
      generatedAt: new Date().toISOString(),
      dataSource: 'CAS Service Portal',
      month: data.month,
      aiProvider: 'Ollama (llama3.2:3b)',
      performance: {
        realAI: true,
        cached: false
      }
    };
  }

  /**
   * Generate structured summary (Fallback implementation)
   * @param {Object} data - Monthly data
   * @returns {Object} Structured summary
   */
  generateStructuredSummary(data) {
    const { stats, trends } = data;
    
    // Identify key insights
    const topCategory = this.getTopItem(stats.incidentsByCategory);
    const topLocation = this.getTopItem(stats.incidentsByLocation);
    const highPriorityCount = stats.incidentsByPriority.High || 0;
    const completionRate = stats.totalActions > 0 
      ? ((stats.completedActions / stats.totalActions) * 100).toFixed(1)
      : '0.0';

    return {
      overview: {
        totalIncidents: stats.totalIncidents,
        totalActions: stats.totalActions,
        completionRate: parseFloat(completionRate),
        avgIncidentsPerDay: parseFloat(stats.avgIncidentsPerDay.toFixed(1))
      },
      keyInsights: [
        `Meest voorkomende categorie: ${topCategory.name} (${topCategory.count} incidenten)`,
        `Meest getroffen locatie: ${topLocation.name} (${topLocation.count} incidenten)`,
        `Hoge prioriteit incidenten: ${highPriorityCount}`,
        `Actie voltooiingspercentage: ${completionRate}%`
      ],
      trends: {
        incidentTrend: trends.incidentChange > 0 ? 'stijgend' : 'dalend',
        incidentChange: trends.incidentChange,
        actionCompletionTrend: trends.actionCompletionChange > 0 ? 'verbeterd' : 'verslechterd',
        actionCompletionChange: trends.actionCompletionChange
      },
      recommendations: this.generateRecommendations(data),
      actionPoints: this.generateActionPoints(data),
      generatedAt: new Date().toISOString(),
      dataSource: 'CAS Service Portal',
      month: data.month,
      performance: {
        dataOptimized: true,
        cached: false
      }
    };
  }

  /**
   * Generate recommendations based on data analysis
   * @param {Object} data - Monthly data
   * @returns {Array} List of recommendations
   */
  generateRecommendations(data) {
    const recommendations = [];
    const { stats } = data;
    
    // High priority incidents
    const highPriorityCount = stats.incidentsByPriority.High || 0;
    if (highPriorityCount > 5) {
      recommendations.push(`Verhoogde aandacht nodig voor ${highPriorityCount} hoge prioriteit incidenten`);
    }
    
    // Action completion rate
    const completionRate = stats.totalActions > 0 
      ? (stats.completedActions / stats.totalActions) * 100
      : 0;
    if (completionRate < 80) {
      recommendations.push(`Actie voltooiingspercentage (${completionRate.toFixed(1)}%) kan worden verbeterd`);
    }
    
    // Top problematic location
    const topLocation = this.getTopItem(stats.incidentsByLocation);
    if (topLocation.count > stats.totalIncidents * 0.3) {
      recommendations.push(`Extra aandacht voor locatie ${topLocation.name} (${topLocation.count} incidenten)`);
    }
    
    return recommendations;
  }

  /**
   * Generate action points for management
   * @param {Object} data - Monthly data
   * @returns {Array} List of action points
   */
  generateActionPoints(data) {
    const actionPoints = [];
    const { stats, trends } = data;
    
    if (trends.incidentChange > 20) {
      actionPoints.push('Onderzoek oorzaken van stijging in incidenten');
    }
    
    if (trends.actionCompletionChange < -10) {
      actionPoints.push('Evalueer actie toewijzing en follow-up processen');
    }
    
    const topCategory = this.getTopItem(stats.incidentsByCategory);
    if (topCategory.count > 10) {
      actionPoints.push(`Focus op preventie voor categorie: ${topCategory.name}`);
    }
    
    return actionPoints;
  }

  /**
   * Save generated summary to database
   * @param {string} month - Month in YYYY-MM format
   * @param {Object} summary - Generated summary
   * @param {Object} rawData - Raw data used for summary (limited for performance)
   * @returns {Object} Saved summary record
   */
  async saveSummary(month, summary, rawData) {
    const client = await pool.connect();
    
    try {
      // Create AI_Reports table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS AI_Reports (
          id SERIAL PRIMARY KEY,
          report_type VARCHAR(50) NOT NULL,
          report_month VARCHAR(7) NOT NULL,
          summary_data JSONB NOT NULL,
          raw_data JSONB,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          generated_by_ai BOOLEAN DEFAULT true
        )
      `);
      
      // Limit raw data size for performance
      const limitedRawData = {
        month: rawData.month,
        stats: rawData.stats,
        trends: rawData.trends,
        incidentCount: rawData.incidents?.length || 0,
        actionCount: rawData.actions?.length || 0
      };
      
      // Insert the summary
      const result = await client.query(`
        INSERT INTO AI_Reports (report_type, report_month, summary_data, raw_data)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, ['monthly_summary', month, JSON.stringify(summary), JSON.stringify(limitedRawData)]);
      
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }

  // Cache management
  setCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }

  // Utility methods
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'Onbekend';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  getTopItem(groupedData) {
    const entries = Object.entries(groupedData);
    if (entries.length === 0) return { name: 'Geen data', count: 0 };
    
    const sorted = entries.sort(([,a], [,b]) => b - a);
    return { name: sorted[0][0], count: sorted[0][1] };
  }

  getPreviousMonth(month) {
    const [year, monthNum] = month.split('-').map(Number);
    const prevDate = new Date(year, monthNum - 2, 1); // monthNum - 2 because months are 0-indexed
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  }

  calculateTrends(currentStats, prevStats) {
    if (!prevStats) {
      return {
        incidentChange: 0,
        actionCompletionChange: 0
      };
    }

    const incidentChange = prevStats.totalIncidents > 0 
      ? ((currentStats.totalIncidents - prevStats.totalIncidents) / prevStats.totalIncidents) * 100
      : 0;

    const currentCompletionRate = currentStats.totalActions > 0
      ? (currentStats.completedActions / currentStats.totalActions) * 100
      : 0;
    const prevCompletionRate = prevStats.totalActions > 0
      ? (prevStats.completedActions / prevStats.totalActions) * 100
      : 0;
    const actionCompletionChange = prevCompletionRate > 0 
      ? currentCompletionRate - prevCompletionRate
      : 0;

    return {
      incidentChange: parseFloat(incidentChange.toFixed(1)),
      actionCompletionChange: parseFloat(actionCompletionChange.toFixed(1))
    };
  }

  /**
   * Generate PDF report from summary data
   * @param {Object} summary - Generated summary data
   * @param {Object} data - Raw data used for the summary
   * @returns {string} Path to generated PDF file
   */
  async generatePDFReport(summary, data) {
    try {
      const month = data.month;
      const [year, monthNum] = month.split('-');
      const monthName = this.getMonthName(month);
      
      // Create reports directory if it doesn't exist
      const reportsDir = path.join(__dirname, '../../uploads/reports');
      try {
        await fs.access(reportsDir);
      } catch {
        await fs.mkdir(reportsDir, { recursive: true });
      }
      
      const fileName = `AI_Report_${month}.pdf`;
      const filePath = path.join(reportsDir, fileName);
      
      // Generate HTML content for the PDF
      const htmlContent = this.generateReportHTML(summary, data);
      
      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      
      await browser.close();
      
      return filePath;
      
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw error;
    }
  }

  /**
   * Generate HTML content for the PDF report
   * @param {Object} summary - Summary data
   * @param {Object} data - Raw data
   * @returns {string} HTML content
   */
  generateReportHTML(summary, data) {
    const monthName = this.getMonthName(data.month);
    const [year] = data.month.split('-');
    
    // Calculate additional statistics
    const categoryStats = Object.entries(data.stats.incidentsByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    const locationStats = Object.entries(data.stats.incidentsByLocation)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    const priorityStats = data.stats.incidentsByPriority;
    const statusStats = data.stats.incidentsByStatus;
    
    return `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Maandrapport ${monthName} ${year}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #fff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 0; text-align: center; margin-bottom: 40px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; font-weight: 300; }
        .header .subtitle { font-size: 1.2em; opacity: 0.9; }
        .container { max-width: 800px; margin: 0 auto; padding: 0 20px; }
        .section { margin-bottom: 40px; background: #f8f9fa; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .section-title { font-size: 1.8em; margin-bottom: 20px; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 25px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #3498db; }
        .stat-number { font-size: 2.5em; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }
        .stat-label { color: #7f8c8d; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
        .insights-list { list-style: none; padding: 0; }
        .insights-list li { background: white; margin-bottom: 15px; padding: 20px; border-radius: 8px; border-left: 4px solid #27ae60; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .recommendations-list { list-style: none; padding: 0; }
        .recommendations-list li { background: white; margin-bottom: 15px; padding: 20px; border-radius: 8px; border-left: 4px solid #f39c12; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .chart-container { background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .chart-title { font-size: 1.2em; margin-bottom: 15px; color: #2c3e50; text-align: center; }
        .bar-chart { display: flex; flex-direction: column; gap: 10px; }
        .bar-item { display: flex; align-items: center; gap: 15px; }
        .bar-label { min-width: 120px; font-size: 0.9em; color: #555; }
        .bar { height: 25px; background: linear-gradient(90deg, #3498db, #2980b9); border-radius: 4px; display: flex; align-items: center; padding: 0 10px; color: white; font-weight: bold; font-size: 0.8em; }
        .trends-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .trend-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .trend-positive { border-left: 4px solid #27ae60; }
        .trend-negative { border-left: 4px solid #e74c3c; }
        .trend-neutral { border-left: 4px solid #95a5a6; }
        .trend-value { font-size: 1.8em; font-weight: bold; margin-bottom: 5px; }
        .trend-positive .trend-value { color: #27ae60; }
        .trend-negative .trend-value { color: #e74c3c; }
        .trend-neutral .trend-value { color: #95a5a6; }
        .footer { background: #34495e; color: white; padding: 30px 0; text-align: center; margin-top: 50px; }
        .footer p { margin-bottom: 10px; }
        .priority-high { border-left-color: #e74c3c !important; }
        .priority-medium { border-left-color: #f39c12 !important; }
        .priority-low { border-left-color: #27ae60 !important; }
        @media print { .header { background: #667eea !important; -webkit-print-color-adjust: exact; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>🤖 AI Maandrapport</h1>
            <div class="subtitle">${monthName} ${year} - CAS Service Portal</div>
            <div style="margin-top: 15px; font-size: 0.9em; opacity: 0.8;">
                Gegenereerd op ${new Date(summary.generatedAt).toLocaleDateString('nl-NL', {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
            </div>
        </div>
    </div>

    <div class="container">
        <div class="section">
            <h2 class="section-title">📊 Executive Summary</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${summary.overview.totalIncidents}</div>
                    <div class="stat-label">Totaal Incidenten</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${summary.overview.totalActions}</div>
                    <div class="stat-label">Totaal Acties</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${summary.overview.completionRate}%</div>
                    <div class="stat-label">Voltooiingspercentage</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${summary.overview.avgIncidentsPerDay}</div>
                    <div class="stat-label">Gem. per Dag</div>
                </div>
            </div>
        </div>

        ${summary.aiGeneratedSummary ? `
        <div class="section">
            <h2 class="section-title">🤖 AI Samenvatting</h2>
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); line-height: 1.8; font-size: 0.95em;">
                ${summary.aiGeneratedSummary.split('\n').map(paragraph => 
                  paragraph.trim() ? `<p style="margin-bottom: 15px;">${paragraph.trim()}</p>` : ''
                ).join('')}
            </div>
            ${summary.aiProvider ? `
            <div style="text-align: right; margin-top: 10px; font-size: 0.8em; color: #666; font-style: italic;">
                Gegenereerd door: ${summary.aiProvider}
            </div>
            ` : ''}
        </div>
        ` : ''}

        ${summary.aiTrendAnalysis ? `
        <div class="section">
            <h2 class="section-title">📈 AI Trendanalyse</h2>
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); line-height: 1.8; font-size: 0.95em;">
                ${summary.aiTrendAnalysis.split('\n').map(paragraph => 
                  paragraph.trim() ? `<p style="margin-bottom: 15px;">${paragraph.trim()}</p>` : ''
                ).join('')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2 class="section-title">💡 Belangrijkste Inzichten</h2>
            <ul class="insights-list">
                ${summary.keyInsights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        </div>

        <div class="section">
            <h2 class="section-title">📈 Incident Analyse</h2>
            
            <div class="chart-container">
                <div class="chart-title">Incidenten per Categorie</div>
                <div class="bar-chart">
                    ${categoryStats.map(([category, count]) => `
                        <div class="bar-item">
                            <div class="bar-label">${category}</div>
                            <div class="bar" style="width: ${Math.max(50, (count / Math.max(...categoryStats.map(([,c]) => c))) * 300)}px;">
                                ${count}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="chart-container">
                <div class="chart-title">Incidenten per Locatie</div>
                <div class="bar-chart">
                    ${locationStats.map(([location, count]) => `
                        <div class="bar-item">
                            <div class="bar-label">${location}</div>
                            <div class="bar" style="width: ${Math.max(50, (count / Math.max(...locationStats.map(([,c]) => c))) * 300)}px;">
                                ${count}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card priority-high">
                    <div class="stat-number">${priorityStats.High || 0}</div>
                    <div class="stat-label">Hoge Prioriteit</div>
                </div>
                <div class="stat-card priority-medium">
                    <div class="stat-number">${priorityStats.Medium || 0}</div>
                    <div class="stat-label">Gemiddelde Prioriteit</div>
                </div>
                <div class="stat-card priority-low">
                    <div class="stat-number">${priorityStats.Low || 0}</div>
                    <div class="stat-label">Lage Prioriteit</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">📊 Trends & Vergelijkingen</h2>
            <div class="trends-container">
                <div class="trend-card ${summary.trends.incidentChange > 0 ? 'trend-positive' : summary.trends.incidentChange < 0 ? 'trend-negative' : 'trend-neutral'}">
                    <div class="trend-value">${summary.trends.incidentChange > 0 ? '+' : ''}${summary.trends.incidentChange}%</div>
                    <div class="stat-label">Incident Trend</div>
                    <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                        ${summary.trends.incidentTrend} t.o.v. vorige maand
                    </div>
                </div>
                <div class="trend-card ${summary.trends.actionCompletionChange > 0 ? 'trend-positive' : summary.trends.actionCompletionChange < 0 ? 'trend-negative' : 'trend-neutral'}">
                    <div class="trend-value">${summary.trends.actionCompletionChange > 0 ? '+' : ''}${summary.trends.actionCompletionChange}%</div>
                    <div class="stat-label">Voltooiing Trend</div>
                    <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                        ${summary.trends.actionCompletionTrend} t.o.v. vorige maand
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">🎯 Aanbevelingen</h2>
            <ul class="recommendations-list">
                ${summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        ${summary.actionPoints.length > 0 ? `
        <div class="section">
            <h2 class="section-title">⚡ Actiepunten voor Management</h2>
            <ul class="recommendations-list">
                ${summary.actionPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    </div>

    <div class="footer">
        <div class="container">
            <p><strong>CAS Service Portal - AI Maandrapport</strong></p>
            <p>🤖 Automatisch gegenereerd door ${summary.aiProvider || 'AI'} op ${new Date(summary.generatedAt).toLocaleDateString('nl-NL')}</p>
            <p>📊 Gebaseerd op ${data.stats.totalIncidents} incidenten en ${data.stats.totalActions} acties</p>
            ${summary.performance?.realAI ? '<p>✅ Lokale AI verwerking - Geen data gelekt naar externe services</p>' : ''}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Get month name in Dutch
   * @param {string} month - Month in YYYY-MM format
   * @returns {string} Dutch month name
   */
  getMonthName(month) {
    const [year, monthNum] = month.split('-');
    const monthNames = [
      'januari', 'februari', 'maart', 'april', 'mei', 'juni',
      'juli', 'augustus', 'september', 'oktober', 'november', 'december'
    ];
    return monthNames[parseInt(monthNum) - 1];
  }

// ... existing code ...
}

module.exports = SummaryService; 