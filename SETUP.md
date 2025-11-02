# Slatko Confectionery Management - Setup Guide

## 🚀 Getting Started with Backend & Database

### Prerequisites

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
3. **Git** (for version control)

### 1. Database Setup (PostgreSQL)

#### Option A: Local PostgreSQL Installation
1. Install PostgreSQL from the official website
2. During installation, note down your password for the `postgres` user
3. Open pgAdmin or connect via command line:
   ```bash
   psql -U postgres
   ```
4. Create the database:
   ```sql
   CREATE DATABASE slatko_db;
   ```

#### Option B: Docker (Alternative)
```bash
docker run --name slatko-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=slatko_db -p 5432:5432 -d postgres:15
```

### 2. Backend API Setup

1. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment:**
   - Copy `.env.example` to `.env`
   - Update database credentials in `.env`:
     ```
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=slatko_db
     DB_USER=postgres
     DB_PASSWORD=your_actual_password
     ```

3. **Initialize Database:**
   ```bash
   npm run init-db
   ```
   This will create all tables and insert a default admin user:
   - Username: `admin`
   - Password: `admin123`

4. **Start Backend Server:**
   ```bash
   npm run dev
   ```
   The API will be available at: `http://localhost:5000`

### 3. Frontend Integration

The frontend needs to be updated to use the API instead of localStorage. Here's what we'll implement:

#### API Service Layer
- Replace current `api.ts` with HTTP requests
- Add authentication headers
- Implement offline support with caching
- Error handling and retry logic

#### Authentication
- Login/logout functionality
- JWT token management
- Role-based access control
- Session persistence

#### Mobile-First Features
- Offline data caching
- Background sync when connection returns
- Progressive Web App capabilities
- Push notifications for alerts

### 4. Production Deployment Options

#### Backend Hosting:
- **Railway**: Easy PostgreSQL + Node.js hosting
- **Render**: Free tier available with PostgreSQL
- **Heroku**: Classic choice (PostgreSQL add-on)
- **DigitalOcean App Platform**: Scalable option

#### Frontend Hosting:
- **Vercel**: Optimized for React apps
- **Netlify**: Great PWA support
- **GitHub Pages**: Free static hosting
- **Firebase Hosting**: Google's platform

### 5. Mobile App Features

Once deployed, your phone app will have:

✅ **Offline-First**: Works without internet, syncs when connected
✅ **Native-like**: Install as PWA on phone home screen  
✅ **Real-time**: Live updates across devices
✅ **Secure**: JWT authentication with role-based access
✅ **Fast**: Optimized for mobile networks and performance

### 6. Next Steps

1. **Test the backend API** - Use the health check endpoint
2. **Update frontend** - Replace localStorage with API calls
3. **Add authentication** - Login screen and token management
4. **Enable PWA features** - Service worker and offline support
5. **Deploy to production** - Choose hosting providers

### API Endpoints Overview

- `POST /api/auth/login` - User authentication
- `GET /api/products` - List all products
- `POST /api/deliveries` - Create new delivery (mobile optimized)
- `PATCH /api/production/:id/status` - Update production status
- `GET /api/sync/changes` - Get updates for offline sync

### Mobile Workflow Examples

**📱 Quick Delivery (3 taps):**
1. Tap FAB → "New Delivery"
2. Select client → Add products with preset quantities
3. Tap "Create" → Order submitted and inventory updated

**🏭 Production Update (2 taps):**
1. Tap batch card → "Start Production" 
2. Confirm → Status updated, materials reserved

**💰 Payment Collection (2 taps):**
1. Tap delivery → "Collect Payment"
2. Enter amount → Payment recorded, balance updated

---

Ready to transform your bakery operations with mobile-first technology! 🎉