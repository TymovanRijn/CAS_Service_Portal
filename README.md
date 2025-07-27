# 🛡️ SecureHub - Professional Incident & Action Management Platform

**SecureHub** is a comprehensive incident and action management platform designed for modern organizations. Built with React, Node.js, and PostgreSQL, it provides a complete solution for managing incidents, tracking actions, and maintaining operational excellence.

## 🌟 Key Features

### 📊 **Incident Management**
- **Create & Track Incidents**: Comprehensive incident logging with priority levels, categories, and locations
- **File Attachments**: Support for images and documents
- **Status Tracking**: Real-time incident status updates (Open → In Progress → Resolved)
- **Advanced Search**: Filter incidents by status, priority, date range, and categories

### ⚡ **Action Management**  
- **Action Planning**: Create and assign follow-up actions from incidents
- **Team Collaboration**: Assign actions to specific team members or leave unassigned
- **Progress Tracking**: Monitor action completion with status updates
- **Deadline Management**: Set and track action due dates

### 🧠 **AI-Powered Knowledge Base**
- **Smart Content Storage**: Upload and organize operational knowledge and procedures
- **AI Assistant**: Intelligent question-answering system that understands your knowledge base
- **Content Search**: Semantic search through all stored knowledge
- **Image Support**: Upload and reference visual guides and documentation

### 📈 **Analytics & Reporting**
- **KPI Dashboard**: Real-time key performance indicators
- **Incident Analytics**: Trend analysis and performance metrics
- **Action Statistics**: Team productivity and completion rates
- **AI Insights**: Automated pattern recognition and recommendations

### 👥 **Multi-Role Access Control**
- **Security Officers**: Full operational access to incidents, actions, and knowledge base
- **Administrators**: Complete system management and user administration
- **Dashboard Viewers**: Read-only access to reports and analytics

## 🚀 Technology Stack

### **Frontend**
- **React 19** with TypeScript
- **Tailwind CSS** for modern, responsive UI
- **Custom UI Components** with shadcn/ui
- **Real-time Updates** and responsive design

### **Backend**
- **Node.js** with Express.js
- **PostgreSQL** database with advanced querying
- **JWT Authentication** with role-based access control
- **File Upload** handling with multer

### **AI Integration**
- **Ollama** for local AI processing
- **Semantic Search** capabilities
- **Intelligent Content Processing**
- **Automated Insights Generation**

## 📦 Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v13+)
- Ollama (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SecureHub
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Configure your database and settings in .env
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   cp env.example .env
   # Configure API endpoints in .env
   ```

4. **Initialize Database**
   ```bash
   cd ../backend
   node scripts/setupDatabase.js
   node scripts/createTestUsers.js
   ```

5. **Start the Application**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm start
   
   # Terminal 2 - Frontend  
   cd frontend && npm start
   ```

6. **Access SecureHub**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Test Accounts
- **Security Officer**: security@test.com / test123
- **Administrator**: admin@test.com / test123  
- **Dashboard Viewer**: viewer@test.com / test123

## 💼 Use Cases

### **Corporate Security**
- Incident reporting and response coordination
- Security procedure documentation and training
- Performance monitoring and compliance tracking

### **Facilities Management**
- Equipment failure tracking and maintenance scheduling
- Vendor coordination and service management
- Operational procedure documentation

### **Healthcare Operations**
- Patient safety incident management
- Equipment maintenance and compliance
- Clinical procedure documentation and training

### **Manufacturing & Industrial**
- Safety incident tracking and analysis
- Equipment maintenance and downtime management
- Standard operating procedure management

### **Educational Institutions**
- Campus safety incident management
- Facility maintenance coordination
- Emergency procedure documentation

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=securehub
DB_USER=your_username
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# AI Integration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

# Server
PORT=3001
NODE_ENV=development
```

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:3001
```

## 📚 API Documentation

### **Authentication Endpoints**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification

### **Incident Management**
- `GET /api/incidents` - List incidents with filtering
- `POST /api/incidents` - Create new incident
- `PUT /api/incidents/:id` - Update incident
- `GET /api/incidents/stats` - Incident statistics

### **Action Management**
- `GET /api/actions` - List actions with filtering
- `POST /api/actions` - Create new action
- `PUT /api/actions/:id` - Update action
- `PUT /api/actions/:id/take` - Assign action to current user

### **Knowledge Base**
- `GET /api/knowledge-base` - List knowledge base entries
- `POST /api/knowledge-base` - Create new entry
- `POST /api/knowledge-base/ask` - AI-powered question answering
- `POST /api/knowledge-base/search` - Search knowledge base

### **AI Features**
- `GET /api/ai/insights` - Get AI-generated insights
- `POST /api/ai/insights/refresh` - Force refresh insights

## 🔒 Security Features

- **JWT-based Authentication** with secure token handling
- **Role-based Access Control** with granular permissions
- **Input Validation** and sanitization
- **SQL Injection Protection** with parameterized queries
- **File Upload Security** with type validation
- **CORS Configuration** for secure cross-origin requests

## 📈 Performance & Scalability

- **Optimized Database Queries** with proper indexing
- **Efficient File Handling** with organized storage
- **Responsive UI** with optimized loading states
- **Caching Strategies** for improved performance
- **Background Processing** for AI insights generation

## 🛠️ Development

### **Project Structure**
```
SecureHub/
├── backend/                 # Node.js API server
│   ├── controllers/        # Business logic
│   ├── routes/            # API endpoints
│   ├── middleware/        # Authentication & validation
│   ├── ai/               # AI integration services
│   └── scripts/          # Database setup scripts
├── frontend/              # React application
│   ├── src/components/   # UI components
│   ├── src/contexts/     # React contexts
│   └── src/lib/         # Utility functions
└── docs/                 # Documentation
```

### **Contributing**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support, feature requests, or bug reports:
- Create an issue on GitHub
- Contact the development team
- Check the documentation wiki

---

**SecureHub** - *Professional Incident & Action Management for Modern Organizations*
