const { pool } = require('../../config/db');
const OllamaService = require('./ollamaService');
const ollamaService = new OllamaService();

// Process content with AI for cleanup and enhancement
const processContentWithAI = async (content) => {
  try {
    const prompt = `
Je bent een AI assistent die helpt bij het opschonen en verbeteren van kennisbank content voor Security Officers.

Taak: Verbeter de volgende tekst door:
1. Spelfouten te corrigeren
2. Grammatica te verbeteren
3. De tekst helderder en professioneler te maken
4. De structuur te verbeteren waar nodig
5. Behoud de originele betekenis en technische termen

Originele tekst:
${content}

Geef alleen de verbeterde tekst terug, geen uitleg of commentaar.
    `;

    const improvedContent = await ollamaService.generateText(prompt);
    return improvedContent || content; // Fallback to original if AI fails
  } catch (error) {
    console.error('Error processing content with AI:', error);
    return content; // Return original content if AI processing fails
  }
};

// Generate relevant tags for content
const generateTags = async (content, category) => {
  try {
    const prompt = `
Je bent een AI assistent die helpt bij het genereren van relevante tags voor kennisbank artikelen in een Security Asset Center.

Analyseer de volgende tekst en genereer 3-8 relevante tags in het Nederlands. Tags moeten:
- Specifiek en nuttig zijn voor zoeken
- Gerelateerd zijn aan security, IT, of asset management
- Kort en bondig zijn (1-3 woorden)
- Geen dubbele betekenissen hebben

Content: ${content}
Categorie: ${category || 'Algemeen'}

Geef alleen de tags terug, gescheiden door komma's, zonder verdere uitleg.
Bijvoorbeeld: firewall, netwerk beveiliging, monitoring, incident response
    `;

    const tagsResponse = await ollamaService.generateText(prompt);
    if (tagsResponse) {
      return tagsResponse.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    
    // Fallback tags based on category
    const fallbackTags = {
      'Security': ['beveiliging', 'security'],
      'Network': ['netwerk', 'infrastructuur'],
      'Incident': ['incident', 'response'],
      'Asset': ['asset', 'beheer'],
      'Monitoring': ['monitoring', 'alerting'],
      'Algemeen': ['tips', 'best practice']
    };
    
    return fallbackTags[category] || fallbackTags['Algemeen'];
  } catch (error) {
    console.error('Error generating tags:', error);
    return ['kennisbank', 'security'];
  }
};

// AI-powered search through knowledge base
const searchKnowledgeBase = async (searchQuery, tenant) => {
  try {
    const { getTenantConnection } = require('../../middleware/tenantMiddleware');
    
    // Use tenant-specific connection
    const client = await getTenantConnection(tenant.schema);
    
    // First, get all knowledge base entries from tenant schema
    const allEntries = await client.query(`
      SELECT kb.*, u.username as author_name, u.email
      FROM knowledge_base kb
      JOIN users u ON kb.author_id = u.id
      ORDER BY kb.created_at DESC
    `);

    client.release();

    if (allEntries.rows.length === 0) {
      return [];
    }

    // Use AI to find the most relevant entries
    const entriesText = allEntries.rows.map(entry => {
      let tags = [];
      try {
        if (typeof entry.tags === 'string') {
          tags = JSON.parse(entry.tags);
        } else if (Array.isArray(entry.tags)) {
          tags = entry.tags;
        }
      } catch (e) {
        console.log('Error parsing tags for entry', entry.id, ':', e.message);
        tags = [];
      }
      return `ID: ${entry.id}\nTitel: ${entry.title}\nContent: ${entry.content.substring(0, 200)}\nTags: ${tags.join(', ')}\nCategorie: ${entry.category || 'Geen'}\n---`;
    }).join('\n');

    const prompt = `
Je bent een AI zoekassistent voor een Security Asset Center kennisbank. 

Zoekquery: "${searchQuery}"

Beschikbare kennisbank artikelen:
${entriesText}

Analyseer welke artikelen het meest relevant zijn voor de zoekquery. Geef de ID's van de meest relevante artikelen terug, gesorteerd op relevantie (meest relevant eerst).
het moet wel echt bij de gestelde vraag passen, en niet meer of minder.
Geef alleen de ID's terug, gescheiden door komma's, bijvoorbeeld: 5,2,8,1
Als geen artikelen relevant zijn, geef dan "geen" terug.
    `;

    const aiResponse = await ollamaService.generateText(prompt);
    
    if (!aiResponse || aiResponse.toLowerCase().includes('geen')) {
      // Fallback to simple text search
      const fallbackResults = await pool.query(`
        SELECT kb.*, u.username as author_name, u.email
        FROM knowledge_base kb
        JOIN users u ON kb.author_id = u.id
        WHERE kb.title ILIKE $1 OR kb.content ILIKE $1 OR kb.ai_summary ILIKE $1
        ORDER BY 
          CASE 
            WHEN kb.title ILIKE $1 THEN 1
            ELSE 2
          END,
          kb.view_count DESC
        LIMIT 10
      `, [`%${searchQuery}%`]);
      
      return fallbackResults.rows;
    }

    // Parse AI response and get the entries in order
    const relevantIds = aiResponse.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    const orderedResults = [];
    
    for (const id of relevantIds) {
      const entry = allEntries.rows.find(entry => entry.id === id);
      if (entry) {
        orderedResults.push(entry);
      }
    }

    return orderedResults.slice(0, 10); // Limit to top 10 results
  } catch (error) {
    console.error('Error in AI search:', error);
    
    try {
      // Fallback to simple database search using tenant connection
      const fallbackClient = await getTenantConnection(tenant.schema);
      const fallbackResults = await fallbackClient.query(`
        SELECT kb.*, u.username as author_name, u.email
        FROM knowledge_base kb
        JOIN users u ON kb.author_id = u.id
        WHERE kb.title ILIKE $1 OR kb.content ILIKE $1
        ORDER BY kb.view_count DESC
        LIMIT 10
      `, [`%${searchQuery}%`]);
      
      fallbackClient.release();
      return fallbackResults.rows;
    } catch (fallbackError) {
      console.error('Error in fallback search:', fallbackError);
      return [];
    }
  }
};

// Generate AI-powered answer to user questions based on knowledge base
const generateKnowledgeBaseAnswer = async (question, tenant) => {
  try {
    console.log('🤖 AI Processing question with FULL knowledge base access:', question);
    
    const { getTenantConnection } = require('../../middleware/tenantMiddleware');
    
    // Use tenant-specific connection
    const client = await getTenantConnection(tenant.schema);
    
    // Step 1: Get ALL articles from tenant knowledge base (let AI decide what's relevant)
    const allArticles = await client.query(`
      SELECT kb.*, u.username as author_name, u.email
      FROM knowledge_base kb
      JOIN users u ON kb.author_id = u.id
      ORDER BY kb.created_at DESC
    `);
    
    client.release();
    
    if (allArticles.rows.length === 0) {
      return {
        answer: "Er zijn nog geen artikelen in de kennisbank. Voeg je eerste artikel toe om de AI chat te kunnen gebruiken!",
        sources: []
      };
    }

    // Step 2: Filter and prioritize most relevant articles
    const questionLower = question.toLowerCase();
    const relevantArticles = allArticles.rows
      .map((entry, index) => ({
        id: entry.id,
        title: entry.title,
        content: entry.content,
        author: entry.author_name,
        category: entry.category || 'Algemeen',
        created: entry.created_at,
        views: entry.view_count || 0,
        relevance: 0
      }))
      .map(article => {
        // Calculate relevance score
        let score = 0;
        const titleLower = article.title.toLowerCase();
        const contentLower = article.content.toLowerCase();
        
        // Exact matches get highest score
        if (titleLower.includes(questionLower) || contentLower.includes(questionLower)) {
          score += 10;
        }
        
        // Partial word matches
        const questionWords = questionLower.split(' ').filter(word => word.length > 2);
        questionWords.forEach(word => {
          if (titleLower.includes(word)) score += 3;
          if (contentLower.includes(word)) score += 1;
        });
        
        // Acronyms and abbreviations
        if (questionLower.length <= 5 && titleLower.includes(questionLower)) {
          score += 8;
        }
        
        article.relevance = score;
        return article;
      })
      .filter(article => article.relevance > 0) // Only include relevant articles
      .sort((a, b) => b.relevance - a.relevance) // Sort by relevance
      .slice(0, 5); // Limit to top 5 most relevant articles
    
    console.log(`📚 Found ${relevantArticles.length} relevant articles for question: "${question}"`);
    if (relevantArticles.length > 0) {
      console.log('🔍 Most relevant articles:');
      relevantArticles.forEach((article, index) => {
        console.log(`  ${index + 1}. [ID: ${article.id}] "${article.title}" (relevance: ${article.relevance})`);
      });
    }
    
    // If no relevant articles found, use all articles
    const fullKnowledgeBase = relevantArticles.length > 0 ? relevantArticles : allArticles.rows.map((entry, index) => ({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      author: entry.author_name,
      category: entry.category || 'Algemeen',
      created: entry.created_at,
      views: entry.view_count || 0
    }));
    
    const enhancedPrompt = `Je bent een kennisbank assistent voor Security Officers. 
Geef een kort, direct antwoord gebaseerd op de artikelen.

VRAAG: "${question}"

KENNISBANK ARTIKELEN:
${fullKnowledgeBase.map((article, index) => 
  `📄 ARTIKEL ${index + 1} [ID: ${article.id}]: "${article.title}"
${article.content}

---`
).join('\n')}

BELANGRIJKE REGELS:
✅ Geef een kort, praktisch antwoord (max 200 woorden)
✅ Gebruik ALLEEN informatie uit artikelen die DIRECT over de vraag gaan
✅ Als er meerdere relevante artikelen zijn, focus op het meest specifieke
✅ Wees direct en to-the-point
✅ Nederlands
❌ COMBINEER GEEN INFORMATIE VAN VERSCHILLENDE ARTIKELEN TENZIJ HET LOGISCH IS
❌ GA NIET AF OP ARTIKELEN DIE NIET DIRECT OVER DE VRAAG GAAN

ANTWOORD:`;

    console.log('🤖 Sending FULL knowledge base to Qwen2.5:3b (smart & fast) for AI processing...');
    const aiResponse = await ollamaService.generateText(enhancedPrompt, {
      model: 'qwen2.5:3b',           // 🚀 Perfect balance: intelligent but MacBook Air friendly
      temperature: 0.1,              // 🎯 Very focused for precise responses
      maxTokens: 250                 // 📝 Shorter, more direct answers
    });
    console.log('✅ Qwen2.5:3b AI response with full knowledge base generated');
    
    // Step 3: Extract referenced article IDs from AI response to provide sources
    const referencedIds = [];
    const idMatches = aiResponse.match(/\[ID:\s*(\d+)\]/g);
    if (idMatches) {
      idMatches.forEach(match => {
        const id = match.match(/\d+/)[0];
        if (!referencedIds.includes(id)) {
          referencedIds.push(id);
        }
      });
    }
    
    // Get full info for referenced articles
    const referencedArticles = fullKnowledgeBase.filter(article => 
      referencedIds.includes(article.id.toString())
    );
    
    return {
      answer: aiResponse.trim(),
      sources: referencedArticles.map(article => ({
        id: article.id,
        title: article.title,
        author: article.author
      }))
    };
    
  } catch (error) {
    console.error('Error in AI knowledge base answer with full access:', error);
    
    // Fallback: still try to give some answer
    return {
      answer: "Er is een fout opgetreden bij het verwerken van je vraag met de volledige kennisbank. Dit kan komen door de grootte van de database. Probeer een meer specifieke vraag of probeer het later opnieuw.",
      sources: []
    };
  }
};

module.exports = {
  processContentWithAI,
  generateTags,
  searchKnowledgeBase,
  generateKnowledgeBaseAnswer
}; 