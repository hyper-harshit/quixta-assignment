# Device test cases

These are the test cases that were run on a device. Each one is a Maestro flow that drives the installed app the way a user would: tapping, typing, opening links and restarting the app.

## The run

| | |
|---|---|
| Date | 2026-11-12 |
| Device | Android emulator, Pixel 8, Android 16 (API 36) |
| App | Release build of `com.quixta.worklog` (no Metro server, no development launcher) |
| Tool | Maestro 2.12.1 |
| Result | **10 of 10 passed**, in 4 minutes 19 seconds |

Not covered by this run:

- **iOS and web.** The flows were run on Android only.
- **Changes made after the run.** The iOS top spacing, the ID field on the detail screen, and the `srv_<n>` ids for new entries were added later. The test cases below do not depend on them, but the run has not been repeated since.

Every test case starts from the same state: the app's data is cleared and the app is launched, so the device storage is empty and the in-memory server holds only `srv_1` (inspection, 2026-06-01, 60 minutes, note `Lobby`, submitted). The test waits until `srv_1` is on the list and the status reads `Up to date`.

## Summary

| ID | Test case | Result |
|---|---|---|
| TC-01 | The list row opens the detail screen | Passed |
| TC-02 | `worklog://entries/srv_1` opens the detail screen, warm and cold | Passed |
| TC-03 | An unknown id shows `Entry not found` and a way back | Passed |
| TC-04 | Form validation messages | Passed |
| TC-05 | The in-progress form survives leaving the screen and killing the app | Passed |
| TC-06 | Saving a duplicate category and date is allowed and warns | Passed |
| TC-07 | Offline changes wait in the queue and are sent once online | Passed |
| TC-08 | An edit to a submitted row is dropped and the server copy is kept | Passed |
| TC-09 | One refresh on 401, and `Session expired` when the retry fails too | Passed |
| TC-10 | A real loss of connection is detected, and sync restarts when it returns | Passed |

## TC-01: The list row opens the detail screen

| Step | Expected |
|---|---|
| Tap the `srv_1` row on the list. | The detail screen shows category `inspection`, date `2026-06-01`, duration `60 minutes`, note `Lobby`, status `submitted`. |
| Tap **Back to list**. | The list is shown, with the Sync button and the `srv_1` row. |

## TC-02: Deep link, warm and cold

| Step | Expected |
|---|---|
| **Warm.** With the app open on the list, open `worklog://entries/srv_1`. | The detail screen shows note `Lobby` and status `submitted`. |
| Tap **Back to list**. | The list is shown. |
| **Cold.** Stop the app, then open `worklog://entries/srv_1`. | The app starts on the detail screen, showing note `Lobby` and category `inspection`. |
| Press the system back button. | The list is shown with the `srv_1` row. The app does not close. |

## TC-03: Unknown id

| Step | Expected |
|---|---|
| **Cold.** Stop the app, then open `worklog://entries/does_not_exist`. | `Entry not found` is shown. |
| Tap **Back to list**. | The list is shown with the `srv_1` row. |
| **Warm.** With the app open, open `worklog://entries/also_missing`. | `Entry not found` is shown. |
| Tap **Back to list**. | The list is shown. |

## TC-04: Form validation messages

All steps are on the New entry screen.

| Step | Expected |
|---|---|
| Type `20` as the duration. | `Use 15-minute steps` |
| Replace it with `10`. | `Duration must be between 15 minutes and 12 hours`, and the 15-minute message is gone. |
| Replace it with `735`. | `Duration must be between 15 minutes and 12 hours` |
| Replace it with `720`. | No duration message. |
| Replace it with `15`. | No duration message. |
| Type `2026-02-30` as the date. | `Use the format YYYY-MM-DD` (the day does not exist). |
| Tap **Save draft** with no category chosen. | `Choose a category` is shown, and nothing is saved. |

## TC-05: Draft restore

