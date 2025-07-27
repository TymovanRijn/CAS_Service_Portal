const SummaryService = require('../ai/services/summaryService');
const OllamaService = require('../ai/services/ollamaService');
const path = require('path');

// Initialize AI services
const summaryService = new SummaryService();
const ollamaService = new OllamaService();

// AI Insights Cache
let aiInsightsCache = {
  data: null,
  lastGenerated: null,
  isGenerating: false
};

const CACHE_DURATION = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

// Initialize background AI insights generation
initializeBackgroundAIGeneration();

// Generate monthly AI summary
const generateMonthlySummary = async (req, res) => {
  try {
    const { month } = req.query;
    
    // Validate month format (YYYY-MM)
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ 
        message: 'Invalid month format. Use YYYY-MM format (e.g., 2024-12)' 
      });
    }
    
    console.log(`🤖 AI Summary request for month: ${month}`);
    
    // Generate summary
    const summary = await summaryService.generateMonthlySummary(month);
    
    res.json({
      success: true,
      message: `AI summary generated successfully for ${month}`,
      data: summary
    });
    
  } catch (err) {
    console.error('Error generating AI summary:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error generating AI summary',
      error: err.message 
    });
  }
};

// Serve PDF files
const servePDF = async (req, res) => {
  try {
    const { month } = req.params;
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ 
        message: 'Invalid month format. Use YYYY-MM format' 
      });
    }
    
    const fileName = `AI_Report_${month}.pdf`;
    const filePath = path.join(__dirname, '../uploads/reports', fileName);
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: `PDF report not found for ${month}. Generate the report first.`
      });
    }
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AI_Rapport_${month}.pdf"`);
    
    // Send the file
    res.sendFile(filePath);
    
  } catch (err) {
    console.error('Error serving PDF:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error serving PDF file',
      error: err.message 
    });
  }
};

// Get existing AI summaries
const getAISummaries = async (req, res) => {
  try {
    const { limit = 12, type = 'monthly_summary' } = req.query;
    
    const { pool } = require('../config/db');
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        id,
        report_type,
        report_month,
        summary_data,
        generated_at,
        generated_by_ai
      FROM AI_Reports 
      WHERE report_type = $1
      ORDER BY report_month DESC
      LIMIT $2
    `, [type, limit]);
    
    client.release();
    
    res.json({
      success: true,
      data: {
        summaries: result.rows,
        total: result.rows.length
      }
    });
    
  } catch (err) {
    console.error('Error fetching AI summaries:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching AI summaries',
      error: err.message 
    });
  }
};

// Get specific AI summary by month
const getAISummaryByMonth = async (req, res) => {
  try {
    const { month } = req.params;
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ 
        message: 'Invalid month format. Use YYYY-MM format' 
      });
    }
    
    const { pool } = require('../config/db');
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT *
      FROM AI_Reports 
      WHERE report_month = $1 AND report_type = 'monthly_summary'
      ORDER BY generated_at DESC
      LIMIT 1
    `, [month]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No AI summary found for ${month}`
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (err) {
    console.error('Error fetching AI summary:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching AI summary',
      error: err.message 
    });
  }
};

// Get AI insights for dashboard (NOW WITH CACHING!)
const getAIInsights = async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Check if we have valid cached insights
    const cacheAge = aiInsightsCache.lastGenerated ? now - aiInsightsCache.lastGenerated : Infinity;
    const isCacheValid = cacheAge < CACHE_DURATION && aiInsightsCache.data;
    
    if (isCacheValid) {
      // Serve cached insights (FAST!)
      console.log(`⚡ Serving cached AI insights (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
      
      res.json({
        success: true,
        data: {
          ...aiInsightsCache.data,
          generatedAt: aiInsightsCache.lastGenerated.toISOString(),
          month: currentMonth,
          aiPowered: true,
          cached: true,
          cacheAge: Math.round(cacheAge / 1000 / 60) // minutes
        }
      });
      return;
    }
    
    // If no valid cache and not currently generating, trigger background generation
    if (!aiInsightsCache.isGenerating) {
      console.log('🔄 Triggering background AI insights generation...');
      generateAIInsightsBackground(); // Don't await - run in background
    }
    
    // Serve fallback insights while AI generates in background
    console.log('⚡ Serving fallback insights while AI generates...');
    const fallbackInsights = await generateRealTimeInsights();
    
    res.json({
      success: true,
      data: {
        insights: fallbackInsights,
        generatedAt: new Date().toISOString(),
        month: currentMonth,
        aiPowered: false,
        generating: aiInsightsCache.isGenerating,
        message: aiInsightsCache.isGenerating ? 'AI insights worden gegenereerd op de achtergrond...' : 'Cache verlopen, nieuwe AI insights worden gegenereerd'
      }
    });
    
  } catch (err) {
    console.error('Error serving AI insights:', err);
    
    // Always serve something, even on error
    const fallbackInsights = await generateRealTimeInsights();
    res.json({
      success: true,
      data: {
        insights: fallbackInsights,
        generatedAt: new Date().toISOString(),
        month: currentMonth,
        aiPowered: false,
        error: true
      }
    });
  }
};

