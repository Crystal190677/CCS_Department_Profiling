# CCS Department Profiling

CCS Management System with role-based access for Admin, Faculty, Officer, and Student users.

## Tech Stack

- **Frontend**: React, Vite, React Router
- **Backend**: Laravel (PHP)
- **Database**: MySQL (use MySQL Workbench to manage)

## Project Structure

```
CCS_Department_Profiling/
├── frontend/              # React app (Vite)
│   ├── src/
│   │   ├── pages/         # Login, Dashboard, etc.
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/               # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   └── Models/
│   ├── database/migrations
│   ├── routes/api.php
│   └── .env
└── README.md
```

## Prerequisites

- PHP 8.2+
- Composer
- MySQL (XAMPP/WAMP or standalone)
- Node.js 18+
- MySQL Workbench (for database management)


## Setup

### 1. Database (MySQL Workbench)

1. Open MySQL Workbench and connect to your MySQL server
2. Create a new database: `ccs_management_system`
3. Or run: `CREATE DATABASE ccs_management_system;`

### 2. Laravel Backend

```bash
cd backend
composer install
php artisan key:generate
```

Edit `.env` and set your MySQL credentials:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ccs_management_system
DB_USERNAME=root
DB_PASSWORD=your_password
```

Then run:

```bash
php artisan migrate
php artisan db:seed
php artisan serve
```

Backend runs at **http://localhost:8000**

### 3. React Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5174**

## Key Features

- **Authentication**: Login (email or student number), logout, sign-up (students: student number + password)
- **Admin dashboard**: Smart filter and search to find students who qualify for activities/sports; enroll students directly; students receive notifications
- **Student Dashboard**: View announcements, profile management, enrollment notifications
- **Student Profiles**: Height, weight, course, sports/activity interests used for qualification filtering

## Test Credentials (after seeding)

| Role    | Email / Identifier | Password  |
|---------|--------------------|-----------|
| Admin   | admin@ccs.edu      | admin123  |
| Officer | officer@ccs.edu    | admin123  |
| Student | 2024-001 or student@ccs.edu | admin123  |

## Design Theme

Black, white, and orange theme for the CCS Management System brand.
