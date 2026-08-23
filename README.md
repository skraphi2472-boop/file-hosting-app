# File Hosting and Sharing Website

A secure, modern file hosting platform with user authentication, file management, public sharing, and comprehensive admin controls.

## Features

### User Features
- User registration and login with email and Google OAuth
- Upload multiple files with progress tracking
- Files preserved in original quality, size, and format
- Rename, delete, download, and manage files
- Generate unique public links for each file
- Public file access without login
- Private files only accessible by owner
- File previews for images, PDFs, videos, audio, and text
- File metadata: size, type, upload date, download count
- File expiration options: 1 hour, 1 day, 7 days, 30 days, custom date, or unlimited
- Report inappropriate files with multiple categories

### Admin Features
- Dashboard with statistics and analytics
- User management (view, warn, suspend, ban, restore)
- File management and moderation
- Report management and review
- Expired file retention area (7-day configurable retention)
- Comprehensive audit logs
- System settings and configuration
- Role-based access control (Admin, Moderator, User)

### Security
- Server-side authentication and authorization
- Secure object storage (AWS S3)
- Signed/temporary download URLs
- File type and MIME validation
- Filename sanitization
- Rate limiting for abuse protection
- CAPTCHA/Turnstile support
- Malware scanning architecture
- Secure API endpoints
- No secrets in frontend
- Password hashing with bcrypt

## Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Database**: PostgreSQL
- **File Storage**: AWS S3
- **Authentication**: Passport.js (Local + Google OAuth)
- **Session Management**: express-session

## Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Install dependencies: `npm install`
4. Set up PostgreSQL database
5. Run migrations: `npm run migrate`
6. Start the server: `npm start`

## Project Structure

```
├── server.js                 # Express app entry point
├── config/
│   ├── database.js          # Database connection
│   ├── s3.js                # AWS S3 configuration
│   └── auth.js              # Authentication strategies
├── routes/
│   ├── auth.js              # Auth routes
│   ├── files.js             # File management routes
│   ├── public.js            # Public file access
│   ├── admin.js             # Admin panel routes
│   └── api/                 # API endpoints
├── middleware/
│   ├── auth.js              # Auth middleware
│   ├── admin.js             # Admin authorization
│   ├── validation.js        # Input validation
│   └── rateLimit.js         # Rate limiting
├── controllers/
│   ├── authController.js    # Auth logic
│   ├── fileController.js    # File operations
│   ├── adminController.js   # Admin operations
│   └── reportController.js  # Report handling
├── models/
│   ├── User.js              # User model
│   ├── File.js              # File model
│   ├── Report.js            # Report model
│   └── AuditLog.js          # Audit log model
├── services/
│   ├── fileService.js       # File business logic
│   ├── s3Service.js         # S3 operations
│   ├── emailService.js      # Email sending
│   └── cleanupService.js    # Expired file cleanup
├── public/
│   ├── css/                 # Stylesheets
│   ├── js/                  # Client scripts
│   └── images/              # Static images
├── views/
│   ├── layout.html          # Main layout
│   ├── home.html            # Homepage
│   ├── auth/                # Auth pages
│   ├── dashboard/           # User dashboard
│   ├── file/                # File pages
│   ├── public/              # Public file page
│   └── admin/               # Admin panel pages
├── migrations/              # Database migrations
└── database/
    └── schema.sql           # Database schema
```
