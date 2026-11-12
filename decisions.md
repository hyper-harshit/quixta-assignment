# Work Log assignment: plan and decisions

Each decision has an ID (D1, D2, ...) so it can be overridden by number. Decisions changed after review are marked **(revised)**; decisions confirmed in review are marked **(confirmed)**.

## 1. What the assignment asks for

An Expo + Expo Router + TypeScript app: a work log with a new-entry form, a list, and an entry detail screen. The API is an in-memory fake inside the app. Five behaviours are graded:

1. **Offline drafts.** Changes are queued on the device while the server cannot be reached, shown as `Waiting to sync`, and never dropped.
2. **One token refresh.** On a 401, refresh once, store `access_2`, retry the call once. If the retry is also 401, show `Session expired` and stop.
3. **Submitted rows are the server's.** A queued edit for an id that is already submitted on the server is dropped, and the screen shows `Server copy kept`.
4. **Deep link.** `worklog://entries/srv_1` (and `/entries/srv_1` on web) opens the detail screen, from running and from closed. Unknown id shows `Entry not found` with a way back.
5. **Release readiness.** App config and `eas.json` set up for EAS Build and EAS Update, plus a one-page `RELEASE.md`.

Deliverables: the app, three required tests that run without a device, `CONFLICTS.md`, `RELEASE.md`, and a `README.md` with install, start and test commands, the Expo SDK version, time spent, and the test handle names.

## 2. Build order

1. Scaffold, dependencies, Jest config, secure-store mock
2. Types, validation, fake server with test handles, API client with refresh
3. Storage helpers, queue, `sync`
4. Required tests 1 and 2 (sync only, no UI)
5. Screens: list, new entry, detail, edit; draft persistence; network listener
6. Required test 3 (draft restore), optional detail-route test
7. `app.json`, `eas.json`, `RELEASE.md`, `CONFLICTS.md`, `README.md`

Required behaviour and required tests come before the optional test and the fake-server panel.

## 3. Decisions

### 3.1 Tooling

| ID | Decision | Reason |
|---|---|---|
| D1 | **Expo SDK 58** (current `latest` on npm). | Reviewers will install today; Expo Go and EAS default to the current SDK. |
| D2 | **npm** as package manager, Node 22.14. | Already on the machine; one lockfile. |
| D3 | Scaffold from **`blank-typescript`** and add Expo Router by hand. | The default template ships tabs and demo screens that would have to be deleted. |
| D4 | Project root is this folder (`quixta/`). | Keeps the hand-in at the repo root. |
| D5 | **Jest + `jest-expo` + `@testing-library/react-native`**. | The Expo-supported path; `expo-router/testing-library` only works with Jest. |
| D6 | No state library, no UI kit, no date picker. Plain `StyleSheet`, a small module store read with `useSyncExternalStore`. | Visual design is out of scope; fewer native dependencies means fewer build risks. |
| D7 | TypeScript `strict`. No ESLint setup. | Lint config is not graded. |
| D63 | Local git repository. | Changed during the build |

Dependencies beyond the template, and why each is there:

| Package | Why |
|---|---|
| `expo-router` and its peers | Required stack. |
| `expo-secure-store` | Required for the two tokens. |
| `@react-native-async-storage/async-storage` | The "other on-device store" for `draft_form`, the offline queue and the cached entries. Secure store is for small secrets, and it has no web implementation. |
| `@react-native-community/netinfo` | Real network status (D31). |
| `expo-updates` | The `updates` and `runtimeVersion` settings and the `channel` in `eas.json` only do anything when this library is in the build. Without it the EAS Update setup would be decorative. |
| `expo-dev-client` | The `development` EAS profile uses `developmentClient: true`, which needs it. It is also the way to open `worklog://` on a device, because Expo Go only answers to `exp://`. |
| `react-dom`, `react-native-web`, `@expo/metro-runtime` | Needed to run the app in a browser at all. The brief's deep-link section says "On Expo web, `/entries/srv_1` does the same", and the deep link is graded (D19). |

