const { pool } = require('../config/db');
const OllamaService = require('../ai/services/ollamaService');

const ollamaService = new OllamaService();

// Get all articles
const getArticles = async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        id,
        title,
        content,
        role,
        author_id,
        author_name,
        created_at,
        updated_at
      FROM KnowledgeBaseArticles
      ORDER BY created_at DESC
    `);
    
    client.release();
    
    res.json({
      success: true,
      data: {
        articles: result.rows
      }
    });
    
  } catch (err) {
    console.error('Error fetching articles:', err);
    res.status(500).json({
      success: false,
      message: 'Fout bij ophalen van artikelen',
      error: err.message
    });
  }
};

// Create new article
const createArticle = async (req, res) => {
  try {
    const { title, content, role } = req.body;
    const userId = req.user.userId;
    
    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Titel en inhoud zijn verplicht'
      });
    }
    
    // Get user info
    const client = await pool.connect();
    const userResult = await client.query(
      'SELECT username FROM Users WHERE id = $1',
      [userId]
    );
    
    const authorName = userResult.rows[0]?.username || 'SAC Medewerker';
    
    // Insert article
    const result = await client.query(`
      INSERT INTO KnowledgeBaseArticles (title, content, role, author_id, author_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [title, content, role || 'Algemeen', userId, authorName]);
    
    client.release();
    
    res.json({
      success: true,
      message: 'Artikel succesvol toegevoegd',
      data: {
        article: result.rows[0]
      }
    });
    
  } catch (err) {
    console.error('Error creating article:', err);
    res.status(500).json({
      success: false,
      message: 'Fout bij aanmaken van artikel',
      error: err.message
    });
  }
};

