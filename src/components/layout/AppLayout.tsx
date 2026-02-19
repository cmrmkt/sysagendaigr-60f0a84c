import { useRef } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import ScrollToTopButton from "./ScrollToTopButton";
import SubscriptionBanner from "./SubscriptionBanner";
import InvoiceBanner from "./InvoiceBanner";

const AppLayout = () => {
  const mainRef = useRef<HTMLElement>(null);

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row overflow-hidden">
      <AppSidebar />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <SubscriptionBanner />
        <InvoiceBanner />
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
          {/* Scroll button inside main for better iframe compatibility */}
          <ScrollToTopButton scrollRef={mainRef} />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
