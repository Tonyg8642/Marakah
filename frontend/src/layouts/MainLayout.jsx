import { Outlet } from "react-router-dom";
import Header from "../components/Header/Header";
import BottomNav from "../components/BottomNav/BottomNav";

export default function MainLayout() {
  return (
    <div className="app-layout">
      <Header />

      <main className="app-content">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
