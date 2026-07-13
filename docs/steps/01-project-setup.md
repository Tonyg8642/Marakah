# Marakah Full-Stack Build Guide

Marakah is an Islamic lecture, masjid event, recording, and community platform.

## Technology Stack

### Frontend

- React
- JavaScript
- CSS
- React Router
- Axios

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Tokens

## Build Steps

1. Project Setup

Step 1 — Create the Main Project
Purpose

Create the root folder that will contain the entire Marakah application.

Commands
cd ~/Desktop
mkdir Marakah
cd Marakah
Create the main folders
mkdir frontend backend docs assets
touch README.md
Verify
find . -maxdepth 2
Result
Marakah/
├── assets
├── backend
├── docs
├── frontend
└── README.md

2. React Frontend Setup

Step 2 — Create the React Frontend
Purpose

Create the React application using Vite.

Commands
npm create vite@latest frontend -- --template react

Choose:

ESLint

Then:

Install with npm
Start the project
cd frontend
npm run dev
Result

React application created.

3. Frontend Folder Structure

Step 3 — Organize the Frontend
Purpose

Create a professional React folder structure before writing code.

Commands
mkdir -p src/components
mkdir -p src/pages
mkdir -p src/services
mkdir -p src/contexts
mkdir -p src/hooks
mkdir -p src/layouts
mkdir -p src/styles
mkdir -p src/utils
Move CSS
mv src/App.css src/styles/App.css
mv src/index.css src/styles/index.css
Update imports

App.jsx

import "./styles/App.css";

main.jsx

import "./styles/index.css";
Result
src/
├── components/
├── contexts/
├── hooks/
├── layouts/
├── pages/
├── services/
├── styles/
├── utils/
├── App.jsx
└── main.jsx

4. Page Structure

Step 4 — Build the Page Structure
Purpose

Create every page folder before building the application.

Commands
mkdir -p src/pages/Home

mkdir -p src/pages/Auth

mkdir -p src/pages/Live

mkdir -p src/pages/Recordings

mkdir -p src/pages/Masjids

mkdir -p src/pages/Events

mkdir -p src/pages/Feed

mkdir -p src/pages/Scholars

mkdir -p src/pages/Profile

mkdir -p src/pages/Admin/MasjidDashboard

mkdir -p src/pages/Admin/SuperAdmin
Create the page files

Home

touch src/pages/Home/Home.jsx
touch src/pages/Home/Home.css

Auth

touch src/pages/Auth/Login.jsx
touch src/pages/Auth/Login.css

touch src/pages/Auth/Signup.jsx
touch src/pages/Auth/Signup.css

Live

touch src/pages/Live/Live.jsx
touch src/pages/Live/Live.css

Recordings

touch src/pages/Recordings/Recordings.jsx
touch src/pages/Recordings/Recordings.css

Masjids

touch src/pages/Masjids/Masjids.jsx
touch src/pages/Masjids/Masjids.css

Events

touch src/pages/Events/Events.jsx
touch src/pages/Events/Events.css

Feed

touch src/pages/Feed/Feed.jsx
touch src/pages/Feed/Feed.css

Scholars

touch src/pages/Scholars/Scholars.jsx
touch src/pages/Scholars/Scholars.css

Profile

touch src/pages/Profile/Profile.jsx
touch src/pages/Profile/Profile.css

Admin

touch src/pages/Admin/MasjidDashboard/MasjidDashboard.jsx
touch src/pages/Admin/MasjidDashboard/MasjidDashboard.css

touch src/pages/Admin/SuperAdmin/SuperAdmin.jsx
touch src/pages/Admin/SuperAdmin/SuperAdmin.css
Result

Every page has its own folder with matching JSX and CSS files.

5. Install Frontend Packages

Step 5 — Install Frontend Packages
Purpose

Install the libraries needed for routing and API communication.

Commands
npm install react-router-dom axios
Packages Installed
React Router

Used for:

Page navigation
Nested routes
Protected routes
Axios

Used for:

Sending requests to the Express backend
Logging in users
Getting lectures
Fetching masjids
Uploading data


6. React Router Setup
7. Main Layout
8. Header Component
9. Bottom Navigation
10. Desktop Sidebar
11. Protected Routes
12. Authentication Context
13. Express Backend Setup
14. MongoDB Connection
15. User Model
16. Authentication API
17. Connect Frontend and Backend
