# Work Log

A small work-log app: add entries, keep them on the device while offline, and sync them to a server. The server is fake and lives in memory inside the app, so nothing needs to be running besides Expo.

- **Expo SDK:** 58 (`expo ~58.0.24`, React Native 0.88, React 19, Expo Router, TypeScript strict)
- **Time spent:** _TODO (Harshit to fill in)_

## Commands

Node 22.13 or later is required by this SDK.

| | |
|---|---|
| Install | `npm install` |
| Start | `npx expo start`, then `w` for web, `i` for iOS, `a` for Android |
| Start on web only | `npm run web` |
| Development build (needed for `worklog://`) | `npx expo run:ios` or `npx expo run:android` |
| Test | `npm test` |
| Device tests (Android, needs [Maestro](https://maestro.mobile.dev)) | `npm run e2e:build:android`, then `npm run e2e` |
| Type-check | `npm run typecheck` |

`expo-dev-client` is installed, so `npx expo start` opens a development build by default. Press `s` in the terminal to switch to Expo Go.

## Trying it by hand

The list screen has a **Sync** button and, at the bottom, a **Fake server** panel. The panel is a reviewer's tool that drives the server's test handles:

| To see | Do this |
|---|---|
| `Waiting to sync` | Set Network to **Offline**, add an entry. Set it back to **Auto** or **Online** and the entry syncs by itself. |
| `Server copy kept` | Open `srv_1`, tap **Edit**, change the note, **Save draft**. The edit is dropped and the row keeps `Lobby`. |
| One refresh | Tap **Expire access token**, then **Sync**. "Refresh calls so far" goes up by one and the sync succeeds. |
| `Session expired` | Turn on **Fail retry after refresh**, tap **Expire access token**, then **Sync**. |
| `You already have this category on this date` | Add an `inspection` entry dated `2026-06-01`. |

Network **Auto** follows the device's real connection (airplane mode works). **Online** and **Offline** override it.

### Deep link

`worklog://entries/srv_1` opens the detail screen. A custom scheme does not work in Expo Go, so use a development build:

```sh
# iOS simulator
xcrun simctl openurl booted "worklog://entries/srv_1"
# Android emulator or device
adb shell am start -W -a android.intent.action.VIEW -d "worklog://entries/srv_1"
```

Run the command with the app open (warm start) and again after closing the app (cold start). On web, open `/entries/srv_1` directly. An unknown id, for example `/entries/nope`, shows `Entry not found` with a **Back to list** button.

## Test handles

Exported from [`src/api/fakeServer.ts`](src/api/fakeServer.ts):

| Handle | What it does |
|---|---|
| `setOnline(online: boolean)` | Puts the server online or offline. Offline calls reject like a failed `fetch`. |
| `expireAccessToken()` | The next authorised call returns 401. |
| `failRetryAfterRefresh(fail = true)` | The retry after a refresh returns 401 too. Pass `false` to turn it off. |
| `getServerEntries()` | Returns a copy of the entries the server holds. |
| `getRefreshCount()` | Returns how many times the refresh route was called. |
| `resetServer()` | Back to the start: only `srv_1`, `access_1` accepted, online, zero refreshes. |

`sync` is exported from [`src/sync.ts`](src/sync.ts) and returns `{ status, message, outcomes }`. `message` is `Server copy kept`, `Session expired`, `Waiting to sync` or `null`.

## Tests

`npm test` runs Jest with the `jest-expo` preset. No device is involved: `expo-secure-store` is replaced by [`__mocks__/expo-secure-store.ts`](__mocks__/expo-secure-store.ts), and AsyncStorage and NetInfo by the mocks their packages ship. The fake server and the sync code are the real ones.

| File | Covers |
|---|---|
| `__tests__/sync.conflict.test.ts` | **Submitted row.** A queued edit to `srv_1` is dropped, the server note stays `Lobby`, the result says `Server copy kept`. |
| `__tests__/sync.refresh.test.ts` | **One refresh.** Expired token: one refresh, retry succeeds with `access_2`. Retry also 401: `Session expired`, still one refresh. |
| `__tests__/draftRestore.test.tsx` | **Draft restore.** Fill the form through the screen, unmount, mount a new tree, values are back. Clear draft empties it. |
| `__tests__/sync.offline.test.ts` | Extra: offline changes stay queued with `Waiting to sync` and go out once online. |
| `__tests__/entryRoute.test.tsx` | Optional: the detail route for `srv_1` and for an unknown id. |

### On a device

The flows in [`e2e/`](e2e/) drive the installed app with [Maestro](https://maestro.mobile.dev) (`brew install mobile-dev-inc/tap/maestro`). They are separate from Jest and are not part of `npm test`.

```sh
npm run e2e:build:android   # release build onto the running emulator; needs several GB of free disk
npm run e2e                 # all flows
maestro test e2e/02-deep-link.yaml   # one flow
```

The release variant is used so that no Metro server or development launcher is involved and a cold start is a real one. It replaces the development build on the emulator; `npm run android` puts that back. Every flow starts by clearing the app's data, which also restarts the in-memory server.

| Flow | Covers |
|---|---|
| `01-list-and-detail` | `srv_1` is listed after the first sync; its row opens the detail screen with all five fields. |
| `02-deep-link` | `worklog://entries/srv_1` with the app open and with the app stopped; back from a cold start lands on the list. |
| `03-entry-not-found` | An unknown id, cold and warm: `Entry not found`, then back to the list. |
| `04-form-validation` | `Use 15-minute steps`, the range message for 10 and 735, no message for 15 and 720, a date that does not exist, saving without a category. |
| `05-draft-restore` | The form comes back after leaving the screen and after killing the app; Clear draft survives a restart too. |
| `06-duplicate-warning` | A second inspection on 2026-06-01 warns, and still saves. |
| `07-offline-queue` | Offline (panel override): `Waiting to sync`, Sync keeps the row, going online sends it without a tap; a queued change survives killing the app. |
| `08-server-copy-kept` | Editing `srv_1` ends with `Server copy kept` and the note still `Lobby`, on the detail screen and on the list. |
| `09-token-refresh` | Expired token: one refresh. Retry rejected: `Session expired` and exactly one more refresh. |
| `10-airplane-mode` | Real airplane mode on the emulator: the app goes offline, queues, and syncs by itself when the connection returns. |

Last run: all ten passed on an Android 16 emulator (Pixel 8, API 36), 2026-11-12. They have not been run on iOS; flow 10 does nothing there, because Maestro cannot switch airplane mode on iOS.

## How it is put together

```
app/                 routes only: read params, call the router
  index.tsx          list
  new.tsx            new entry
  entries/[id].tsx   detail (the deep-link target)
  entries/[id]/edit.tsx
src/
  screens/           the four screens; navigation comes in as callbacks
  components/        form, row, buttons, the fake-server panel
  sync.ts            the sync engine
  store.ts           what screens read: cached server rows + queue
  network.ts         real connection (NetInfo) plus the panel's override
  api/client.ts      typed calls and the refresh-once rule
  api/fakeServer.ts  the in-memory server and its test handles
  storage/           tokens, draft form, queue, cache
```

The client talks to the fake server through `fakeFetch(path, init)`, which has the shape of `fetch`: method, path, headers and JSON body in, status and JSON body out, and it rejects while offline. Swapping in a real backend means changing one line in `src/api/client.ts`.

What is stored on the device:

| Key | Store | Holds |
|---|---|---|
| `access_token`, `refresh_token` | `expo-secure-store` | Start as `access_1` and `refresh_ok`; written at every launch as a stand-in for sign-in. |
| `draft_form` | AsyncStorage | The in-progress new-entry form, written on every change. |
| `sync_queue` | AsyncStorage | Changes the server has not taken yet, oldest first. |
| `entries_cache` | AsyncStorage | The last list received from the server. |

Other documents: [`CONFLICTS.md`](CONFLICTS.md) for the conflict rule, [`RELEASE.md`](RELEASE.md) for release and updates, [`decisions.md`](decisions.md) for every decision taken and where the brief was open to more than one reading.

## Missing or limited

- **The server forgets on restart.** It is in memory, so restarting the app resets it to `srv_1`. The device keeps its queue, but entries that were already synced are gone after the first sync of the new run.
- **`worklog://` needs a development build.** Expo Go does not register custom schemes.
- **Web token storage is not secure.** `expo-secure-store` has no web implementation, so on web the two tokens go to `localStorage`.
- **`Session expired` has no sign-in screen.** There is no real sign-in. The queued change is kept, and tapping Sync again is a new attempt that may refresh once more.
- **`Server copy kept` is not saved.** The notice stays on the row until the app restarts or the entry is edited again.
- **The date is typed, not picked.** It must be a real date in `YYYY-MM-DD`.
- **No delete.** An entry cannot be removed.
- **No ESLint or CI.**

## A better setup for session expiry

The brief models an expired session as a `401` on the retry: the access token expires, the refresh succeeds, and the call made with the new token is refused as well. `failRetryAfterRefresh()` exists to produce that, and the app shows `Session expired` for it, as asked.

On a real backend that sequence is unusual. A refresh that succeeds returns a token that works. A session ends when the **refresh token** stops being valid, so the `401` that means "session expired" comes from the refresh request itself, and there is no retry to make.

A better setup would be:

1. A call returns `401`. The access token has expired.
2. The app calls refresh once.
3. If refresh returns a new access token, the app stores it and retries the call once.
4. If refresh itself returns `401`, the refresh token is no longer valid. The app shows `Session expired`, keeps the queue, and sends the user to sign in.

The app already treats step 4 as `Session expired` (there is a test for a refused refresh token in `__tests__/sync.refresh.test.ts`), but the fake server has no handle to expire the refresh token. The better setup would add one, for example `expireRefreshToken()`, and use it in place of `failRetryAfterRefresh()`. A `401` on the retry would then be treated as an ordinary failed request, not as the end of the session.

<!-- TODO (Harshit): before sending, note here anything from the brief that was not checked by hand, for example warm and cold deep link on each platform. -->