All are installed with `npx expo install` so versions match the SDK.

### 3.2 Code layout

```
app/                      route files only: read params, wire navigation
  _layout.tsx             Stack; starts the app (session, cache, network, first sync)
  index.tsx               list
  new.tsx                 new entry
  entries/[id].tsx        entry detail
  entries/[id]/edit.tsx   edit entry
  +not-found.tsx
src/
  types.ts                Entry, QueuedOp, SyncResult, FormValues
  messages.ts             every user-facing string from the brief, as constants
  validation.ts           duration, date, category rules
  api/
    fakeServer.ts         in-memory server, fetch-shaped entry point, test handles
    client.ts             typed API calls; the refresh-once logic lives here only
  storage/
    secure.ts             expo-secure-store wrapper (web fallback)
    tokens.ts             access_token, refresh_token
    draftForm.ts          draft_form
    queue.ts              offline queue
    entriesCache.ts       last server snapshot
  sync.ts                 exports sync()
  network.ts              device network status + manual override
  store.ts                in-memory view state for the screens
  bootstrap.ts            start-up sequence
  screens/                EntryListScreen, NewEntryScreen, EntryDetailScreen, EditEntryScreen
  components/             EntryForm, EntryRow, ServerPanel
__tests__/                the tests (kept out of app/ so they are not routes)
__mocks__/expo-secure-store.ts
```

| ID | Decision | Reason |
|---|---|---|
| D8 | Layers with one-way dependencies: route files → screens → store / sync → API client + storage → fake server. Screens do not import the fake server; only the control panel and the network module use its handles. | "How the code is split" is graded. |
| D9 | All strings quoted in the brief live in `src/messages.ts` and are used verbatim by screens and tests. | One place to check the exact wording. |
| D64 | Screen components live in `src/screens` and take navigation as callback props. Files in `app/` only read route params and call the router. | Screens can be rendered in tests without a navigation container. |

### 3.3 Data model and fake server

| ID | Decision | Reason |
|---|---|---|
| D10 | `Entry = { id, category, date, durationMinutes, note, status }` exactly as in the brief. | |
| D11 | **The device generates ids** for new entries, as `srv_<n>`: one more than the highest number among the entries it knows (synced and queued). The server keeps that id. | A queued submit, the list row and a deep link can refer to the entry before it has synced, with no id remapping. Numbering on the device is safe here because there is one device and one user; with several devices the server would have to assign the number. |
| D12 | **(revised)** The client talks to the server in HTTP terms: method, path, `Authorization: Bearer` header, JSON body, status code. The fake server exposes one fetch-shaped function, `fakeFetch(path, init)`, that returns `{ status, ok, json() }` and rejects like `fetch` does when the network is down. The global `fetch` is not touched and nothing leaves the device. | The server lives in the same JavaScript process, so data reaches it by a function call, not over a socket. Keeping the call shaped like `fetch` means moving to a real backend is a one-line swap of the transport in `client.ts`. |
| D13 | Routes: `GET /entries`, `PUT /entries/:id` (save draft), `POST /entries/:id/submit`, `POST /auth/refresh`. | |
| D14 | **(confirmed, status-based)** `PUT` and `submit` are upserts by id. If the server row is already **submitted**, both return 409 with the server copy, whether the change was made online or offline. Otherwise `PUT` creates or overwrites the draft, and `submit` creates the row if missing and marks it submitted. | "Submitted rows belong to the server." Changes to drafts, including ones queued offline, are always applied, so nothing queued offline is lost. |
| D15 | Token model: the server accepts `access_1` at start. `expireAccessToken()` makes every call return 401 until a refresh, after which `access_2` is accepted. `failRetryAfterRefresh()` makes calls with the refreshed token return 401 too. | Matches the two halves of the refresh test. |
| D16 | `refresh` succeeds only for `refresh_ok`, returns `access_2`, and the counter counts **every call** to the refresh route. | "Read how many times refresh ran." |

