import { useRef, useEffect } from "react";

interface UseDragToScrollOptions {
  speed?: number;
}

export const useDragToScroll = <T extends HTMLElement>(options: UseDragToScrollOptions = {}) => {
  const { speed = 1.5 } = options;
  const ref = useRef<T>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.style.cursor = "grab";

    const shouldIgnoreTarget = (target: HTMLElement): boolean => {
      return !!target.closest('button, input, textarea, select, [role="button"], [data-no-drag], .task-card');
    };

    const handleStart = (clientX: number, target: HTMLElement): boolean => {
      if (shouldIgnoreTarget(target)) return false;

      isDown.current = true;
      element.style.cursor = "grabbing";
      element.style.userSelect = "none";

      const rect = element.getBoundingClientRect();
      startX.current = clientX - rect.left;
      scrollLeft.current = element.scrollLeft;
      return true;
    };

    const handleEnd = () => {
      isDown.current = false;
      element.style.cursor = "grab";
      element.style.userSelect = "";
    };

    const handleMove = (clientX: number) => {
      if (!isDown.current) return;
      
      const rect = element.getBoundingClientRect();
      const x = clientX - rect.left;
      const walk = (x - startX.current) * speed;
      element.scrollLeft = scrollLeft.current - walk;
    };

    // Pointer Events handlers
    const onPointerDown = (e: PointerEvent) => {
      const started = handleStart(e.clientX, e.target as HTMLElement);
      if (started) {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      handleEnd();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDown.current) {
        e.preventDefault();
        handleMove(e.clientX);
      }
    };

    // Mouse Events handlers (fallback)
    const onMouseDown = (e: MouseEvent) => {
      handleStart(e.clientX, e.target as HTMLElement);
    };

    const onMouseUp = () => handleEnd();
    const onMouseLeave = () => handleEnd();

    const onMouseMove = (e: MouseEvent) => {
      if (isDown.current) {
        e.preventDefault();
        handleMove(e.clientX);
      }
    };

    // Touch Events handlers (fallback)
    const onTouchStart = (e: TouchEvent) => {
      handleStart(e.touches[0].clientX, e.target as HTMLElement);
    };

    const onTouchEnd = () => handleEnd();

    const onTouchMove = (e: TouchEvent) => {
      if (isDown.current) {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      }
    };

    // Check for Pointer Events support
    const supportsPointerEvents = 'onpointerdown' in window;

    if (supportsPointerEvents) {
      element.addEventListener("pointerdown", onPointerDown);
      element.addEventListener("pointerup", onPointerUp);
      element.addEventListener("pointermove", onPointerMove);
      element.addEventListener("pointercancel", onPointerUp);
      element.addEventListener("pointerleave", onPointerUp);
    } else {
      element.addEventListener("mousedown", onMouseDown);
      element.addEventListener("mouseleave", onMouseLeave);
      element.addEventListener("mouseup", onMouseUp);
      element.addEventListener("mousemove", onMouseMove);
      element.addEventListener("touchstart", onTouchStart, { passive: true });
      element.addEventListener("touchend", onTouchEnd);
      element.addEventListener("touchmove", onTouchMove, { passive: false });
    }

    return () => {
      if (supportsPointerEvents) {
        element.removeEventListener("pointerdown", onPointerDown);
        element.removeEventListener("pointerup", onPointerUp);
        element.removeEventListener("pointermove", onPointerMove);
        element.removeEventListener("pointercancel", onPointerUp);
        element.removeEventListener("pointerleave", onPointerUp);
      } else {
        element.removeEventListener("mousedown", onMouseDown);
        element.removeEventListener("mouseleave", onMouseLeave);
        element.removeEventListener("mouseup", onMouseUp);
        element.removeEventListener("mousemove", onMouseMove);
        element.removeEventListener("touchstart", onTouchStart);
        element.removeEventListener("touchend", onTouchEnd);
        element.removeEventListener("touchmove", onTouchMove);
      }
    };
  }, [speed]);

  return ref;
};
