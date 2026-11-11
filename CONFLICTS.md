# Conflict rule

## The rule, in my words

An entry has one owner at a time, and its status says who.

- **Once the server holds an entry as submitted, the server's version is final.** If the device still has a change queued for that entry when it syncs, the change is thrown away. It is not merged and not retried. The device replaces whatever it was showing with the server's copy and tells the user: `Server copy kept`.
- **Until sync has created an entry on the server, the entry exists only on the device.** The device's version is the only version, so there is nothing to conflict with. The first sync creates it exactly as it was queued.

Being offline does not change the outcome. It only delays it: the change waits in the queue, the row shows `Waiting to sync`, and the rule is applied when the change finally reaches the server.

## Cases

| Queued on the device | Server has | What sync does | What the user sees |
|---|---|---|---|
| Save draft, new id | nothing | Creates the draft | The row, as a draft |
| Submit, new id | nothing | Creates the row as submitted | The row, as submitted |
| Save draft, existing id | a draft | Overwrites the draft | The edited row |
| Submit, existing id | a draft | Marks the row submitted, with the queued values | The row, as submitted |
| Save draft or Submit, existing id | **submitted** | **Drops the change** | The server's row and `Server copy kept` |
| Anything, while offline | anything | Nothing yet; the change stays queued | The local version and `Waiting to sync` |

The brief's own example is the fifth row: `srv_1` is submitted with the note `Lobby`, a queued edit changes the note, and after sync the server note is still `Lobby`.

## Where it lives

- **The server decides.** `upsert` in `src/api/fakeServer.ts` refuses to change a submitted row and answers `409` with its own copy.
- **The device obeys.** `runOnce` in `src/sync.ts` treats `409` as a finished change: it stores the server's copy, removes the change from the queue, and reports `server_copy_kept` for that entry.
- **The screen shows it.** `src/store.ts` turns that into the `Server copy kept` notice on the row and on the detail screen.

The device does not decide by looking at its own cache, because the cache can be out of date. Only the server knows whether a row is submitted at the moment the change arrives.

## Things the brief leaves open

- **A draft that has already been synced.** The rule gives submitted rows to the server and unsynced drafts to the device. It does not say who owns a draft that both sides hold. I let the device keep editing it, last write wins, because only the submitted status locks a row and there is one device per session here.
- **Submitting a row that is already submitted.** Treated the same as an edit: dropped, `Server copy kept`.
- **Edits made while online.** I considered accepting an edit to a submitted row when it is made online and rejecting it only when it was queued offline. I did not, because the brief ties the rule to the row's status, sends every change through the queue, and tests the drop with the device online.

## What it costs

The dropped edit is gone. The user is told, but cannot get the text back. For a work log where "submitted" means "handed in", that is the right trade. If submitted rows ever needed corrections, the answer would be a separate "amend" request that the server can accept or reject, not a looser rule here.