Test handles, exported from `src/api/fakeServer.ts`:

| Handle | Does |
|---|---|
| `setOnline(online: boolean)` | puts the server online or offline |
| `expireAccessToken()` | the next call returns 401 |
| `failRetryAfterRefresh(fail = true)` | the retry after a refresh returns 401 as well |
| `getServerEntries()` | returns a copy of the server's entries |
| `getRefreshCount()` | number of refresh calls |
| `resetServer()` | back to the seed state (`srv_1`, `access_1`, online, counter 0); extra, for test isolation |

### 3.4 Storage

| ID | Decision | Reason |
|---|---|---|
| D17 | **(revised)** Only `access_token` and `refresh_token` go in **expo-secure-store**. | They are the only secrets. |
| D18 | **(revised)** `draft_form`, the offline queue (`sync_queue`) and the last server snapshot (`entries_cache`) go in **AsyncStorage**. | The brief allows "another on-device store" for the form and the queue. None of it is secret, the queue grows with every offline change, and AsyncStorage also works on web. |
| D19 | **(kept, with reason)** The app runs on web, and `src/storage/secure.ts` falls back to `localStorage` there for the two tokens. | The brief says "On Expo web, `/entries/srv_1` does the same", under a graded item. Supporting it costs three packages and this one fallback. The fallback is not secure storage and the README says so. |
| D20 | On every launch the app writes `access_1` and `refresh_ok` to secure store. | This stands in for sign-in. The in-memory server restarts at `access_1` with each launch, so the device has to start there too. |
| D21 | `draft_form` holds `{ category, date, duration, note }` with duration as the raw typed text. It is written on every field change, with writes chained so they land in order. No debounce. | A debounce can lose the last keystroke on unmount. |

### 3.5 Queue and sync

| ID | Decision | Reason |
|---|---|---|
| D22 | Two queued operation kinds, matching the brief: `saveDraft` and `submit`. Each carries the full entry. An edit is a `saveDraft` for an id that already exists. | "Save draft queues a draft. Submit queues a submit." |
| D23 | The queue is FIFO with no merging of operations. Every change goes through the queue, online or offline. | "Both try to sync straight away." One path to test. |
| D24 | `sync()` pushes the queue in order, then pulls `GET /entries` and replaces the cache. It takes no arguments. | A sync with an empty queue still makes an authorised call, and a cold-start deep link gets fresh data. |
| D25 | **(revised)** Only one sync runs at a time. A call that arrives while one is running waits for it, then runs once more; all waiting callers share that one extra run. | A change saved during a running sync must not be left behind. |
| D26 | **Offline:** the first failed request stops the run. Every queued operation stays. Result status `offline`; affected rows show `Waiting to sync`. | |
| D27 | **Conflict (409):** the operation is removed from the queue, the cache takes the server copy, the row shows `Server copy kept`, and the run continues with the next operation. | The conflict rule. |
| D28 | **Session expired:** the run stops, the operation that failed and everything after it stay queued, result status `session_expired`. | Losing work because of an auth failure would be worse than keeping it. |
| D29 | `SyncResult = { status: 'synced' \| 'offline' \| 'session_expired', message, outcomes[] }`, where each outcome is `{ entryId, kind, result: 'applied' \| 'server_copy_kept' \| 'waiting', message }`. | Tests assert on the result; screens render from it. |
| D30 | The list is the server snapshot with the queue applied on top. A row with a queued operation shows `Waiting to sync`. `Server copy kept` stays on a row until a new change is queued for that id or the app restarts. | |
| D31 | **(revised)** A real network listener (`@react-native-community/netinfo`) drives sync. When the device goes offline the fake server becomes unreachable, so a running sync stops at its next request and queued changes wait. When the device comes back online a sync starts on its own. Sync also runs on app start, after Save draft, after Submit, and from the Sync button. | Sync follows the real network even though the server is fake. |
| D65 | `src/network.ts` holds two things: the device status from NetInfo and an override (`auto`, `online`, `offline`). The effective status is the device status in `auto`, otherwise the override. The effective status is what sets the fake server reachable or not. `sync()` itself does not read NetInfo; it only sees requests fail. | The sync engine stays testable with the `setOnline` handle alone, and the same code path serves real and forced offline. |

