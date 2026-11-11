import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { EntryForm } from '../components/EntryForm';
import { EntryNotFound } from '../components/EntryNotFound';
import { Loading } from '../components/Loading';
import { MSG } from '../messages';
import { queueChange, runSync, useEntry, useRows } from '../store';
import { colors, space } from '../theme';
import type { Entry, FormValues, OpKind } from '../types';
import { entryToForm, formToEntry, hasDuplicate, isValid, validateForm } from '../validation';

interface Props {
  id: string;
  /** Called once the change is queued. */
  onDone: () => void;
  onBackToList: () => void;
}

export function EditEntryScreen({ id, onDone, onBackToList }: Props) {
  const lookup = useEntry(id);

  if (lookup.status === 'loading') return <Loading />;
  if (lookup.status === 'missing') return <EntryNotFound onBackToList={onBackToList} />;

  // Keyed by id so the form's state belongs to one entry.
  return <EditForm key={id} entry={lookup.row.entry} onDone={onDone} />;
}

/**
 * Edits an existing entry. Any entry can be edited here, including one the
 * server already holds as submitted: the change is queued like any other and
 * the conflict rule decides its fate at sync. That is how "Server copy kept"
 * is reached by hand.
 *
 * Unlike the new-entry form this one is not saved to `draft_form`; that key
 * holds the one in-progress new entry.
 */
function EditForm({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const rows = useRows();
  // Read once: later store updates must not overwrite what the user is typing.
  const [values, setValues] = useState<FormValues>(() => entryToForm(entry));
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const save = async (kind: OpKind) => {
    if (saving) return;
    if (!isValid(validateForm(values))) {
      setAttempted(true);
      return;
    }

    setSaving(true);
    try {
      await queueChange(
        kind,
        formToEntry(values, entry.id, kind === 'submit' ? 'submitted' : 'draft'),
      );
    } catch (error) {
      console.warn('Could not save the entry', error);
      setFailure('Could not save. Try again.');
      setSaving(false);
      return;
    }
    // The result shows on the entry itself, so there is no need to wait here.
    runSync().catch((error) => console.warn('Sync failed', error));
    onDone();
  };

  const duplicate =
    values.category !== '' &&
    hasDuplicate(
      rows.map((row) => row.entry),
      values.category,
      values.date,
      entry.id,
    );

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
    >
      {entry.status === 'submitted' ? (
        <Text style={styles.hint} testID="submitted-hint">
          This entry is already submitted. If the server also has it as submitted, the server keeps
          its copy and a change made here is dropped at the next sync.
        </Text>
      ) : null}
      <EntryForm
        values={values}
        onChange={setValues}
        showAllErrors={attempted}
        warning={duplicate ? MSG.duplicate : null}
        disabled={saving}
        onSaveDraft={() => save('saveDraft')}
        onSubmit={() => save('submit')}
      />
      {failure ? <Text style={styles.failure}>{failure}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.lg },
  hint: {
    padding: space.md,
    borderRadius: 8,
    backgroundColor: colors.noticeBackground,
    color: colors.text,
    fontSize: 14,
  },
  failure: { fontSize: 14, color: colors.error },
});
