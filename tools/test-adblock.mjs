import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const presetEnv = require('@babel/preset-env');

const source = readFileSync(
  new URL('../src/adblock.js', import.meta.url),
  'utf8'
);
const compiled = transformSync(source, {
  babelrc: false,
  configFile: false,
  filename: 'src/adblock.js',
  presets: [[presetEnv, { modules: 'commonjs', targets: { chrome: '38' } }]]
}).code;

function loadAdBlock(enableAdBlock) {
  const context = vm.createContext({
    console: { info() {}, warn() {} },
    exports: {},
    module: { exports: {} },
    require(specifier) {
      if (specifier === './config') {
        return { configRead: () => enableAdBlock };
      }
      throw new Error(`Unexpected import: ${specifier}`);
    }
  });

  vm.runInContext(compiled, context, { filename: 'src/adblock.js' });
  return vm.runInContext('JSON', context);
}

function testPlayback() {
  const hookedJSON = loadAdBlock(true);
  const response = hookedJSON.parse(
    JSON.stringify({
      adPlacements: [{ id: 'placement' }],
      adSlots: [{ id: 'slot' }],
      playerAds: [{ id: 'player-ad' }],
      videoDetails: { videoId: 'video' }
    })
  );

  assert.equal(response.adPlacements.length, 0);
  assert.equal(response.adSlots.length, 0);
  assert.equal(response.playerAds.length, 0);
  assert.equal(response.videoDetails.videoId, 'video');

  const request = {
    playbackContext: {
      contentPlaybackContext: { signatureTimestamp: 123 }
    }
  };
  const serialized = hookedJSON.stringify(request);
  const serializedRequest = JSON.parse(serialized);

  assert.equal(
    serializedRequest.playbackContext.contentPlaybackContext
      .isInlinePlaybackNoAd,
    true
  );
  assert.equal(
    serializedRequest.playbackContext.contentPlaybackContext.signatureTimestamp,
    123
  );
}

function testSearchAndShorts() {
  const hookedJSON = loadAdBlock(true);
  const response = hookedJSON.parse(
    JSON.stringify({
      contents: {
        sectionListRenderer: {
          contents: [
            { adSlotRenderer: { id: 'search-ad' } },
            {
              shelfRenderer: {
                content: {
                  horizontalListRenderer: {
                    items: [
                      { adSlotRenderer: { id: 'shelf-ad' } },
                      { tileRenderer: { id: 'search-result' } }
                    ]
                  }
                }
              }
            },
            { itemSectionRenderer: { id: 'results' } }
          ]
        }
      },
      entries: [
        {
          command: {
            reelWatchEndpoint: { adClientParams: { isAd: true } }
          }
        },
        {
          command: {
            reelWatchEndpoint: { adClientParams: { isAd: false } }
          }
        },
        { command: { reelWatchEndpoint: { videoId: 'short' } } }
      ]
    })
  );

  const contents = response.contents.sectionListRenderer.contents;
  assert.equal(contents.length, 2);
  assert.equal(
    contents[0].shelfRenderer.content.horizontalListRenderer.items.length,
    1
  );
  assert.equal(
    contents[0].shelfRenderer.content.horizontalListRenderer.items[0]
      .tileRenderer.id,
    'search-result'
  );
  assert.equal(response.entries.length, 2);
}

function testLoginAndDisabledAdBlock() {
  const hookedJSON = loadAdBlock(true);
  const loginPayload = {
    context: { client: { clientName: 'TVHTML5' } },
    deviceCode: 'test-device-code'
  };

  assert.equal(
    hookedJSON.stringify(loginPayload),
    JSON.stringify(loginPayload)
  );
  assert.deepEqual(
    JSON.parse(hookedJSON.stringify(loginPayload)),
    loginPayload
  );

  const disabledJSON = loadAdBlock(false);
  const response = disabledJSON.parse(
    JSON.stringify({
      playerAds: [{ id: 'player-ad' }],
      entries: [
        {
          command: {
            reelWatchEndpoint: { adClientParams: { isAd: true } }
          }
        }
      ]
    })
  );
  const request = {
    playbackContext: { contentPlaybackContext: {} }
  };

  assert.equal(response.playerAds.length, 1);
  assert.equal(response.entries.length, 1);
  assert.equal(
    JSON.parse(disabledJSON.stringify(request)).playbackContext
      .contentPlaybackContext.isInlinePlaybackNoAd,
    undefined
  );
}

testPlayback();
testSearchAndShorts();
testLoginAndDisabledAdBlock();

console.log('AdBlock playback, search/Shorts and login fixtures passed.');
