
import { BrowserRouter, Routes, Route } from "react-router-dom";

import PlatformAdmin from "./pages/Admin/PlatformAdmin/PlatformAdmin";


import Home from "./pages/Home/Home";


import "./styles/App.css";

function App() {
  return (
    
    <BrowserRouter>
      
      <Routes>
        
        <Route path="/" element={<Home />} />

       
        <Route
          path="/platform-admin"
          element={<PlatformAdmin />}
        />
      </Routes>
    </BrowserRouter>
  );
}


export default App;