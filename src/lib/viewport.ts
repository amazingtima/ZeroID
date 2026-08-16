export const isIOS =
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const isSafari =
  isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/.test(navigator.userAgent);

export const isMobile =
  isIOS || window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;

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
