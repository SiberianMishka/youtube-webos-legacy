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

// Keep only the full-screen watch player sized to the viewport. Home-page
// previews are also <video> elements; changing their inline style stretches
// their thumbnail card and must not affect screensaver handling.
let observedWatchVideo = null;
let waitingForWatchVideo = false;

function isWatchPage() {
  return document.body.classList.contains('WEB_PAGE_TYPE_WATCH');
}

function isHiddenVideo(video) {
  const style = video.style;
  return style.display === 'none' || style.top.indexOf('-') === 0;
}

function fitWatchVideo(video) {
  if (!isWatchPage() || isHiddenVideo(video)) return;

  const style = video.style;
  const targetWidth = `${window.innerWidth}px`;
  const targetHeight = `${window.innerHeight}px`;

  // Avoid recursive style mutations on older webOS implementations.
  style.width !== targetWidth && (style.width = targetWidth);
  style.height !== targetHeight && (style.height = targetHeight);
  style.left !== '0px' && (style.left = '0px');
  style.top !== '0px' && (style.top = '0px');
}

const playerStyleObserver = new MutationObserver((mutations, observer) => {
  if (!isWatchPage()) {
    observer.disconnect();
    observedWatchVideo = null;
    return;
  }

  const video = mutations[0] && mutations[0].target;
  if (video instanceof HTMLVideoElement) {
    fitWatchVideo(video);
  }
});

function observeWatchVideo(video) {
  if (observedWatchVideo === video) return;

  playerStyleObserver.disconnect();
  observedWatchVideo = video;
  playerStyleObserver.observe(video, {
    attributes: true,
    attributeFilter: ['style']
  });
  fitWatchVideo(video);
}

function bindWatchVideo() {
  if (!isWatchPage()) {
    playerStyleObserver.disconnect();
    observedWatchVideo = null;
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
