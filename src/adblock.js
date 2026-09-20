/* eslint no-redeclare: 0 */
/* global fetch:writable */
import { configRead } from './config';

/**
 * This is a minimal reimplementation of the following uBlock Origin rule:
 * https://github.com/uBlockOrigin/uAssets/blob/3497eebd440f4871830b9b45af0afc406c6eb593/filters/filters.txt#L116
 *
 * This in turn calls the following snippet:
 * https://github.com/gorhill/uBlock/blob/bfdc81e9e400f7b78b2abc97576c3d7bf3a11a0b/assets/resources/scriptlets.js#L365-L470
 *
 * Seems like for now dropping just the adPlacements is enough for YouTube TV
 */
const origParse = JSON.parse;
JSON.parse = function () {
  const r = origParse.apply(this, arguments);
  if (!configRead('enableAdBlock')) {
    return r;
  }

  if (r.adPlacements) {
    r.adPlacements = [];
  }

  if (Array.isArray(r.adSlots)) {
    r.adSlots = [];
  }

  if (r.playerAds) {
    r.playerAds = [];
  }

  // remove ads from home
  const homeSectionListRenderer =
    r?.contents?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer?.content
      ?.sectionListRenderer;
  if (homeSectionListRenderer?.contents) {
    // Drop the full width ad card, usually appears at the top of the page
    homeSectionListRenderer.contents = homeSectionListRenderer.contents.filter(
      (elm) => !elm.tvMastheadRenderer
    );

    // Drop ad tile from the horizontal shelf
    removeAdSlotRenderer(homeSectionListRenderer);
  }

  // remove ad tile from search
  const searchSectionListRenderer = r?.contents?.sectionListRenderer;
  if (searchSectionListRenderer?.contents) {
    removeAdSlotRenderer(searchSectionListRenderer);
  }

  // remove ads from Shorts reel
  if (Array.isArray(r.entries)) {
    r.entries = r.entries.filter(
      (elm) => !elm?.command?.reelWatchEndpoint?.adClientParams?.isAd
    );
  }

  return r;
};

const origStringify = JSON.stringify;
JSON.stringify = function (value, replacer, space) {
  if (configRead('enableAdBlock')) {
    value = addNoAdPlaybackContext(value);
  }

  return origStringify(value, replacer, space);
};

function addNoAdPlaybackContext(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  const playbackContext = value.playbackContext;
  if (playbackContext === null || typeof playbackContext !== 'object') {
    return value;
  }

  const contentPlaybackContext = playbackContext.contentPlaybackContext;
  if (
    contentPlaybackContext === null ||
    typeof contentPlaybackContext !== 'object'
  ) {
    return value;
  }

  const nextContentPlaybackContext = copyEnumerableProperties(
    contentPlaybackContext
  );
  nextContentPlaybackContext.isInlinePlaybackNoAd = true;

  const nextPlaybackContext = copyEnumerableProperties(playbackContext);
  nextPlaybackContext.contentPlaybackContext = nextContentPlaybackContext;

  const nextValue = copyEnumerableProperties(value);
  nextValue.playbackContext = nextPlaybackContext;
  return nextValue;
}

function copyEnumerableProperties(value) {
  const copy = Array.isArray(value) ? [] : {};
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      copy[key] = value[key];
    }
  }
  return copy;
}

// Drop `adSlotRenderer`
// `adSlotRenderer` can occur as,
// - sectionListRenderer.contents[*].adSlotRenderer
// - sectionListRenderer.contents[*].shelfRenderer.content.horizontalListRenderer.items[*].adSlotRenderer
function removeAdSlotRenderer(sectionListRenderer) {
  // sectionListRenderer.contents[*].adSlotRenderer
  sectionListRenderer.contents = sectionListRenderer.contents.filter(
    (elm) => !elm.adSlotRenderer
  );

  // sectionListRenderer.contents[*].shelfRenderer.content.horizontalListRenderer.items[*].adSlotRenderer
  const contentsWithShelfRenderer = sectionListRenderer.contents.filter(
    (elm) => elm.shelfRenderer
  );
  contentsWithShelfRenderer.forEach((content) => {
    const horizontalRenderer =
      content.shelfRenderer.content.horizontalListRenderer;
    horizontalRenderer.items = horizontalRenderer.items.filter(
      (elm) => !elm.adSlotRenderer
    );
  });
}
