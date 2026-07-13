Step 6 – Platform Administration
Goal

In this step, you created a Platform Administration dashboard and connected it to a React Router route.

The page displays:

Total Masjids
Total Users
Pending Approvals
Total Donations
Step 6.1: Open the frontend folder

In the terminal, make sure you are inside the frontend folder:

cd frontend

Confirm your location:

pwd

The path should end with:

Marakah/frontend
Step 6.2: Create the PlatformAdmin folder

Inside:

frontend/src/pages/Admin

Create a folder named:

PlatformAdmin

Your structure should look like this:

src/
└── pages/
    └── Admin/
        └── PlatformAdmin/

You can create it through the terminal:

mkdir -p src/pages/Admin/PlatformAdmin
Step 6.3: Create the component files

Create these two files:

PlatformAdmin.jsx
PlatformAdmin.css

Terminal command:

touch src/pages/Admin/PlatformAdmin/PlatformAdmin.jsx
touch src/pages/Admin/PlatformAdmin/PlatformAdmin.css

Your folder should now look like:

src/
└── pages/
    └── Admin/
        └── PlatformAdmin/
            ├── PlatformAdmin.jsx
            └── PlatformAdmin.css
Step 6.4: Add the PlatformAdmin component

Open:

src/pages/Admin/PlatformAdmin/PlatformAdmin.jsx

Add this code:

import "./PlatformAdmin.css";

export default function PlatformAdmin() {
  return (
    <div className="platform-admin">
      <h1>Platform Administration</h1>

      <div className="dashboard-grid">
        <div className="card">
          <h2>Total Masjids</h2>
          <p>0</p>
        </div>

        <div className="card">
          <h2>Total Users</h2>
          <p>0</p>
        </div>

        <div className="card">
          <h2>Pending Approvals</h2>
          <p>0</p>
        </div>

        <div className="card">
          <h2>Total Donations</h2>
          <p>$0</p>
        </div>
      </div>
    </div>
  );
}
What this code does
import "./PlatformAdmin.css";

Imports the CSS file used to style the page.

export default function PlatformAdmin()

Creates and exports the Platform Admin React component.

<div className="platform-admin">

Wraps the entire dashboard in one main container.

<div className="dashboard-grid">

Creates the container that holds all dashboard cards.

Each card displays one platform statistic.

Step 6.5: Style the dashboard

Open:

src/pages/Admin/PlatformAdmin/PlatformAdmin.css

Add:

.platform-admin {
  padding: 30px;
}

.platform-admin h1 {
  margin-bottom: 25px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.card {
  background-color: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card h2 {
  margin-bottom: 10px;
}

.card p {
  font-size: 2rem;
  font-weight: bold;
}
What the CSS does
.platform-admin

Adds spacing around the dashboard.

.dashboard-grid

Uses CSS Grid to arrange the cards.

repeat(auto-fit, minmax(220px, 1fr))

Makes the dashboard responsive. The cards automatically move into fewer columns on smaller screens.

.card

Adds a white background, padding, rounded corners, and a shadow.

Step 6.6: Install React Router

While inside the frontend folder, run:

npm install react-router-dom

You can verify the installation with:

npm list react-router-dom
Step 6.7: Import React Router into App.jsx

Open:

src/App.jsx

At the top, add:

import { BrowserRouter, Routes, Route } from "react-router-dom";

This gives your app access to React Router.

Step 6.8: Import PlatformAdmin into App.jsx

Add:

import PlatformAdmin from "./pages/Admin/PlatformAdmin/PlatformAdmin";

Make sure the spelling and capitalization match the folder and file names exactly.

Step 6.9: Keep the Vite page as the home page

Your Vite starter content was moved into a component named:

function HomePage()

This allows it to remain available at the / route.

The structure looks like:

function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <>
      {/* Vite starter content */}
    </>
  );
}
Step 6.10: Add BrowserRouter and Routes

At the bottom of App.jsx, your App component should look like this:

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/platform-admin"
          element={<PlatformAdmin />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
What this routing code does
<BrowserRouter>

Turns on browser-based routing for the app.

<Routes>

Holds all available routes.

<Route path="/" element={<HomePage />} />

Displays the Vite starter page when visiting the main URL.

<Route
  path="/platform-admin"
  element={<PlatformAdmin />}
/>

Displays the Platform Administration page when visiting /platform-admin.

Step 6.11: Run the frontend

From the frontend folder, run:

npm run dev

The terminal should show a local URL similar to:

http://localhost:5176/

Your port may be different.

Step 6.12: Test the routes

Open the main page:

http://localhost:5176/

This should display the Vite starter page.

Then open:

http://localhost:5176/platform-admin

This should display:

Platform Administration

Total Masjids
0

Total Users
0

Pending Approvals
0

Total Donations
$0
Step 6.13: Verify the folder structure

Run:

find src/pages/Admin -maxdepth 2

You should see:

src/pages/Admin
src/pages/Admin/MasjidDashboard
src/pages/Admin/MasjidDashboard/MasjidDashboard.css
src/pages/Admin/MasjidDashboard/MasjidDashboard.jsx
src/pages/Admin/PlatformAdmin
src/pages/Admin/PlatformAdmin/PlatformAdmin.jsx
src/pages/Admin/PlatformAdmin/PlatformAdmin.css
Common mistakes corrected

The import must include ./:

import PlatformAdmin from "./pages/Admin/PlatformAdmin/PlatformAdmin";

Not:

import PlatformAdmin from ".pages/Admin/PlatformAdmin/PlatformAdmin";

The word Platform must be spelled correctly.

Correct:

PlatformAdmin

Incorrect:

PlaformAdmin

Run npm run dev from:

Marakah/frontend

Not from:

Marakah
What you completed

You successfully:

Created the Platform Admin folder
Created the React component
Created the CSS file
Installed React Router
Imported the dashboard into App.jsx
Created the /platform-admin route
Started the frontend development server
Opened and tested the new dashboard page
Final working route
http://localhost:5176/platform-admin