| Step | Expected |
|---|---|
| On New entry, choose `repair`, and type date `2026-06-02`, duration `90`, note `Replaced valve`. Do not save. | |
| Go back to the list, then open New entry again. | All four values are back: `repair` selected, `2026-06-02`, `90`, `Replaced valve`. |
| Stop the app, start it again, and open New entry. | All four values are back again. |
| Tap **Clear draft**. | The form is empty and no category is selected. |
| Stop the app, start it again, and open New entry. | The form is still empty. |

## TC-06: Duplicate warning

| Step | Expected |
|---|---|
| On New entry, choose `inspection` and type date `2026-06-01` (the same as `srv_1`). | `You already have this category on this date` |
| Type duration `30` and note `Second visit`, then tap **Save draft**. | The result reads `Draft saved`, and the warning is still shown. |
| Go back to the list. | The `Second visit` row is listed next to `srv_1`, and nothing reads `Waiting to sync`. |

## TC-07: Offline queue

Offline is set with the server panel's network override at the bottom of the list.

| Step | Expected |
|---|---|
| Set the network to **Offline**. | The status reads `Offline`. |
| On New entry, choose `travel`, type date `2026-06-03`, duration `45`, note `Drive to site`, and tap **Submit**. | The result reads `Waiting to sync`. |
| Go back to the list. | The `Drive to site` row is listed and marked `Waiting to sync`. |
| Tap **Sync**. | The row is still there and still marked `Waiting to sync`. |
| Set the network to **Online**. Do not tap Sync. | `Waiting to sync` disappears by itself, the row stays, and the status reads `Up to date`. |
| Set the network to **Offline** again. On New entry, choose `repair`, type date `2026-06-04`, duration `120`, note `Queued before restart`, and tap **Save draft**. | The result reads `Waiting to sync`. |
| Stop the app and start it again. | The `Queued before restart` row is listed, and `Waiting to sync` disappears once the first sync has sent it. |

## TC-08: Server copy kept

| Step | Expected |
|---|---|
| Open `srv_1` and tap **Edit**. | The edit screen says the entry is already submitted. |
| Add ` changed on device` to the note and tap **Save draft**. | Back on the detail screen, the notice reads `Server copy kept`, the note is still `Lobby`, and the status is still `submitted`. |
| Tap **Back to list**. | The `srv_1` row shows `Server copy kept`. No row contains `changed on device`, and nothing reads `Waiting to sync`. |

## TC-09: Token refresh

The server panel at the bottom of the list has the controls and the refresh counter.

| Step | Expected |
|---|---|
| Look at the counter. | `Refresh calls so far: 0` |
| Tap **Expire access token**, then tap **Sync**. | The status reads `Up to date`, and the counter reads `Refresh calls so far: 1`. |
| Turn on **Fail retry after refresh**, tap **Expire access token**, then tap **Sync**. | The status reads `Session expired`, and the counter reads `Refresh calls so far: 2`: one more refresh for this sync, not two. |
| Turn the switch off and tap **Sync**. | The status reads `Up to date`, and the counter still reads `Refresh calls so far: 2`. |

## TC-10: Real airplane mode

Android only. Maestro cannot switch airplane mode on iOS.

| Step | Expected |
|---|---|
| Turn airplane mode on. | Within 20 seconds the status reads `Offline`. |
| On New entry, choose `repair`, type date `2026-06-05`, duration `60`, note `Made in airplane mode`, and tap **Save draft**. | The result reads `Waiting to sync`. |
| Go back to the list. | The `Made in airplane mode` row is listed and marked `Waiting to sync`. |
| Turn airplane mode off. Do not tap Sync. | Within 40 seconds `Waiting to sync` disappears by itself, the row stays, and the status reads `Up to date`. |

## Running them again

```sh
brew install mobile-dev-inc/tap/maestro   # once
npm run e2e:build:android                 # release build onto the running emulator
npm run e2e                               # all ten flows
```

The flows are in the `e2e/` folder, one file per test case (`01-list-and-detail.yaml` to `10-airplane-mode.yaml`).
