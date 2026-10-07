"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

/** Returns true if the viewport is below the mobile breakpoint.
 *  Defaults to false on the server / first render to avoid hydration mismatch. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
