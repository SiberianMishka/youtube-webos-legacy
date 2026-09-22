import 'whatwg-fetch';
import './domrect-polyfill';

import { handleLaunch, waitForChildAdd } from './utils';

document.addEventListener(
  'webOSRelaunch',
  (evt) => {
    console.info('RELAUNCH:', evt, window.launchParams);
    handleLaunch(evt.detail);
  },
  true
);

import './adblock.js';
import './account-selector.js';
import './sponsorblock.js';
import './ui.js';
import './video-quality.js';

// Keep only the full-screen watch player sized to the viewport.
// Home-page previews are also <video> elements; changing their inline style
// stretches their thumbnail card and must not affect screensaver handling.
let observedWatchVideo = null;
let observedWatchVideoStyle = null;
let waitingForWatchVideo = false;

function isWatchPage() {
  return document.body.classList.contains('WEB_PAGE_TYPE_WATCH');
}

function getWatchVideoScale() {
  // After Android cast, the legacy video plane uses physical pixels while
  // the page viewport remains in CSS pixels. This mode persists after cast.
  return document.body.classList.contains('limited-memory')
    ? window.devicePixelRatio || 1
    : 1;
}

function isHiddenVideo(video) {
  const style = video.style;
  return style.display === 'none' || style.top.indexOf('-') === 0;
}

function fitWatchVideo(video) {
  if (!isWatchPage() || isHiddenVideo(video)) return;

  const style = video.style;
  const scale = getWatchVideoScale();
  const targetWidth = `${Math.round(window.innerWidth * scale)}px`;
  const targetHeight = `${Math.round(window.innerHeight * scale)}px`;

  // Avoid recursive style mutations on older webOS implementations.
  style.width !== targetWidth && (style.width = targetWidth);
  style.height !== targetHeight && (style.height = targetHeight);
  style.left !== '0px' && (style.left = '0px');
  style.top !== '0px' && (style.top = '0px');

  observedWatchVideoStyle.applied = {
    width: targetWidth,
    height: targetHeight,
    left: '0px',
    top: '0px'
  };
}

function stopObservingWatchVideo() {
  playerStyleObserver.disconnect();

  if (
    observedWatchVideo &&
    observedWatchVideoStyle &&
    observedWatchVideoStyle.applied
  ) {
    const style = observedWatchVideo.style;
    const originalStyle = observedWatchVideoStyle.original;
    const appliedStyle = observedWatchVideoStyle.applied;

    style.width === appliedStyle.width && (style.width = originalStyle.width);
    style.height === appliedStyle.height &&
      (style.height = originalStyle.height);
    style.left === appliedStyle.left && (style.left = originalStyle.left);
    style.top === appliedStyle.top && (style.top = originalStyle.top);
  }

  observedWatchVideo = null;
  observedWatchVideoStyle = null;
}

const playerStyleObserver = new MutationObserver((mutations) => {
  if (!isWatchPage()) {
    stopObservingWatchVideo();
    return;
  }

  const video = mutations[0] && mutations[0].target;
  if (video instanceof HTMLVideoElement) {
    fitWatchVideo(video);
  }
});

function observeWatchVideo(video) {
  if (observedWatchVideo === video) {
    fitWatchVideo(video);
    return;
  }

  stopObservingWatchVideo();
  observedWatchVideo = video;
  observedWatchVideoStyle = {
    original: {
      width: video.style.width,
      height: video.style.height,
      left: video.style.left,
      top: video.style.top
    },
    applied: null
  };
  playerStyleObserver.observe(video, {
    attributes: true,
    attributeFilter: ['style']
  });
  fitWatchVideo(video);
}

function bindWatchVideo() {
  if (!isWatchPage()) {
    stopObservingWatchVideo();
    return;
  }

  const video = document.querySelector('video');
  if (video instanceof HTMLVideoElement) {
    observeWatchVideo(video);
    return;
  }

  if (waitingForWatchVideo) return;
  waitingForWatchVideo = true;
  waitForChildAdd(document.body, (node) => node instanceof HTMLVideoElement)
    .then((watchVideo) => {
      waitingForWatchVideo = false;
      if (isWatchPage()) observeWatchVideo(watchVideo);
    })
    .catch((err) => {
      waitingForWatchVideo = false;
      console.warn('[screensaver] unable to find watch video:', err);
    });
}

const bodyClassObserver = new MutationObserver(bindWatchVideo);
bodyClassObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ['class']
});
bindWatchVideo();
