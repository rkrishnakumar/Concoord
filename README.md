# Concoord

Sync Autodesk Construction Cloud (ACC) Issues with Procore Coordination Issues.

## Overview

Concoord is a web application that automates the synchronization of issues between Autodesk Construction Cloud and Procore. It provides a seamless integration that keeps your coordination issues in sync across both platforms.

## Features

- **Multi-Tenant Architecture**: Each customer manages their own API credentials
- **Project Mapping**: Map ACC projects to Procore projects
- **Issue Synchronization**: Automatically sync issues from ACC to Procore
- **Field Mapping**: Map issue fields (title, description, status, assignee)
- **Real-time Sync**: Keep issues updated in real-time
- **User Management**: Secure authentication and user management
- **Customer Settings**: Easy configuration interface for API credentials

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: NextAuth.js
- **APIs**: Autodesk ACC API, Procore API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Autodesk ACC API credentials
- Procore API credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rkrishnakumar/Concoord.git
cd Concoord
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Update the `.env` file with your basic configuration:
```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Note: API credentials are managed per-customer through the settings interface
# No need to configure global API credentials in environment variables
```

5. Set up the database:
```bash
npx prisma migrate dev
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Authentication

- Create an account or sign in
- Navigate to Settings to configure your API credentials
- Enter your Autodesk ACC API credentials
- Enter your Procore API credentials
- Test connections to verify credentials work

### 2. Project Mapping

- Select an ACC project
- Select a corresponding Procore project
- Save the mapping

### 3. Issue Synchronization

- Click "Sync Now" on any project mapping
- Issues will be automatically synced from ACC to Procore
- View sync results and logs

## API Endpoints

### Authentication
- `GET /api/auth/[...nextauth]` - NextAuth endpoints

### Project Mappings
- `GET /api/project-mappings` - Get all project mappings
- `POST /api/project-mappings` - Create new project mapping

### Synchronization
- `POST /api/sync` - Run synchronization for a project mapping

## Database Schema

The application uses the following main entities:

- **User**: User accounts and authentication
- **AccCredentials**: Autodesk ACC OAuth credentials
- **ProcoreCredentials**: Procore OAuth credentials
- **ProjectMapping**: ACC to Procore project mappings
- **IssueCrosswalk**: Issue ID mappings between systems
- **SyncLog**: Synchronization history and logs

## Development

### Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   └── page.tsx        # Main dashboard
├── lib/                # Utility libraries
│   ├── auth.ts         # NextAuth configuration
│   ├── db.ts           # Database client
│   ├── autodesk-acc.ts # ACC API client
│   ├── procore-api.ts  # Procore API client
│   └── sync-service.ts # Synchronization logic
└── components/         # React components
```

### Key Components

- **SyncService**: Handles the core synchronization logic
- **AutodeskAccApi**: Interface with Autodesk ACC API
- **ProcoreApi**: Interface with Procore API
- **Database Models**: Prisma schema for data persistence

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please open an issue on GitHub.