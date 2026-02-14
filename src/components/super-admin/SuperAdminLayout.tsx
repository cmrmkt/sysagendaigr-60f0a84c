import { useRef } from "react";
import { Outlet } from "react-router-dom";
import SuperAdminSidebar from "./SuperAdminSidebar";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";

const SuperAdminLayout = () => {
  const mainRef = useRef<HTMLElement>(null);

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row bg-background overflow-hidden">
      <SuperAdminSidebar />
      <main
        ref={mainRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain relative"
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        <div className="min-h-full pb-24">
          <Outlet />
        </div>
        <ScrollToTopButton scrollRef={mainRef} />
      </main>
    </div>
  );
};

export default SuperAdminLayout;