// Ask the Oracle (AI-powered Q&A)
const askOracle = async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vraag is verplicht'
      });
    }
    
    // Get all articles for context
    const client = await pool.connect();
    const articlesResult = await client.query(`
      SELECT id, title, content, role
      FROM KnowledgeBaseArticles
      ORDER BY created_at DESC
    `);
    client.release();
    
    const articles = articlesResult.rows;
    
    if (articles.length === 0) {
      return res.json({
        success: true,
        data: {
          answer: "Er zijn nog geen artikelen in de kennisbank. Voeg eerst artikelen toe voordat je vragen kunt stellen aan het Orakel.",
          articlesUsed: 0
        }
      });
    }
    
    // Prepare knowledge context with article IDs for reference
    const context = articles.map((a, index) => 
      `ARTIKEL ${index + 1} - ID: ${a.id}\nTITEL: ${a.title}\nROL: ${a.role}\nINHOUD: ${a.content}`
    ).join('\n\n---\n\n');
    
    // Build article list for reference
    const articleList = articles.map((a, index) => 
      `${index + 1}. "${a.title}" (ID: ${a.id}, Rol: ${a.role})`
    ).join('\n');
    
    // Build system prompt with strict anti-hallucination rules
    const systemPrompt = `Je bent het 'SAC Orakel' voor Schiphol Airport luchthaven beveiliging.

═══════════════════════════════════════════════════════════════
KRITIEKE REGELS - VERPLICHT TE VOLGEN:
═══════════════════════════════════════════════════════════════

1. JE HEBT ALLEEN TOEGANG TOT DEZE ARTIKELEN - ER ZIJN GEEN ANDERE:
${articleList}

2. HALLUCINEER NIET:
   - Verzin GEEN artikelen die niet in bovenstaande lijst staan
   - Verzin GEEN organisaties (zoals Rijkswaterstaat, gemeentes, etc.)
   - Verzin GEEN informatie over treinen, stadscentra, voetgangers, fietsers
   - Gebruik ALLEEN informatie uit de onderstaande artikelen

3. ALS INFORMATIE NIET BESCHIKBAAR IS:
   Zeg EXACT: "Ik kan deze vraag niet beantwoorden op basis van de beschikbare artikelen in de kennisbank. Overweeg om een nieuw artikel toe te voegen met deze informatie."

4. CONTEXT:
   - Schiphol Airport luchthaven beveiliging
   - Beveiligingssystemen, passagiersprocessen, bagage handling
   - GEEN informatie over andere onderwerpen

═══════════════════════════════════════════════════════════════
ARTIKELEN INHOUD:
═══════════════════════════════════════════════════════════════

${context}

═══════════════════════════════════════════════════════════════
INSTRUCTIES:
═══════════════════════════════════════════════════════════════

1. Gebruik UITSLUITEND informatie uit bovenstaande artikelen
2. Vermeld de exacte artikel titel als je een artikel gebruikt: "Volgens het artikel '[EXACTE TITEL]'..."
3. Als informatie niet beschikbaar is, zeg dat expliciet
4. Antwoord in het Nederlands
5. Gebruik **bold** voor belangrijke termen
6. HALLUCINEER NIET - alleen informatie uit bovenstaande artikelen`;

    // Generate AI response using Ollama
    try {
      const fullPrompt = `${systemPrompt}\n\nGebruikersvraag: ${question}\n\nAntwoord:`;
      
      const aiResponse = await ollamaService.generateText(fullPrompt, {
        temperature: 0.3, // Lower temperature for more factual, less creative responses
        maxTokens: 800
      });
      
      // Post-process: Check if response mentions non-existent articles and clean it up
      let cleanedResponse = aiResponse.trim();
      const articleTitles = articles.map(a => a.title.toLowerCase());
      
      // Check for common hallucination patterns
      const hallucinationPatterns = [
        /rijkswaterstaat/i,
        /wegverkeer/i,
        /voetgangers/i,
        /fietsers/i,
        /stadscentrum/i,
        /stad/i
      ];
      
      // If response contains hallucination patterns and doesn't match any real articles, replace with safe message
      const hasHallucination = hallucinationPatterns.some(pattern => pattern.test(cleanedResponse)) &&
        !articleTitles.some(title => cleanedResponse.toLowerCase().includes(title));
      
      if (hasHallucination) {
        console.warn('⚠️ AI hallucination detected, replacing response');
        cleanedResponse = "Ik kan deze vraag niet beantwoorden op basis van de beschikbare artikelen in de kennisbank. Overweeg om een nieuw artikel toe te voegen met deze informatie.";
      }
      
      // Find the most relevant article(s) that were actually used in the answer
      // Check which article titles/content appear in the AI response
      const aiResponseLower = cleanedResponse.toLowerCase();
      
      // First, check if any article titles are explicitly mentioned in the response
      const mentionedArticles = articles.filter(article => {
        const titleLower = article.title.toLowerCase();
        // Check if the full title or significant parts appear in the response
        return aiResponseLower.includes(titleLower) || 
               titleLower.split(' ').some(word => word.length > 4 && aiResponseLower.includes(word));
      });
      
      // Score articles by relevance (how much they match the question and appear in answer)
      const scoredArticles = articles.map(article => {
        const articleText = `${article.title} ${article.content}`.toLowerCase();
        const questionLower = question.toLowerCase();
        const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3);
        
        let score = 0;
        
        // High priority: article title appears in AI response (most reliable indicator)
        if (aiResponseLower.includes(article.title.toLowerCase())) {
          score += 20;
        }
        
        // Check if article was explicitly mentioned
        if (mentionedArticles.some(a => a.id === article.id)) {
          score += 15;
        }
        
        // Check if key words from question match article
        questionWords.forEach(word => {
          if (articleText.includes(word)) {
            score += 2;
          }
        });
        
        // Check if question keywords appear in article title (high relevance)
        if (questionWords.some(word => article.title.toLowerCase().includes(word))) {
          score += 5;
        }
        
        // Check if full question appears in article
        if (articleText.includes(questionLower)) {
          score += 8;
        }
        
        return { article, score };
      });
      
      // Sort by score and get top 3 most relevant
      const topArticles = scoredArticles
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.article);
      
      // If articles were mentioned in response, prioritize those
      const relevantArticles = mentionedArticles.length > 0 
        ? mentionedArticles.slice(0, 3)
        : topArticles.length > 0 
          ? topArticles
          : articles.filter(article => {
              const articleText = `${article.title} ${article.content}`.toLowerCase();
              const questionLower = question.toLowerCase();
              const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3);
              return questionWords.some(word => articleText.includes(word)) ||
                     articleText.includes(questionLower);
            }).slice(0, 3);
      
      res.json({
        success: true,
        data: {
          answer: cleanedResponse,
          articlesUsed: articles.length,
          relevantArticles: relevantArticles.map(a => ({
            id: a.id,
            title: a.title,
            role: a.role,
            content: a.content.substring(0, 200) + '...' // Preview
          })),
          question: question
        }
      });
      
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      
      // Fallback: simple keyword matching
      const lowerQuestion = question.toLowerCase();
      const relevantArticles = articles.filter(article => {
        const searchText = `${article.title} ${article.content}`.toLowerCase();
        return searchText.includes(lowerQuestion) || 
               lowerQuestion.split(' ').some(word => searchText.includes(word));
      });
      
      if (relevantArticles.length > 0) {
        const answer = `Gebaseerd op de kennisbank, hier is relevante informatie:\n\n${relevantArticles.map(a => `**${a.title}** (${a.role}):\n${a.content.substring(0, 200)}...`).join('\n\n')}`;
        
        res.json({
          success: true,
          data: {
            answer: answer,
            articlesUsed: relevantArticles.length,
            relevantArticles: relevantArticles.map(a => ({
              id: a.id,
              title: a.title,
              role: a.role,
              content: a.content.substring(0, 200) + '...'
            })),
            question: question,
            fallback: true
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            answer: "Ik kan deze vraag niet beantwoorden op basis van de huidige kennisbank. Overweeg om een nieuw artikel toe te voegen met deze informatie.",
            articlesUsed: 0,
            relevantArticles: [],
            question: question,
            fallback: true
          }
        });
      }
    }
    
  } catch (err) {
    console.error('Error asking oracle:', err);
    res.status(500).json({
      success: false,
      message: 'Fout bij raadplegen van het Orakel',
      error: err.message
    });
  }
};

module.exports = {
  getArticles,
  createArticle,
  askOracle
};
