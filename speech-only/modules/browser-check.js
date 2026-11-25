let browserWarningShown = false;

export function openBrowserWarningModal(browserName) {
  if (browserWarningShown) return;
  const backdropEl = document.getElementById('browser-warning-modal-backdrop');
  const descEl = document.getElementById('browser-warning-modal-desc');
  const statusEl = document.getElementById('browser-warning-open-status');
  if (!backdropEl) return;
  browserWarningShown = true;
  if (descEl) {
    descEl.textContent = `You are currently using ${browserName}. Google Chrome should be used for this web app for full voice, speech recognition, and audio support.`;
  }
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
  }
  backdropEl.classList.remove('hidden');
}

export function closeBrowserWarningModal() {
  const backdropEl = document.getElementById('browser-warning-modal-backdrop');
  if (backdropEl) {
    backdropEl.classList.add('hidden');
  }
}

export function openCurrentPageInChrome() {
  const currentUrl = window.location.href;
  const statusEl = document.getElementById('browser-warning-open-status');
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  let chromeLaunchUrl = `googlechrome://navigate?url=${encodeURIComponent(currentUrl)}`;

  if (isAndroid && /^https?:/i.test(currentUrl)) {
    const scheme = window.location.protocol.replace(':', '') || 'https';
    const stripped = currentUrl.replace(/^https?:\/\//i, '');
    chromeLaunchUrl = `intent://${stripped}#Intent;scheme=${scheme};package=com.android.chrome;end`;
  }

  try {
    const link = document.createElement('a');
    link.href = chromeLaunchUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    // Ignore protocol launch errors in restricted contexts
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(currentUrl).catch(() => { });
  }

  if (statusEl) {
    statusEl.textContent =
      'Attempting to open Google Chrome… If your browser blocks launching Chrome directly, the page address has been copied so you can paste it into Chrome.';
    statusEl.classList.remove('hidden');
  }
}

function updateBrowserSupportBadge(browserName, isChrome) {
  if (!isChrome) {
    openBrowserWarningModal(browserName);
  }
}

function renderDetectedBrowserFromUa(ua, brands) {
  if (Array.isArray(brands) && brands.length > 0) {
    const preferred = [
      { match: /Microsoft Edge/i, name: 'Microsoft Edge', isChrome: false },
      { match: /Opera/i, name: 'Opera', isChrome: false },
      { match: /Brave/i, name: 'Brave', isChrome: false },
      { match: /Vivaldi/i, name: 'Vivaldi', isChrome: false },
      { match: /Google Chrome/i, name: 'Google Chrome', isChrome: true },
      { match: /Chromium/i, name: 'Chromium', isChrome: false }
    ];
    for (const entry of preferred) {
      const found = brands.find((b) => entry.match.test(b.brand));
      if (found) {
        updateBrowserSupportBadge(entry.name, entry.isChrome);
        return;
      }
    }
  }

  const rules = [
    { regex: /Edg(?:A|iOS)?\/([\d.]+)/, name: 'Microsoft Edge', isChrome: false },
    { regex: /(?:OPR|Opera)\/([\d.]+)/, name: 'Opera', isChrome: false },
    { regex: /Vivaldi\/([\d.]+)/, name: 'Vivaldi', isChrome: false },
    { regex: /(?:Firefox|FxiOS)\/([\d.]+)/, name: 'Mozilla Firefox', isChrome: false },
    { regex: /(?:Chrome|CriOS)\/([\d.]+)/, name: 'Google Chrome', isChrome: true },
    { regex: /Version\/([\d.]+).*Safari/, name: 'Safari', isChrome: false },
    { regex: /Safari\/([\d.]+)/, name: 'Safari', isChrome: false },
    { regex: /(?:MSIE |rv:)([\d.]+).*Trident|MSIE ([\d.]+)/, name: 'Internet Explorer', isChrome: false }
  ];

  for (const rule of rules) {
    if (rule.regex.test(ua)) {
      updateBrowserSupportBadge(rule.name, rule.isChrome);
      return;
    }
  }

  updateBrowserSupportBadge('Unknown Browser', false);
}

export function detectUserBrowser() {
  const ua = navigator.userAgent || '';
  const brands = navigator.userAgentData?.brands;

  if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
    navigator.brave
      .isBrave()
      .then((isBrave) => {
        if (isBrave) {
          updateBrowserSupportBadge('Brave', false);
        } else {
          renderDetectedBrowserFromUa(ua, brands);
        }
      })
      .catch(() => renderDetectedBrowserFromUa(ua, brands));
    return;
  }

  renderDetectedBrowserFromUa(ua, brands);
}

export function initBrowserCheck() {
  const backdropEl = document.getElementById('browser-warning-modal-backdrop');
  const continueBtn = document.getElementById('browser-warning-continue-btn');
  const openChromeBtn = document.getElementById('browser-warning-open-chrome-btn');
  if (continueBtn) {
    continueBtn.addEventListener('click', closeBrowserWarningModal);
  }
  if (openChromeBtn) {
    openChromeBtn.addEventListener('click', openCurrentPageInChrome);
  }
  if (backdropEl) {
    backdropEl.addEventListener('click', (e) => {
      if (e.target === backdropEl) {
        closeBrowserWarningModal();
      }
    });
  }
  detectUserBrowser();
}
