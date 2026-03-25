# Queue Management Backend

This repository contains the backend code for the Queue Management System.

### 📋 What is this repository for?

- Manages queue-based appointments or services
- Backend API services, job schedulers, and cron jobs
- Version: 1.0.0

### ⚙️ How do I get set up?




#### Install dependencies
npm install

#### Environment setup
Create a `.env` file in the root and configure your environment variables.

#### Database configuration
Ensure your database is up and running. Configure the connection in `.env`.

#### Build (if needed)
If you're using TypeScript or a build step:

npm run build

### 🚀 How to run the backend

#### Run in dev mode

npm start

This uses `nodemon` for auto-restart on file changes.

#### Run with PM2 (recommended for production)
Start the app:

pm2 start server.js --name queue-backend


Stop the app:

pm2 stop queue-backend


Restart the app:

pm2 restart queue-backend


Delete the app from PM2:

pm2 delete queue-backend

View logs:

pm2 logs queue-backend

Flush (clear) logs:

pm2 flush

Save PM2 process list:

pm2 save

Enable startup on reboot:

pm2 startup

### ✅ Deployment instructions

1. Pull latest changes:

   git pull origin main

2. Install/update dependencies:

   npm install

3. Restart the server:

   pm2 restart queue-backend


### 🤝 Contribution guidelines

- Follow consistent code formatting (ESLint / Prettier)
- Write meaningful commit messages
- Submit pull requests for all changes
- Include tests where appropriate
- Code review required before merging

### 📬 Who do I talk to?

- Repo owner or admin
- DevOps / Backend team