### 3.6 Token refresh

| ID | Decision | Reason |
|---|---|---|
| D32 | One helper in `src/api/client.ts` wraps every authorised call: call; on 401 call refresh once, store `access_2`, call again; if that is 401, throw `SessionExpiredError`. There is no loop. | "Once and stops" is enforced by structure, in one place. |
| D33 | If the refresh call itself is rejected (stored refresh token is not `refresh_ok`), that is also `Session expired`, with no retry. | |
| D34 | **(confirmed)** "Once" is per operation. After `Session expired`, a later sync started by the user counts as a new sign-in attempt and may refresh once again. | The brief says "don't call refresh again for that operation". |

### 3.7 Screens and form

| ID | Decision | Reason |
|---|---|---|
| D35 | Four screens: list (`/`), new entry (`/new`), detail (`/entries/[id]`), edit (`/entries/[id]/edit`). | Leaving `/new` and coming back is the remount the brief describes. |
| D36 | Category is three tappable options. Date and Duration are text inputs (duration in minutes). Note is a multiline input. One `EntryForm` component serves both new and edit. | No picker dependencies. |
| D37 | Duration validation order: empty, not a number, under 15 or over 720 → `Duration must be between 15 minutes and 12 hours`; otherwise not a whole multiple of 15 → `Use 15-minute steps`. So 10 and 725 give the range message, 20 and 22.5 give the step message. | Both messages would apply to 10; range is the more useful one. |
| D38 | A field's error shows once the field has content or a save was attempted. Category missing shows `Choose a category`; a bad date shows `Use the format YYYY-MM-DD` (real calendar dates only). Note is optional. | These two extra strings are mine; the brief does not give them. |
| D39 | The empty form is truly empty: no category selected, no default date. | Test 3 says clearing the draft "leaves the form empty". |
| D40 | `You already have this category on this date` is a non-blocking warning. It shows as soon as category and date match another row, and again in the confirmation after saving. Applies to Submit too. | The brief says the save is allowed. |
| D41 | New entry, after Save draft or Submit: the operation is queued, `draft_form` is removed, the form resets, sync runs, and the screen stays on the form with a one-line result. | The user sees the outcome and any duplicate warning. |
| D42 | **(revised)** A separate **edit screen** edits all four fields of an existing entry, with Save draft and Submit. It is offered for every entry, including submitted ones, with a line saying the server copy wins for submitted entries. Saving returns to the detail screen. It does not use `draft_form`. | This is how the conflict rule shows on screen: edit `srv_1`, save, and the row comes back with `Server copy kept` and the note still `Lobby`. The device does not pre-judge; the rule is applied in one place, at sync. |
| D43 | **(revised)** The list screen has a **Fake server** panel. Network: `Auto` (follow the device, the default), `Online`, `Offline`. Plus "Expire access token", a "Fail retry after refresh" switch, and the refresh count. | Auto is the real behaviour; the override lets a reviewer force each state without turning off Wi-Fi. |

### 3.8 Deep link

