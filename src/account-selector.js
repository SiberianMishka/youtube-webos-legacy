const ACCOUNT_SELECTOR_SELECTOR = 'ytlr-account-selector';
const ACCOUNT_TILE_SELECTOR = 'ytlr-tile-renderer';
const AUTO_SELECT_DELAY = 100;
const AUTO_SELECT_MAX_ATTEMPTS = 50;

function isVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function getFocusedTile(tiles) {
  const activeElement = document.activeElement;

  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === activeElement || tiles[i].contains(activeElement)) {
      return tiles[i];
    }
  }

  return null;
}

function tryAutoSelectLastChannel() {
  const selector = document.querySelector(ACCOUNT_SELECTOR_SELECTOR);
  if (!selector || !isVisible(selector)) {
    return null;
  }

  const tiles = selector.querySelectorAll(ACCOUNT_TILE_SELECTOR);
  if (!tiles.length) {
    return null;
  }

  const focusedTile = getFocusedTile(tiles);
  if (!focusedTile) {
    return null;
  }

  if (focusedTile !== tiles[0]) {
    console.info('[account-selector] manual selection retained');
    return false;
  }

  console.info('[account-selector] selecting focused most-recent channel');
  tiles[0].click();
  return true;
}

(function autoSelectLastChannel() {
  let timer;

  function startAutoSelectWindow() {
    let attempts = 0;

    timer && clearTimeout(timer);

    function checkSelector() {
      const result = tryAutoSelectLastChannel();
      if (result !== null) {
        return;
      }

      attempts += 1;
      if (attempts < AUTO_SELECT_MAX_ATTEMPTS) {
        timer = setTimeout(checkSelector, AUTO_SELECT_DELAY);
      } else {
        console.info('[account-selector] manual selection retained');
      }
    }

    checkSelector();
  }

  document.addEventListener(
    'visibilitychange',
    () => {
      if (!document.hidden) {
        startAutoSelectWindow();
      }
    },
    true
  );
  document.addEventListener('webOSRelaunch', startAutoSelectWindow, true);

  startAutoSelectWindow();
})();
