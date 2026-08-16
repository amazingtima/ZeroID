export const isIOS =
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function viewportSize() {
  const view = window.visualViewport;
  return {
    width: Math.round(view?.width ?? document.documentElement.clientWidth),
    height: Math.round(view?.height ?? document.documentElement.clientHeight),
  };
}

export function onViewportChange(callback: () => void) {
  window.addEventListener("resize", callback);
  window.visualViewport?.addEventListener("resize", callback);
  return () => {
    window.removeEventListener("resize", callback);
    window.visualViewport?.removeEventListener("resize", callback);
  };
}