| ID | Decision | Reason |
|---|---|---|
| D44 | Rely on Expo Router's file-based linking with `scheme: "worklog"`. No manual `Linking` listeners. | `worklog://entries/srv_1` maps to `app/entries/[id].tsx` for both warm and cold start. |
| D45 | The root layout starts the app (session, cache, network, first sync). The detail screen shows a loading state until the entry is found or the first sync has finished, and only then shows `Entry not found`. | On a cold start the detail screen is the first screen and has no data yet. |
| D46 | The Stack is anchored on the list, and "Back to list" (`src/navigation.ts`) uses `router.dismissAll()` when there are screens underneath and `router.replace('/')` when there are not. The detail screen shows "Back to list" for a found entry too. | A cold-start deep link may have no screen to go back to. |
| D47 | Web output is `single` (SPA) with the Metro bundler. | `/entries/srv_1` is a dynamic route with data that only exists at runtime. |
| D48 | A locally queued entry that the server has not seen yet opens in the detail screen too, with `Waiting to sync`. | |

The custom scheme does not work inside Expo Go. Checking `worklog://` needs a development build (`npx expo run:ios` or `run:android`), then:

```
xcrun simctl openurl booted "worklog://entries/srv_1"
adb shell am start -W -a android.intent.action.VIEW -d "worklog://entries/srv_1"
```

### 3.9 Release setup

| ID | Decision | Reason |
|---|---|---|
| D49 | Static **`app.json`**. | Nothing in the config is computed. |
| D50 | **(revised)** `name: "Work Log"`, `slug: "worklog"`, `scheme: "worklog"`, `version: "1.0.0"`, `ios.bundleIdentifier` and `android.package` both **`com.quixta.worklog`**. | |
| D51 | `runtimeVersion: { "policy": "appVersion" }`. | Easiest to explain and audit: the runtime version is the store version, so a native change means a version bump. `RELEASE.md` names the `fingerprint` policy as the next step. |
| D52 | `updates.url` and `extra.eas.projectId` hold the project id written by `eas init`. `checkAutomatically: "ON_LOAD"`, `fallbackToCacheTimeout: 0`. | The app starts on the cached bundle and picks up an update on the next launch. |
| D53 | `eas.json`: `development` (dev client, internal distribution), `preview` (internal distribution), `production` (`autoIncrement`), each with `channel` equal to the profile name. `cli.appVersionSource: "remote"`. | Build numbers are owned by EAS, so nobody bumps them by hand. |

`RELEASE.md` positions, one page:

- **Versioning.** A developer bumps `version` in the release PR. EAS increments `buildNumber` / `versionCode`. The runtime version follows `version`.
- **OTA examples:** a validation rule or message in `src/validation.ts`; the conflict handling in `src/sync.ts`.
- **Store-build examples:** adding a local notification library (native module, permission, config plugin); changing `scheme` or adding a config plugin in `app.json`; an Expo SDK upgrade.
- **Staged rollout and rollback.** Preview channel and internal testers first; Play staged rollout and App Store phased release for binaries; `eas update` with a rollout percentage for OTA. Roll back OTA by republishing the previous update; halt the store rollout and ship a fix build for binaries.
- **Apple rejection two days out.** Read the reason, answer in Resolution Center or fix metadata without a new build where possible, otherwise fix and resubmit with an expedited review request, tell stakeholders the same day, and have a fallback (Android on time, TestFlight for the promised users).
- **Deadline notification.** Date trigger ahead of the deadline, permission asked when the user turns reminders on and not at launch, in-app reminder plus a link to Settings if denied, and nothing scheduled offline from server facts the device cannot confirm.

### 3.10 Tests

