const { pool } = require('../config/db');

const setupKnowledgeBase = async () => {
  try {
    // Create knowledge_base table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        image_path VARCHAR(500),
        tags JSONB DEFAULT '[]',
        category VARCHAR(100),
        author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ai_processed BOOLEAN DEFAULT FALSE,
        ai_summary TEXT,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING GIN (tags);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base (category);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_author ON knowledge_base (author_id);
    `);

    // Create updated_at trigger
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
      CREATE TRIGGER update_knowledge_base_updated_at
        BEFORE UPDATE ON knowledge_base
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('Knowledge base table created successfully!');
  } catch (error) {
    console.error('Error setting up knowledge base:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  setupKnowledgeBase()
    .then(() => {
      console.log('Knowledge base setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupKnowledgeBase }; 