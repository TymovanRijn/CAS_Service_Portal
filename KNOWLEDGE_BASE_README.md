# 📚 Kennisbank - Knowledge Base Feature

## Overzicht

De Kennisbank is een geavanceerde functionaliteit binnen het CAS Service Portal die SAC'ers en administrators in staat stelt om waardevolle security kennis te delen, organiseren en doorzoeken met behulp van AI-ondersteuning.

## ✨ Hoofdfuncties

### 🔍 Intelligente Zoekfunctionaliteit
- **AI-powered search**: Zoek op betekenis, niet alleen op exacte tekst
- **Multi-filter opties**: Filter op categorie, tags, auteur
- **Real-time suggesties**: Krijg instant resultaten tijdens het typen
- **Relevantie ranking**: AI sorteert resultaten op relevantie

### ✍️ Content Management
- **Rich text editor**: Schrijf gestructureerde artikelen met markdown ondersteuning
- **Afbeelding upload**: Voeg visuele ondersteuning toe aan je artikelen
- **Automatische AI verbetering**: Spelling en grammatica worden automatisch gecorrigeerd
- **Tag suggesties**: AI stelt relevante tags voor op basis van content

### 🤖 AI Assistent
- **Vraag & Antwoord**: Stel vragen aan de AI over de kennisbank content
- **Contextuelle antwoorden**: AI gebruikt alle beschikbare kennis voor accurate antwoorden
- **Bron referenties**: Zie direct welke artikelen als bron zijn gebruikt
- **Intelligente suggesties**: Krijg gerelateerde artikelen voorgesteld

### 📊 Analytics & Insights
- **View tracking**: Zie welke artikelen het meest bekeken worden
- **Populaire tags**: Ontdek trending onderwerpen
- **Categorie overzicht**: Krijg inzicht in kennisgebieden
- **Usage statistics**: Monitor kennisbank gebruik

## 🚀 Aan de Slag

### Toegang
Alleen gebruikers met de rol **SAC** of **Admin** hebben toegang tot de Kennisbank.

### Je Eerste Artikel Toevoegen

1. **Navigeer naar Kennisbank**
   - Klik op "Kennisbank" in het navigatiemenu

2. **Nieuw Artikel Maken**
   - Klik op "Nieuw Artikel" (+ knop)
   - Vul de vereiste velden in:
     - **Titel**: Geef je artikel een duidelijke, beschrijvende titel
     - **Categorie**: Kies de juiste categorie (Security, Network, etc.)
     - **Content**: Schrijf je artikel in het tekstveld
     - **Afbeelding**: (Optioneel) Upload een ondersteunende afbeelding
     - **Tags**: Voeg relevante tags toe of kies uit suggesties

3. **AI Verbetering**
   - De AI verbetert automatisch spelling en grammatica
   - Relevante tags worden voorgesteld
   - Een samenvatting wordt gegenereerd

4. **Publiceren**
   - Klik "Artikel Toevoegen" om te publiceren

### Zoeken in de Kennisbank

#### Basis Zoeken
- Typ je zoekterm in de zoekbalk
- Resultaten worden real-time gefilterd

#### Geavanceerd Filteren
- **Categorie filter**: Selecteer specifieke categorieën
- **Tag filter**: Klik op populaire tags om te filteren
- **Combineer filters**: Gebruik meerdere filters tegelijk

#### AI Zoeken
- Klik op "AI Assistent" voor intelligente zoekopdrachten
- Stel vragen in natuurlijke taal
- Bijvoorbeeld: "Hoe configureer ik een firewall voor maximale beveiliging?"

## 🛠️ Technische Implementatie

### Backend Architectuur

