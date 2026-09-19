/* eslint-disable no-var */

import { configRead } from './config.js';
import { showNotification } from './ui.js';
import { waitForChildAdd } from './utils.js';

// Legacy-compatible backport of the Force Highest Video Quality feature from
// upstream commits 2ce28a6, 890b086, and 861f161.
var PLAYER_SELECTOR = '.html5-video-player';
var PLAYING_STATE = 1;
var appliedVideoId = null;
var qualityInterval = null;
var qualityTimeout = null;

function clearQualityWait() {
  if (qualityInterval !== null) {
    window.clearInterval(qualityInterval);
    qualityInterval = null;
  }

  if (qualityTimeout !== null) {
    window.clearTimeout(qualityTimeout);
    qualityTimeout = null;
  }
}

function getPlayer() {
  var current = document.querySelector(PLAYER_SELECTOR);
  if (current) return Promise.resolve(current);

  return waitForChildAdd(document.body, function findPlayer(node) {
    return (
      node instanceof HTMLElement &&
      node.classList.contains('html5-video-player')
    );
  });
}

function getVideoId(player) {
  try {
    var data = player.getVideoData();
    return data && data.video_id ? data.video_id : null;
  } catch (err) {
    console.warn('[video-quality] unable to read video ID:', err);
    return null;
  }
}

function isPreview(player) {
  try {
    return typeof player.isInline === 'function' && player.isInline();
  } catch (err) {
    console.warn('[video-quality] unable to detect preview mode:', err);
    return false;
  }
}

function isPlaying(player, state) {
  try {
    if (typeof player.getPlayerStateObject === 'function') {
      var stateObject = player.getPlayerStateObject();
      if (stateObject && stateObject.isPlaying !== undefined) {
        return Boolean(stateObject.isPlaying);
      }
    }
  } catch (err) {
    console.warn('[video-quality] unable to read player state:', err);
  }

  if (state === PLAYING_STATE) return true;
  return Boolean(state && state.detail === PLAYING_STATE);
}

function getMaxQualityLabel(player) {
  try {
    var qualityData = player.getAvailableQualityData();
    return qualityData && qualityData.length ? qualityData[0].qualityLabel : '';
  } catch (err) {
    console.warn('[video-quality] unable to read available quality:', err);
    return '';
  }
}

function getSelectedQualityLabel(player) {
  try {
    return player.getPlaybackQualityLabel() || '';
  } catch (err) {
    console.warn('[video-quality] unable to read selected quality:', err);
    return '';
  }
}

function notifyQuality(player) {
  var selected = getSelectedQualityLabel(player) || 'Automatic';
  var maximum = getMaxQualityLabel(player) || 'unknown';
  showNotification(selected + ' selected (Max ' + maximum + ')', 3000);
}

function waitForQualityChange(player, previousQuality) {
  clearQualityWait();

  qualityInterval = window.setInterval(function checkQuality() {
    if (getSelectedQualityLabel(player) !== previousQuality) {
      clearQualityWait();
      notifyQuality(player);
    }
  }, 100);

  qualityTimeout = window.setTimeout(function qualityChangeTimeout() {
    console.warn('[video-quality] timed out waiting for quality change');
    clearQualityWait();
    notifyQuality(player);
  }, 3000);
}

function applyMaximumQuality(player, videoId) {
  var previousQuality = getSelectedQualityLabel(player);
  var maximumQuality = getMaxQualityLabel(player);

  appliedVideoId = videoId;
  console.info('[video-quality] requesting maximum quality for', videoId);
  try {
    player.setPlaybackQualityRange('highres', 'highres');
  } catch (err) {
    appliedVideoId = null;
    console.error('[video-quality] unable to set maximum quality:', err);
    return;
  }

  if (maximumQuality && previousQuality === maximumQuality) {
    notifyQuality(player);
    return;
  }

  waitForQualityChange(player, previousQuality);
}

function handlePlayerStateChange(player, state) {
  if (!configRead('forceHighResVideo')) {
    appliedVideoId = null;
    clearQualityWait();
    return;
  }

  var videoId = getVideoId(player);
  if (videoId && appliedVideoId && appliedVideoId !== videoId) {
    appliedVideoId = null;
    clearQualityWait();
  }

  if (isPreview(player) || !isPlaying(player, state)) return;

  if (!videoId || appliedVideoId === videoId) return;

  if (
    typeof player.setPlaybackQualityRange !== 'function' ||
    typeof player.getPlaybackQualityLabel !== 'function' ||
    typeof player.getAvailableQualityData !== 'function'
  ) {
    console.warn('[video-quality] required player API is unavailable');
    return;
  }

  applyMaximumQuality(player, videoId);
}

getPlayer()
  .then(function bindPlayer(player) {
    player.addEventListener(
      'onStateChange',
      function onPlayerStateChange(state) {
        handlePlayerStateChange(player, state);
      }
    );

    // Handle the unlikely case where playback started before the listener was
    // attached.
    handlePlayerStateChange(player);
  })
  .catch(function playerSetupFailed(err) {
    console.error('[video-quality] unable to attach to player:', err);
  });
