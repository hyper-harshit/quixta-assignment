# Release

Setup lives in `app.json` and `eas.json`. The EAS release was tested on a personal EAS project (account - hyper-code).

## Versioning

| Number | Where | Who bumps it | When |
|---|---|---|---|
| Store version | `version` in `app.json` (`1.0.0`) | A developer, in the release PR | Every store release |
| Build number | `ios.buildNumber`, `android.versionCode` | EAS (`appVersionSource: "remote"`, `autoIncrement` on the production profile) | Every production build; nobody edits it by hand |
| Runtime version | `runtimeVersion: { "policy": "appVersion" }` | Nobody directly; it equals the store version | Whenever the store version changes |

An update only reaches binaries with the same runtime version. So the one rule to remember is: **a native change needs a version bump and a store build.** With this policy that rule is kept by people, in review. If it is ever missed, the `fingerprint` policy takes the judgment out by deriving the runtime version from the native code.

Each build profile is tied to a channel of the same name: `development`, `preview`, `production`.

## OTA update or store build

**OTA** (JavaScript and assets only):

1. Changing a validation rule or a message, for example the 720-minute limit in `src/validation.ts` or a string in `src/messages.ts`.
2. Changing how sync behaves, for example the conflict handling in `src/sync.ts` or the retry rule in `src/api/client.ts`.

**Store build** (native code or native config changed):

1. **Adding a local notification library** such as `expo-notifications`. It brings a native module, a permission and a config plugin. Bump the version, build, release. The JavaScript that calls it must never go over the air to the old binaries, and the version bump is what prevents that.
2. Changing `scheme`, `ios.bundleIdentifier`, `android.package` or the `plugins` list in `app.json`, or upgrading the Expo SDK.

Quick test: if the diff touches a native dependency in `package.json` or a native field in `app.json`, it is a store build.

## Staged rollout and rollback

Every change goes to the `preview` channel and internal testers first.

- **Binary.** Android: staged rollout in Play Console, 5% → 20% → 50% → 100%. iOS: phased release over seven days. Watch crashes and sync failures between steps.
- **OTA.** `eas update --channel production --rollout-percentage 10`, then raise it with `eas update:edit`.

Rolling back:

- **OTA.** `eas update:rollback` puts the channel back on the previous update, or on the bundle that shipped in the binary. Devices pick it up at next launch.
- **Binary.** A store build cannot be recalled. Halt the Play rollout and pause the phased release so no new users get it, then ship a fix. If the bug is in JavaScript, an OTA update to that runtime version is the faster fix.

One rule that is specific to this app: the offline queue is stored on the device (`sync_queue`). A rollback runs old code against data written by new code, so any change to the stored shape must be readable by both versions.

## Apple rejects two days before a promised date

1. **Read the reason and sort it** the same hour: a question or metadata problem, or a problem with the binary.
2. **Metadata or a question:** answer in App Store Connect, fix the listing, resubmit the same build. This is usually hours.
3. **Binary:** fix, build again (same version, new build number), resubmit, and ask for an expedited review with the business reason. It is a request, not a guarantee.
4. **Tell whoever was promised the date, that day:** what Apple said, what we are doing, the realistic date, and the fallback.
5. **Fallback:** release Android on time. Give the iOS users who were promised it a TestFlight build. If part of the work is JavaScript only, send that part as an OTA update to the version already approved.
6. **Do not** hide the rejected feature behind a remote switch to get it through review.

Afterwards, submit earlier. Review is the one step we do not control, so the buffer goes there.

## Local notification before a work-log deadline

- **Trigger.** A date trigger in device local time, set ahead of the deadline, for example two hours before. Schedule it when the device has a draft for that period. Cancel it when the entry is submitted or the draft is removed. Use one notification per deadline with a fixed identifier, so rescheduling replaces it and never duplicates it.
- **Permission.** Ask when the user turns reminders on, after one line that explains why. Never at launch. iOS shows its prompt once, so it must not be wasted. Android 13 and later needs the runtime notification permission.
- **If denied.** Leave the setting off and do not ask again in a loop. Show the reminder inside the app on the list screen, and offer a link to system settings.
- **What not to schedule while offline.** Anything that depends on a fact only the server has. Do not remind about a deadline the device has not fetched. Do not send "you have not submitted" while a submit is in the queue: the user has done their part. And do not promise a result, such as "your entry will be synced by 5 pm". Schedule only from what the device knows for certain: there is a local draft for this date.
