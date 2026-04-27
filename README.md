# 🛡️ CAS Service Portal

**Security Asset Coordinator Portal voor Luchthavenbeveiligingsassets**

Een volledig digitaal platform voor het beheren van incidenten, acties en rapportages voor luchthavenbeveiligingsassets, met geavanceerde AI-integratie voor inzichten en automatisering.

## 🚀 Features

### ✅ Core Functionaliteiten
- **📋 Incident Management:** Volledige workflow voor incidenten aanmaken, bewerken en volgen
- **⚡ Action Coordination:** Acties aanmaken, toewijzen, oppakken en voltooien  
- **👥 Service Party Coordination:** Multi-user actie toewijzing en samenwerking
- **📊 Real-time Dashboard:** Live overzicht van incidenten en acties met KPI's
- **🔍 Archive & Search:** Uitgebreide filtering en zoekfunctionaliteit
- **📄 PDF Rapportage:** Automatische dagelijkse rapportage generatie

### 🤖 AI Module (NIEUW!)
- **🧠 AI Insights:** Real-time AI-gegenereerde inzichten voor dashboard
- **📈 Trend Analysis:** Automatische patroonherkenning in incident data
- **📝 Monthly Reports:** AI-gegenereerde maandelijkse samenvattingen
- **🔮 Predictive Analytics:** Basis voorspellingen voor asset beheer
- **🌍 Nederlandse AI:** Ollama integratie voor lokale Nederlandse tekstgeneratie

### 📊 KPI Dashboard
- **📈 Real-time Metrics:** Live KPI updates met auto-refresh (5 min)
- **🎯 Performance Indicators:** Voltooiingspercentages en oplostijden
- **📍 Location Analytics:** Prestatie-indicatoren per locatie
- **📋 Category Analysis:** Incident analyse per categorie met trends
- **⏱️ SLA Monitoring:** Service Level Agreement naleving tracking
- **🔄 Period Filtering:** Week/Maand/Kwartaal filteropties

### 🔐 Authenticatie & Autorisatie
- **🔑 Role-based Access:** SAC, Admin, Dashboard Viewer rollen
- **🛡️ JWT Security:** Moderne token-based authenticatie
- **👤 User Management:** Complete gebruikersbeheer functionaliteit
- **🔒 Protected Routes:** Beveiligde toegang tot alle modules

## 🏗️ Tech Stack

### Backend
- **Framework:** Node.js + Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT Tokens
- **File Upload:** Multer middleware
- **PDF Generation:** Puppeteer
- **🤖 AI Integration:** Ollama + Custom AI services

### Frontend  
- **Framework:** React 19.1.0 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** React Context (AuthContext)
- **Build Tool:** Create React App
- **UI Components:** Modern, responsive design

### Database Schema
- **Users & Roles:** Multi-role gebruikersbeheer
- **Incidents:** Hoofdentiteit met categorieën en locaties
- **Actions:** Gekoppelde acties met status tracking
- **Attachments:** File upload ondersteuning
- **🤖 AI_Reports:** AI-gegenereerde rapporten en analyses

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 of hoger)
- PostgreSQL (v12 of hoger)
- npm of yarn package manager

### 1. Clone Repository
\`\`\`bash
git clone <repository-url>
cd CAS_Service_Portal
\`\`\`

### 2. Backend Setup
\`\`\`bash
cd backend
npm install

# Database setup
node scripts/setupDatabase.js
node scripts/createTestUsers.js
node scripts/createTestData.js

# Start backend server
npm start
\`\`\`

### 3. Frontend Setup
\`\`\`bash
cd frontend
npm install

# Start development server
npm start
\`\`\`

### 4. 🤖 AI Setup (Optioneel)
\`\`\`bash
# Installeer Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download model (snel en betrouwbaar op VPS)
ollama pull llama3.2:3b

# Configureer AI in backend/ai/config.js
\`\`\`

### 5. 🌍 Production Deploy (VPS)
\`\`\`bash
# Maak backend env bestand
cd backend
cp .env.example .env
# vul DB_PASSWORD en JWT_SECRET in

# Deploy frontend + backend + service restart
cd ..
./scripts/deploy-production.sh
\`\`\`

Standaard deploy paden/services:
- Frontend: \`/var/www/html/sac\`
- Backend: \`/var/www/cas-api\`
- Backend service: \`cas-service-portal.service\`
- Web service: \`apache2\`

Template bestanden:
- \`deploy/apache-sac.conf.example\`
- \`deploy/cas-service-portal.service.example\`

## 🎮 Usage

### Test Accounts
\`\`\`
📧 sac@test.com (SAC role) - Password: test123
📧 admin@test.com (Admin role) - Password: test123  
📧 viewer@test.com (Dashboard Viewer role) - Password: test123
\`\`\`

### Default URLs
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Database:** PostgreSQL op standaard poort 5432

## 📊 API Endpoints

### Authentication
- \`POST /api/auth/login\` - User login
- \`POST /api/auth/register\` - User registration
- \`GET /api/auth/profile\` - User profile

### Incidents
- \`GET /api/incidents/stats\` - Incident statistieken
- \`GET /api/incidents/archive\` - Incident archief met filtering
- \`POST /api/incidents/\` - Nieuw incident aanmaken
- \`PUT /api/incidents/:id\` - Incident bijwerken

### Actions
- \`GET /api/actions/stats\` - Actie statistieken
- \`POST /api/actions/\` - Nieuwe actie aanmaken
- \`PUT /api/actions/:id/take\` - Actie oppakken
- \`PUT /api/actions/:id/status\` - Status bijwerken

### 🤖 AI Endpoints
- \`GET /api/ai/insights\` - Real-time AI insights
- \`GET /api/ai/summaries\` - AI rapporten lijst
- \`POST /api/ai/summaries/generate\` - Genereer nieuw AI rapport

## 🔧 Configuration

### Environment Variables
\`\`\`env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cas_portal
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret

# 🤖 AI Configuration
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
\`\`\`

## 📈 Development Status

### ✅ Volledig Geïmplementeerd (Production Ready)
- Complete incident management workflow
- Action coordination systeem
- KPI Dashboard met real-time metrics
- Role-based authentication
- File upload/download functionaliteit
- PDF rapportage systeem
- 🤖 AI foundation met Ollama integratie
- Modern responsive UI/UX

### 🚧 In Ontwikkeling
- Geavanceerde AI analytics en voorspellingen
- Real-time notifications systeem
- Email notification integratie
- Advanced charts en visualisaties

## 🤝 Contributing

1. Fork het project
2. Maak een feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit je changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push naar de branch (\`git push origin feature/AmazingFeature\`)
5. Open een Pull Request

## 📄 License

Dit project is ontwikkeld voor interne gebruik binnen de luchthavenbeveiligingsorganisatie.

## �� Support

Voor vragen of ondersteuning, neem contact op met het development team.

---

**🎯 Status:** Production Ready + 🤖 AI Foundation Complete  
**📅 Laatste Update:** Juni 2025  
**🔄 Versie:** 1.0.0 met AI Integration
