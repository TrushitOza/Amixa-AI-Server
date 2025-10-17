# Amixa AI Server

A robust Node.js backend server for AI-powered applications built with Express.js and MongoDB.

## Features

- 🚀 Express.js server with comprehensive middleware
- 🗄️ MongoDB database connectivity with Mongoose
- 🔐 Security features (Helmet, CORS, Rate Limiting)
- 📝 Request logging with Morgan
- 🔄 Environment-based configuration
- ⚡ Compression and performance optimizations
- 🛡️ Error handling and graceful shutdowns
- 📚 API documentation endpoints

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd d:\Projects\Amixa-AI-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env` if needed
   - Update MongoDB URI and other settings in `.env`

4. **Start MongoDB:**
   - Make sure MongoDB is running locally or update `MONGODB_URI` for cloud instance

5. **Run the server:**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

- **GET /** - Welcome message and API info
- **GET /health** - Health check endpoint
- **GET /api/v1/docs** - API documentation

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/amixa-ai-db` |
| `JWT_SECRET` | JWT signing secret | Required |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

## Project Structure

```
amixa-ai-server/
├── config/
│   └── db.js              # Database connection
├── controllers/           # Route controllers (empty - ready for your code)
├── middleware/           # Custom middleware (empty - ready for your code)
├── models/              # Mongoose models (empty - ready for your code)
├── routes/              # API routes (empty - ready for your code)
├── .env                 # Environment variables
├── .env.example         # Environment template
├── package.json         # Dependencies and scripts
├── server.js           # Main server file
└── README.md           # This file
```

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (Jest)
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Next Steps

1. **Create Models:** Add Mongoose schemas in `models/` directory
2. **Add Routes:** Create API routes in `routes/` directory
3. **Add Controllers:** Implement business logic in `controllers/` directory
4. **Add Middleware:** Create custom middleware in `middleware/` directory

## Security Features

- **Helmet:** Security headers
- **CORS:** Cross-origin resource sharing
- **Rate Limiting:** API request limiting
- **Input Validation:** Express-validator ready
- **JWT Authentication:** Token-based auth ready

## Error Handling

- Global error handler for unhandled errors
- Graceful shutdown on process termination
- Database connection error handling
- 404 handler for unknown routes

## License

MIT License - see LICENSE file for details.