| ID | Decision | Reason |
|---|---|---|
| D54 | `__mocks__/expo-secure-store.ts` is an in-memory map with a reset helper. AsyncStorage and NetInfo use their official Jest mocks. | Runs without a device. |
| D55 | Tests use the real fake server and the real `sync`; only device storage and NetInfo are mocked. Each test resets server, storage and store. | The tests exercise the same code the app runs. |
| D56 | **Test 1, submitted row:** seed, enqueue a `saveDraft` for `srv_1` with a new note, `sync()`, assert the server note is `Lobby`, an outcome for `srv_1` says `Server copy kept`, and the queue is empty. | |
| D57 | **Test 2, one refresh** (`__tests__/sync.refresh.test.ts`), each case from a fresh server: (a) expire the token, queue a draft, `sync()`; assert refresh count 1, stored `access_token` is `access_2`, the draft is on the server. (b) expire, turn on `failRetryAfterRefresh`, `sync()`; assert the count is exactly 1, the result is `Session expired`, and the operation is still queued. (c) a second `sync()` in the failing state refreshes once more (count 2, D34), and once the retry is allowed again the stored `access_2` works with no further refresh. (d) a stored refresh token other than `refresh_ok` is refused. | "Did not run a second time" is read as: never twice for one operation. |
| D67 | **Extra test** (`__tests__/sync.offline.test.ts`): offline, a queued change stays queued and its row says `Waiting to sync`; back online it is sent; a queued submit marks the server row submitted. | The offline rules are in the brief but not in its three required tests. |
| D58 | **Test 3, draft restore:** render the new-entry screen, fill all four fields, unmount, render a new tree, assert the four values; press Clear draft, assert the fields are empty and `draft_form` is gone. | Goes through the screen, the stronger of the two options the brief allows. |
| D59 | **Optional test 4:** render the detail route with `expo-router/testing-library` for `/entries/srv_1` and for an unknown id. | "Welcome", so it is last. |
| D66 | I run `npx tsc --noEmit` only. Jest and the app are run by Harshit, who reports the results. The one exception was the run on 2026-11-12, when Harshit lifted the rule until the Jest and device tests passed. | Agreed in review. |
| D68 | **Device tests** are Maestro flows in `e2e/`, one per behaviour in the brief, run against a release build on the Android emulator (`npm run e2e:build:android`, `npm run e2e`). They are separate from Jest. | Jest mocks storage, NetInfo and the native deep-link path, so only a device run checks cold-start links, a real restart and real airplane mode. A release build has no development launcher in front of a cold start. Maestro needs no code in the app beyond the `testID`s already there. |

### 3.11 Documents

| ID | Decision |
|---|---|
| D60 | `README.md`: install, start, test commands, Expo SDK version, time spent (filled in by Harshit), test handle names, deep-link commands, known limits. |
| D61 | `CONFLICTS.md`: the rule restated in plain words, with the cases worked through (edit to a submitted row, online and offline; draft created offline) and what the user sees. |
| D62 | Known limits to state in the README: the server is in memory, so restarting the app resets it to `srv_1` while the device keeps its queue; web token storage is not secure; `worklog://` needs a development build. |

## 4. Where the brief is open, and the reading taken

1. **"A queued edit" with only a new-entry form.** The brief tests an edit to `srv_1` but describes no edit screen. Reading: an edit is a `saveDraft` operation for an existing id (D22), made on a separate edit screen (D42).
2. **What triggers the conflict rule.** Considered: "edits made online win, edits queued offline lose". Not taken, because the brief keys the rule on the server row being submitted, routes every change through the queue, and says nothing queued offline is dropped. Reading: any change to an id the server has as submitted is dropped, online or offline; changes to drafts always apply (D14).
3. **"Refresh did not run a second time."** Reading: never twice for one operation (D34, D57). The test also covers the stricter reading from a fresh server.
4. **Submit without a prior draft.** Reading: Submit creates the row and marks it submitted in one operation (D14).
5. **Does `Session expired` drop the change?** Reading: no, it stays queued (D28).
6. **Where the tokens "start".** Reading: written at every launch, as a stand-in for sign-in (D20).
7. **"Leaves the form empty."** Reading: no defaults at all, including no default date (D39).
8. **Is web required?** Reading: yes, for the detail route at least, since the brief names Expo web in the deep-link section (D19).

## 5. Not doing

Real backend, real sign-in, push notifications or a working notification setup, publishing, queue compaction, visual polish, ESLint, CI.
