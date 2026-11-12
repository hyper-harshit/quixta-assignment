# Conflict rule

## The rule, in my words

The conflict rules are create with offline mode in mind

- **Once the server holds an entry as submitted, the server's version is final.** If the device still has a change queued for that entry when it syncs, the are considered stale and ignored. The device replaces whatever it was showing with the server's copy and tells the user: `Server copy kept`.
- **If there is not entry in server, there is no conflict, there is just 1 entry** The device's version is the only version, so there is nothing to conflict with. The first sync creates it exactly as it was queued.
- **While the server holds an entry as a draft, changes to it are accepted.** The device can keep editing a draft after it has synced, and the latest change replaces the server's copy with no conflict. This stops only when the entry is submitted.

Being offline does not change the outcome. It only delays it: the change waits in the queue, the row shows `Waiting to sync`, and the rule is applied when the change finally reaches the server.

## Cases

| Queued on the device | Server has | What sync does | What the user sees |
|---|---|---|---|
| Save draft, new id | nothing | Creates the draft | The row, as a draft |
| Submit, new id | nothing | Creates the row as submitted | The row, as submitted |
| Save draft, existing id | a draft | Overwrites the draft | The edited row |
| Submit, existing id | a draft | Marks the row submitted, with the queued values | The row, as submitted |
| Save draft or Submit, existing id | **submitted** | **Drops the change** | The server's row and `Server copy kept` |
| multiple edits while offline | nothing | Nothing yet; the last change stays queued | The local version and `Waiting to sync` |
| multiple edits while offline, then online | nothing | syncs the last change to the server | The row, as submitted |

Note: An entry changed several times before it syncs is still one queued change. The queue keeps only the latest values for each entry, so a row made and then edited offline reaches the server once, as the user last left it, and is never in conflict with its own earlier version.

## Things the brief leaves open

- **A draft that has already been synced.** The rule gives submitted rows to the server and unsynced drafts to the device. It does not say who owns a draft that both sides hold. I let the device keep editing it, last write wins, because only the submitted status locks a row and there is one device per session here.
- **Edits made while online.** I considered accepting an edit to a submitted row when it is made online and rejecting it only when it was queued offline. I did not, because the brief ties the rule to the row's status, sends every change through the queue, and tests the drop with the device online.

## What it costs

The dropped edit is gone. The user is told, but cannot get the text back. For a work log where "submitted" means "handed in", that is the right trade. If submitted rows ever needed corrections, the answer would be a separate "amend" request that the server can accept or reject, not a looser rule here.

## Gap

Two people can we working on the same draft and it becomes a race in that case.