#### Database Schema
```sql
CREATE TABLE knowledge_base (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_path VARCHAR(500),
  tags JSONB DEFAULT '[]',
  category VARCHAR(100),
  author_id INTEGER REFERENCES users(id),
  ai_processed BOOLEAN DEFAULT FALSE,
  ai_summary TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### API Endpoints
```
GET    /api/knowledge-base           # Lijst alle artikelen
GET    /api/knowledge-base/:id       # Specifiek artikel
POST   /api/knowledge-base           # Nieuw artikel
PUT    /api/knowledge-base/:id       # Update artikel
DELETE /api/knowledge-base/:id       # Verwijder artikel
POST   /api/knowledge-base/search    # AI-powered zoeken
POST   /api/knowledge-base/ask       # AI vraag & antwoord
GET    /api/knowledge-base/meta/tags # Populaire tags
GET    /api/knowledge-base/meta/categories # Categorieën
```

#### AI Services
- **Content Processing**: Verbetert spelling en grammatica
- **Tag Generation**: Genereert relevante tags automatisch
- **Intelligent Search**: Zoekt op betekenis en context
- **Question Answering**: Beantwoordt vragen op basis van kennisbank

### Frontend Componenten

#### Hoofdcomponent: `KnowledgeBase.tsx`
- Modern, responsive design met Tailwind CSS
- Real-time zoeken en filteren
- Modal-based content creation en viewing
- AI chat interface

#### Styling Features
- **Gradient backgrounds**: Moderne visuele appeal
- **Glassmorphism effects**: Subtiele transparantie effecten
- **Smooth animations**: Vloeiende overgangen en hover effecten
- **Mobile-first design**: Volledig responsive op alle devices

## 📋 Gebruik Cases

### Voor SAC'ers
- **Incident Procedures**: Documenteer standaard response procedures
- **Security Best Practices**: Deel bewezen security technieken
- **Troubleshooting Guides**: Maak stap-voor-stap oplossingen
- **Tool Documentatie**: Leg uit hoe security tools gebruikt worden

### Voor Teams
- **Knowledge Sharing**: Deel expertise tussen teamleden
- **Onboarding**: Help nieuwe teamleden snel op te starten
- **Standardisatie**: Zorg voor consistente procedures
- **Continuous Learning**: Blijf op de hoogte van nieuwe ontwikkelingen

## 🔧 Configuratie

### Environment Variables
```bash
# AI Service Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# File Upload Settings
MAX_FILE_SIZE=5242880  # 5MB
ALLOWED_FILE_TYPES=jpeg,jpg,png,gif,webp
```

### Database Setup
```bash
# Maak de knowledge base tabel aan
node scripts/setupKnowledgeBase.js

# Voeg test data toe (optioneel)
node scripts/addTestKnowledgeBase.js
```

## 🚨 Security Overwegingen

### Toegangscontrole
- Alleen SAC en Admin rollen hebben toegang
- Gebruikers kunnen alleen eigen artikelen bewerken
- Admins hebben volledige controle

### Content Validatie
- File upload restricties (type en grootte)
- Input sanitization voor XSS preventie
- SQL injection preventie via parameterized queries

### AI Privacy
- Content wordt lokaal verwerkt (Ollama)
- Geen data wordt naar externe AI services gestuurd
- Gebruiker data blijft binnen je infrastructuur

## 📈 Monitoring & Analytics

### Performance Metrics
- Response times voor zoekacties
- AI processing times
- Database query performance
- File upload success rates

### Usage Analytics
- Meest bekeken artikelen
- Populaire zoektermen
- Actieve gebruikers
- Content growth trends

## 🔄 Toekomstige Uitbreidingen

### Geplande Features
- **Version Control**: Bijhouden van artikel wijzigingen
- **Collaborative Editing**: Meerdere auteurs per artikel
- **Advanced Analytics**: Diepere inzichten in usage patterns
- **Integration**: Koppeling met externe knowledge bases
- **Mobile App**: Native mobile applicatie
- **Bulk Import**: Importeer bestaande documentatie

### AI Verbeteringen
- **Multi-language Support**: Ondersteuning voor meerdere talen
- **Advanced NLP**: Betere content analyse en suggesties
- **Automated Categorization**: Automatische categorie toewijzing
- **Sentiment Analysis**: Analyse van content sentiment

## 🆘 Troubleshooting

### Veelvoorkomende Problemen

#### "Toegang geweigerd" Error
- **Oorzaak**: Gebruiker heeft niet de juiste rol
- **Oplossing**: Zorg dat gebruiker SAC of Admin rol heeft

#### AI Functies Werken Niet
- **Oorzaak**: Ollama service is niet beschikbaar
- **Oplossing**: Check of Ollama draait op de juiste poort

#### Upload Fails
- **Oorzaak**: Bestand te groot of verkeerd type
- **Oplossing**: Check bestandsgrootte (<5MB) en type (images only)

#### Zoeken Geeft Geen Resultaten
- **Oorzaak**: Database connectie problemen
- **Oplossing**: Check database connectie en indexen

### Debug Commands
```bash
# Check database connectie
node -e "require('./config/db').pool.query('SELECT NOW()')"

# Test AI service
curl http://localhost:11434/api/version

# Check file permissions
ls -la uploads/knowledge-base/
```

## 📞 Support

Voor vragen of problemen met de Kennisbank functionaliteit:

1. **Check deze documentatie** voor veelvoorkomende oplossingen
2. **Review de logs** in de browser console en server logs
3. **Test de API endpoints** direct met tools zoals Postman
4. **Contact de development team** voor technische ondersteuning

---

**Gemaakt met ❤️ voor het CAS Service Portal**

*Versie 1.0 - Januari 2025* 