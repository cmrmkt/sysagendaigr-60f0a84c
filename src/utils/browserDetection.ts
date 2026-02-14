export type BrowserName = 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';

export interface BrowserInfo {
  name: BrowserName;
  isMobile: boolean;
  isIOS: boolean;
  isMacOS: boolean;
  isAndroid: boolean;
}

export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Detect platform
  const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMacOS = /macintosh|mac os x/.test(userAgent) && !isIOS;
  const isAndroid = /android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /mobile/.test(userAgent);

  // Detect browser
  let name: BrowserName = 'other';
  
  if (/edg/.test(userAgent)) {
    name = 'edge';
  } else if (/chrome|chromium|crios/.test(userAgent) && !/edg/.test(userAgent)) {
    name = 'chrome';
  } else if (/firefox|fxios/.test(userAgent)) {
    name = 'firefox';
  } else if (/safari/.test(userAgent) && !/chrome|chromium/.test(userAgent)) {
    name = 'safari';
  }

  return {
    name,
    isMobile,
    isIOS,
    isMacOS,
    isAndroid,
  };
}

export function getBrowserDisplayName(info: BrowserInfo): string {
  const names: Record<BrowserName, string> = {
    chrome: 'Google Chrome',
    firefox: 'Mozilla Firefox',
    safari: 'Safari',
    edge: 'Microsoft Edge',
    other: 'seu navegador',
  };
  return names[info.name];
}
