const SELECTORS = [
  'a[href^="https://github.com/copilot"]',
  'a[href^="/copilot"]',
  'a[href*="github.com/apps/copilot"]',
  'a[href*="/apps/copilot"]',
  '[data-hovercard-type="copilot"]',
  '.js-copilot-avatar',
  '.octicon-copilot',
  '[aria-label*="Copilot"]',
  '[aria-label*="copilot"]',
  '[id*="copilot"]',
  '[data-testid*="copilot"]'
];

const TEXT_PATTERNS = [
  /mention\s+@copilot\s+in\s+a\s+comment/i,
  /request\s+review\s+from\s+copilot/i,
  /your\s+ai\s+pair\s+programmer/i,
  /ai\s+pair\s+programmer/i
];

const CONTAINER_SELECTORS = [
  'details',
  'li',
  'ul',
  'nav',
  'aside',
  'button',
  'a',
  'div',
  'span',
  'p',
  'label'
];

const UI_ROOT_SELECTORS = [
  'header',
  'nav',
  'aside',
  'details',
  'details-menu',
  'tool-tip',
  '[role="tooltip"]',
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="dialog"]',
  '[popover]',
  '[data-testid="top-bar-actions"]',
  '[data-testid="top-nav-right"]',
  '.discussion-sidebar',
  '.js-discussion-sidebar',
  '.TimelineItem'
];

function scoreElement(element) {
  const text = (element.textContent || '').trim();
  const ariaLabel = element.getAttribute('aria-label') || '';
  const href = element.getAttribute('href') || '';
  const dataTestId = element.getAttribute('data-testid') || '';
  const id = element.id || '';
  const classes = typeof element.className === 'string' ? element.className : '';

  let score = 0;

  if (/copilot/i.test(text)) score += 2;
  if (/copilot/i.test(ariaLabel)) score += 3;
  if (/copilot/i.test(href)) score += 4;
  if (/copilot/i.test(dataTestId)) score += 3;
  if (/copilot/i.test(id)) score += 3;
  if (/copilot/i.test(classes)) score += 2;
  if (element.matches('[data-hovercard-type="copilot"]')) score += 5;
  if (element.matches('.js-copilot-avatar, .octicon-copilot')) score += 2;

  return score;
}

function matchesCopilotText(value) {
  return TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function isUiContext(element) {
  return Boolean(element.closest(UI_ROOT_SELECTORS.join(',')));
}

function isEmptyCopilotShell(element) {
  if (!(element instanceof HTMLElement)) return false;

  const className = typeof element.className === 'string' ? element.className : '';
  const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();

  return (
    /tmp-py-2/.test(className) &&
    /tmp-px-3/.test(className) &&
    /\bborder\b/.test(className) &&
    /\bbgColor-muted\b/.test(className) &&
    /\brounded-2\b/.test(className) &&
    /\bmt-2\b/.test(className) &&
    /\bStack\b/.test(className) &&
    text.length === 0
  );
}

function findRemovableRoot(element) {
  let current = element;

  while (current && current !== document.body) {
    if (!(current instanceof HTMLElement)) {
      current = current.parentElement;
      continue;
    }

    if (
      current.matches(CONTAINER_SELECTORS.join(',')) &&
      scoreElement(current) >= 4 &&
      isUiContext(current)
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return element instanceof HTMLElement ? element : null;
}

function findTextBasedRoot(element) {
  let current = element;

  while (current && current !== document.body) {
    if (!(current instanceof HTMLElement)) {
      current = current.parentElement;
      continue;
    }

    const text = (current.innerText || current.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) {
      current = current.parentElement;
      continue;
    }

    if (matchesCopilotText(text) && text.length <= 400 && isUiContext(current)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function removeCopilot(root = document) {
  const matches = root.querySelectorAll(SELECTORS.join(','));

  for (const match of matches) {
    const target = findRemovableRoot(match);
    if (target && target.isConnected) {
      target.remove();
    }
  }

  const elements = root.querySelectorAll('*');
  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;

    const ownText = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const ariaLabel = element.getAttribute('aria-label') || '';
    const title = element.getAttribute('title') || '';

    if (
      !isUiContext(element) ||
      !matchesCopilotText(ownText) &&
      !matchesCopilotText(ariaLabel) &&
      !matchesCopilotText(title)
    ) {
      continue;
    }

    const target = findTextBasedRoot(element) || findRemovableRoot(element);
    if (target && target.isConnected) {
      target.remove();
    }
  }

  const emptyShells = root.querySelectorAll(
    '.tmp-py-2.tmp-px-3.border.bgColor-muted.rounded-2.mt-2.Stack'
  );

  for (const shell of emptyShells) {
    if (isEmptyCopilotShell(shell) && shell.isConnected) {
      shell.remove();
    }
  }
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;

      if (node.matches?.(SELECTORS.join(','))) {
        const target = findRemovableRoot(node);
        if (target && target.isConnected) {
          target.remove();
        }
        continue;
      }

      removeCopilot(node);
    }
  }
});

function start() {
  removeCopilot();
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
