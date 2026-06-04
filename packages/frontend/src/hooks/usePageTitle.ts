import { useEffect } from "react";

const APP_BRAND = "CriStream";

/**
 * Sets `document.title` to `<title> · <APP_BRAND>` while the component is mounted,
 * restoring the previous title on unmount. Lets dashboard routes brand themselves
 * separately from the public-facing Casino routes (which keep "CRISINO Casino").
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · ${APP_BRAND}`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
