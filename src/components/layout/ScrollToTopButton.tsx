import { useState, useEffect, RefObject } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollToTopButtonProps {
  scrollRef: RefObject<HTMLElement>;
}

const ScrollToTopButton = ({ scrollRef }: ScrollToTopButtonProps) => {
  const [showButton, setShowButton] = useState(false);
  const [bottomInsetPx, setBottomInsetPx] = useState(0);

  useEffect(() => {
    const element = scrollRef.current;

    const getScrollTop = () => {
      // Prefer the scroll container when it actually scrolls; fall back to window/document scroll
      const elTop = element?.scrollTop ?? 0;
      const winTop = window.scrollY || document.documentElement.scrollTop || 0;
      return Math.max(elTop, winTop);
    };

    const handleScroll = () => {
      // Show even on small scrolls (especially inside iframes)
      setShowButton(getScrollTop() > 10);
    };

    // Initial check
    handleScroll();

    if (element) element.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Some embed/iframe setups scroll the document rather than the expected container.
    // Capture=true makes sure we hear scrolls from any scrollable ancestor.
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });

    return () => {
      if (element) element.removeEventListener("scroll", handleScroll as EventListener);
      window.removeEventListener("scroll", handleScroll as EventListener);
      document.removeEventListener("scroll", handleScroll as EventListener, true);
    };
  }, [scrollRef]);

  // On some mobile browsers (especially Android Chrome), fixed elements can be
  // partially covered by the dynamic bottom UI. visualViewport lets us detect
  // that "covered" area and lift the button above it.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const updateInset = () => {
      const coveredBottom = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setBottomInsetPx(Math.round(coveredBottom));
    };

    updateInset();
    vv.addEventListener("resize", updateInset);
    vv.addEventListener("scroll", updateInset);
    window.addEventListener("resize", updateInset);

    return () => {
      vv.removeEventListener("resize", updateInset);
      vv.removeEventListener("scroll", updateInset);
      window.removeEventListener("resize", updateInset);
    };
  }, []);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 transition-all duration-300 z-[9999]",
        showButton ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <Button
        onClick={scrollToTop}
        size="icon"
        variant="secondary"
        className="h-10 w-10 rounded-full shadow-lg bg-card/90 backdrop-blur-sm border hover:bg-card"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ScrollToTopButton;