// Initialize background AI generation system
function initializeBackgroundAIGeneration() {
  console.log('🤖 Initializing background AI insights generation...');
  
  // Generate initial insights on startup (after 30 seconds delay)
  setTimeout(() => {
    console.log('🚀 Generating initial AI insights...');
    generateAIInsightsBackground();
  }, 30000);
  
  // Set up recurring generation every 5 hours
  setInterval(() => {
    console.log('⏰ Scheduled AI insights generation...');
    generateAIInsightsBackground();
  }, CACHE_DURATION);
  
  console.log(`✅ Background AI generation scheduled every ${CACHE_DURATION / 1000 / 60 / 60} hours`);
}

// Generate AI insights in background (non-blocking)
async function generateAIInsightsBackground() {
  if (aiInsightsCache.isGenerating) {
    console.log('⚠️ AI insights generation already in progress, skipping...');
    return;
  }
  
  aiInsightsCache.isGenerating = true;
  const startTime = Date.now();
  
  try {
    console.log('🤖 Starting background AI insights generation...');
    
    // Generate REAL AI insights
    const insights = await generateRealAIInsights();
    
    // Update cache
    aiInsightsCache.data = {
      insights,
      aiPowered: true,
      backgroundGenerated: true
    };
    aiInsightsCache.lastGenerated = new Date();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Background AI insights generated successfully in ${duration}ms`);
    console.log(`📊 Generated ${insights.length} AI insights`);
    
  } catch (error) {
    console.error('❌ Background AI insights generation failed:', error);
    
    // Fallback to rule-based insights on AI failure
    try {
      const fallbackInsights = await generateRealTimeInsights();
      aiInsightsCache.data = {
        insights: fallbackInsights,
        aiPowered: false,
        fallback: true,
        error: error.message
      };
      aiInsightsCache.lastGenerated = new Date();
      console.log('🔄 Fallback insights cached instead');
    } catch (fallbackError) {
      console.error('❌ Even fallback insights failed:', fallbackError);
    }
  } finally {
    aiInsightsCache.isGenerating = false;
  }
}

// Force refresh AI insights (for manual refresh button)
const forceRefreshAIInsights = async (req, res) => {
  try {
    console.log('🔄 Manual AI insights refresh requested...');
    
    // Clear cache to force regeneration
    aiInsightsCache.data = null;
    aiInsightsCache.lastGenerated = null;
    
    // Trigger background generation
    generateAIInsightsBackground();
    
    // Return immediate response
    res.json({
      success: true,
      message: 'AI insights refresh gestart op de achtergrond',
      data: {
        refreshing: true,
        estimatedTime: '30-60 seconden'
      }
    });
    
  } catch (error) {
    console.error('Error forcing AI insights refresh:', error);
    res.status(500).json({
      success: false,
      message: 'Fout bij vernieuwen van AI insights',
      error: error.message
    });
  }
};

// Get cache status (for debugging)
const getAIInsightsCacheStatus = async (req, res) => {
  const now = new Date();
  const cacheAge = aiInsightsCache.lastGenerated ? now - aiInsightsCache.lastGenerated : null;
  
  res.json({
    success: true,
    data: {
      hasCache: !!aiInsightsCache.data,
      lastGenerated: aiInsightsCache.lastGenerated,
      cacheAge: cacheAge ? Math.round(cacheAge / 1000 / 60) : null, // minutes
      isGenerating: aiInsightsCache.isGenerating,
      cacheValid: cacheAge ? cacheAge < CACHE_DURATION : false,
      nextGeneration: aiInsightsCache.lastGenerated ? 
        new Date(aiInsightsCache.lastGenerated.getTime() + CACHE_DURATION) : null,
      insightsCount: aiInsightsCache.data?.insights?.length || 0
    }
  });
};

// Generate REAL AI-powered insights (temporarily disabled for tenant migration)
const generateRealAIInsights = async () => {
  console.log('🤖 AI insights temporarily disabled during tenant migration');
  return [];
  
  try {
    console.log('🤖 Generating REAL AI insights with Ollama...');
    
    // Get comprehensive data for AI analysis
    const recentIncidents = await client.query(`
      SELECT 
        i.*,
        c.name as category_name,
        l.name as location_name,
        u.username as created_by_name,
        EXTRACT(DOW FROM i.created_at) as day_of_week,
        EXTRACT(HOUR FROM i.created_at) as hour_of_day
      FROM Incidents i
      LEFT JOIN Categories c ON i.category_id = c.id
      LEFT JOIN Locations l ON i.location_id = l.id
      LEFT JOIN Users u ON i.created_by = u.id
      WHERE i.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY i.created_at DESC
      LIMIT 50
    `);
    
    const pendingActions = await client.query(`
      SELECT 
        a.*,
        i.title as incident_title,
        i.priority as incident_priority,
        u.username as assigned_to_name
      FROM Actions a
      LEFT JOIN Incidents i ON a.incident_id = i.id
      LEFT JOIN Users u ON a.assigned_to = u.id
      WHERE a.status IN ('Pending', 'In Progress')
      ORDER BY a.created_at ASC
      LIMIT 20
    `);
    
    // Prepare data summary for AI
    const incidents = recentIncidents.rows;
    const actions = pendingActions.rows;
    
    const dataContext = {
      totalIncidents: incidents.length,
      todayIncidents: incidents.filter(i => {
        const today = new Date().toDateString();
        return new Date(i.created_at).toDateString() === today;
      }).length,
      highPriorityCount: incidents.filter(i => i.priority === 'High').length,
      pendingActionsCount: actions.length,
      categories: [...new Set(incidents.map(i => i.category_name).filter(Boolean))],
      locations: [...new Set(incidents.map(i => i.location_name).filter(Boolean))],
      timePatterns: incidents.reduce((acc, incident) => {
        const hour = incident.hour_of_day;
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {}),
      locationHotspots: incidents.reduce((acc, incident) => {
        const location = incident.location_name || 'Onbekend';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {})
    };
    
    // Generate AI insights using Ollama
    const aiInsightsText = await generateAIInsightsPrompt(dataContext);
    
    // Parse AI response into structured insights
    const structuredInsights = parseAIInsights(aiInsightsText, dataContext);
    
    console.log('✅ Real AI insights generated successfully');
    return structuredInsights;
    
  } finally {
    client.release();
  }
};

// Generate AI insights prompt and get response
const generateAIInsightsPrompt = async (dataContext) => {
  // Build top time patterns
  const topTimePatterns = Object.entries(dataContext.timePatterns)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour, count]) => `${hour}:00 uur (${count} incidenten)`)
    .join(', ');
  
  // Build top location hotspots  
  const topLocations = Object.entries(dataContext.locationHotspots)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([location, count]) => `${location} (${count} incidenten)`)
    .join(', ');

  const prompt = `Je bent een AI beveiligingsanalist voor een luchthaven. Analyseer deze data van de afgelopen 7 dagen en geef EXACT 3 concrete inzichten.

DATA OVERZICHT:
• Totaal incidenten: ${dataContext.totalIncidents}
• Vandaag: ${dataContext.todayIncidents} nieuwe incidenten  
• Hoge prioriteit: ${dataContext.highPriorityCount}
• Openstaande acties: ${dataContext.pendingActionsCount}
• Drukste tijden: ${topTimePatterns || 'Geen data'}
• Meeste incidenten: ${topLocations || 'Geen data'}

INSTRUCTIES:
Geef EXACT 3 inzichten in deze exacte format:

1. HOOG JA ALERT: [Concrete waarschuwing over kritieke situatie]
2. MEDIUM NEE TREND: [Patroon of trend observatie]  
3. LAAG NEE LOCATION: [Locatie-specifieke observatie]

REGELS:
- Gebruik ALLEEN: HOOG/MEDIUM/LAAG voor prioriteit
- Gebruik ALLEEN: JA/NEE voor actie vereist
- Gebruik ALLEEN: ALERT/TREND/LOCATION/WORKFLOW voor type
- Maximaal 80 karakters per boodschap
- Geen extra tekst, geen uitleg, geen inleiding
- Begin direct met "1. HOOG..."

BELANGRIJK:
- Gebruik ALLEEN locaties uit de echte data: ${Object.keys(dataContext.locationHotspots).join(', ') || 'Geen locaties'}
- Gebruik ALLEEN categorieën uit de echte data: ${dataContext.categories.join(', ') || 'Geen categorieën'}
- Geen fictieve locaties zoals "Gate A2" of "Terminal B" gebruiken
- Baseer alle inzichten op de werkelijke data hierboven`;

  try {
    const aiResponse = await ollamaService.generateText(prompt, {
      temperature: 0.3, // Lower temperature for more focused insights
      maxTokens: 800
    });
    
    return aiResponse;
  } catch (error) {
    console.error('❌ AI insight generation failed:', error);
    throw error;
  }
};

// Parse AI response into structured insights (IMPROVED!)
const parseAIInsights = (aiText, dataContext) => {
  const insights = [];
  
  console.log('🔍 Raw AI response:', aiText);
  
  // Clean up the AI response
  const cleanText = aiText
    .replace(/Hier zijn \d+-\d+ concrete inzichten.*?:/, '') // Remove intro
    .replace(/Begin direct met de inzichten:/, '') // Remove prompt remnants
    .replace(/Format:.*$/gm, '') // Remove format instructions
    .replace(/Voorbeeld:.*$/gm, '') // Remove examples
    .trim();
  
  const lines = cleanText.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines, numbers, and formatting artifacts
    if (!trimmedLine || 
        /^\d+\.$/.test(trimmedLine) || // Just numbers like "1."
        trimmedLine.length < 10 ||     // Too short
        /^📈$/.test(trimmedLine) ||    // Just emoji
        trimmedLine === 'trend' ||     // Just the word "trend"
        trimmedLine.startsWith('Format:') ||
        trimmedLine.startsWith('Voorbeeld:')) {
      continue;
    }
    
         // Try to parse structured format: "1. PRIORITY ACTION TYPE: Message"
     const structuredMatch = trimmedLine.match(/^(\d+\.\s*)?(HOOG|MEDIUM|LAAG)\s+(JA|NEE)\s+(ALERT|TREND|WORKFLOW|LOCATION):\s*(.+)$/i);
     
     if (structuredMatch) {
       const [, number, priority, actionRequired, type, message] = structuredMatch;
       
       insights.push({
         type: type.toLowerCase(),
         priority: priority.toLowerCase() === 'hoog' ? 'high' : 
                  priority.toLowerCase() === 'medium' ? 'medium' : 'low',
         message: message.trim(),
         actionRequired: actionRequired.toLowerCase() === 'ja',
         aiGenerated: true
       });
       
       console.log('✅ Parsed structured insight:', { type: type.toLowerCase(), priority, message: message.trim() });
     } 
    // Try to parse numbered insights: "1. HOOG JA ALERT: ..."
    else {
      const numberedMatch = trimmedLine.match(/^(?:\d+\.\s*)?(.*?):\s*(.+)$/);
      
      if (numberedMatch) {
        const [, header, message] = numberedMatch;
        
        // Extract priority, action, type from header
        const headerParts = header.trim().split(/\s+/);
        
        if (headerParts.length >= 3) {
          const priority = headerParts[0]?.toLowerCase();
          const actionRequired = headerParts[1]?.toLowerCase() === 'ja';
          const type = headerParts[2]?.toLowerCase();
          
          // Validate extracted values
          if (['hoog', 'medium', 'laag'].includes(priority) && 
              ['alert', 'trend', 'workflow', 'location'].includes(type)) {
            
            insights.push({
              type: type,
              priority: priority === 'hoog' ? 'high' : priority === 'medium' ? 'medium' : 'low',
              message: message.trim(),
              actionRequired: actionRequired,
              aiGenerated: true
            });
            
            console.log('✅ Parsed numbered insight:', { type, priority, message: message.trim() });
          }
        }
      }
      // Fallback: treat as general insight if it looks meaningful
      else if (trimmedLine.length > 30 && 
               !trimmedLine.includes('concrete inzichten') &&
               !trimmedLine.includes('gegeven data')) {
        
        // Determine type and priority from content
        let type = 'trend';
        let priority = 'medium';
        let actionRequired = false;
        
        // Simple keyword detection
        if (trimmedLine.toLowerCase().includes('kritiek') || 
            trimmedLine.toLowerCase().includes('onmiddellijk') ||
            trimmedLine.toLowerCase().includes('urgent')) {
          priority = 'high';
          actionRequired = true;
          type = 'alert';
        } else if (trimmedLine.toLowerCase().includes('locatie') || 
                   trimmedLine.toLowerCase().includes('gate')) {
          type = 'location';
        } else if (trimmedLine.toLowerCase().includes('actie') || 
                   trimmedLine.toLowerCase().includes('workflow')) {
          type = 'workflow';
        }
        
        insights.push({
          type: type,
          priority: priority,
          message: trimmedLine,
          actionRequired: actionRequired,
          aiGenerated: true
        });
        
        console.log('✅ Parsed fallback insight:', { type, priority, message: trimmedLine });
      }
    }
  }
  
  // Remove duplicates based on message similarity
  const uniqueInsights = insights.filter((insight, index, array) => {
    return !array.slice(0, index).some(prev => 
      prev.message.toLowerCase().includes(insight.message.toLowerCase().substring(0, 20)) ||
      insight.message.toLowerCase().includes(prev.message.toLowerCase().substring(0, 20))
    );
  });
  
  // If no insights were parsed, create fallback insights
  if (uniqueInsights.length === 0) {
    uniqueInsights.push({
      type: 'alert',
      priority: 'medium',
      message: `AI heeft ${dataContext.totalIncidents} incidenten geanalyseerd en zoekt naar patronen`,
      actionRequired: false,
      aiGenerated: true
    });
  }
  
  console.log(`🎯 Final parsed insights: ${uniqueInsights.length} unique insights`);
  return uniqueInsights.slice(0, 5); // Limit to 5 insights
};

// Generate real-time insights for dashboard (temporarily disabled for tenant migration)
const generateRealTimeInsights = async () => {
  console.log('🤖 Real-time insights temporarily disabled during tenant migration');
  return [];
  
  try {
    // Get recent incidents (last 7 days)
    const recentIncidents = await client.query(`
      SELECT 
        i.*,
        c.name as category_name,
        l.name as location_name
      FROM Incidents i
      LEFT JOIN Categories c ON i.category_id = c.id
      LEFT JOIN Locations l ON i.location_id = l.id
      WHERE i.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY i.created_at DESC
    `);
    
    // Get pending actions
    const pendingActions = await client.query(`
      SELECT COUNT(*) as count
      FROM Actions 
      WHERE status IN ('Pending', 'In Progress')
    `);
    
    // Generate insights
    const insights = [];
    const incidents = recentIncidents.rows;
    
    // High priority alerts
    const highPriorityCount = incidents.filter(i => i.priority === 'High').length;
    if (highPriorityCount > 0) {
      insights.push({
        type: 'alert',
        priority: 'high',
        message: `${highPriorityCount} hoge prioriteit incidenten in de afgelopen 7 dagen`,
        actionRequired: true
      });
    }
    
    // Trend analysis
    const todayIncidents = incidents.filter(i => {
      const today = new Date().toDateString();
      return new Date(i.created_at).toDateString() === today;
    }).length;
    
    if (todayIncidents > 3) {
      insights.push({
        type: 'trend',
        priority: 'medium',
        message: `Verhoogde incident activiteit vandaag: ${todayIncidents} nieuwe incidenten`,
        actionRequired: false
      });
    }
    
    // Pending actions alert
    const pendingCount = parseInt(pendingActions.rows[0].count);
    if (pendingCount > 10) {
      insights.push({
        type: 'workflow',
        priority: 'medium',
        message: `${pendingCount} openstaande acties vereisen aandacht`,
        actionRequired: true
      });
    }
    
    // Location hotspot detection
    const locationCounts = incidents.reduce((acc, incident) => {
      const location = incident.location_name || 'Onbekend';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});
    
    const hotspotLocation = Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (hotspotLocation && hotspotLocation[1] > 2) {
      insights.push({
        type: 'location',
        priority: 'low',
        message: `Verhoogde activiteit bij ${hotspotLocation[0]}: ${hotspotLocation[1]} incidenten`,
        actionRequired: false
      });
    }
    
    return insights;
    
  } finally {
    client.release();
  }
};

// Test AI functionality
const testAI = async (req, res) => {
  try {
    const testData = {
      message: 'AI module is operational',
      timestamp: new Date().toISOString(),
      config: {
        provider: require('../ai/config').provider,
        features: Object.keys(require('../ai/config').features)
      }
    };
    
    res.json({
      success: true,
      data: testData
    });
    
  } catch (err) {
    console.error('AI test error:', err);
    res.status(500).json({ 
      success: false,
      message: 'AI test failed',
      error: err.message 
    });
  }
};

module.exports = {
  generateMonthlySummary,
  getAISummaries,
  getAISummaryByMonth,
  getAIInsights,
  testAI,
  servePDF,
  forceRefreshAIInsights,
  getAIInsightsCacheStatus
}; 