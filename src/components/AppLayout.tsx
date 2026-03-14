import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 ml-[240px] transition-all">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
