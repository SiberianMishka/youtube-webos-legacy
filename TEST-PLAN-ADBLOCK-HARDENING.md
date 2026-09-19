# AdBlock hardening TV test plan

## Scope

Test `fix/adblock-hardening` only. The IPK keeps package ID
`youtube.leanback.v4` and version `0.3.2`; do not merge this branch into
`webos-1-2-legacy` as part of the test.

Before installing, record that the current legacy app can start playback. Do
not enter, export or record account credentials.

## Test sequence

1. Install the branch-named test IPK and launch `youtube.leanback.v4`.
2. Login: confirm existing automatic sign-in remains available. If sign-in is
   required, the TV owner performs it; do not capture credentials.
3. Home and Search with AdBlock on: open Home, search for a common query,
   browse results and start one result. Home/Search must remain usable and
   obvious ad slots must not be shown.
4. Normal video with AdBlock on: play for at least two minutes, then
   pause/resume and seek backward and forward. Start a second video through
   in-app navigation. No new error screen, QR-code failure or persistent
   playback interruption is acceptable.
5. Shorts with AdBlock on: open a Shorts shelf or reel, move through at least
   three entries and return to normal browsing. No reel ad should play and
   navigation must remain responsive.
6. AdBlock off: use the GREEN-button setting, restart the app, repeat Home,
   Search and a short normal-video playback. The app must not crash or add
   persistent player-error state. The fixture test covers absence of
   `isInlinePlaybackNoAd` in outgoing player requests; ads are not required to
   appear for this TV test to pass.
7. AdBlock on again: restart the app and repeat one normal-video start. This
   confirms the setting can be toggled without leaving playback in a broken
   state.

## Evidence and outcome

Record pass/fail for login, Home/Search, normal video, Shorts, AdBlock on/off
and each of: start, navigation, pause/resume and seek. If a failure occurs,
record only the visible symptom, the active AdBlock setting and the step
number; do not record account data. Keep the previous known-good IPK available
for manual rollback.
