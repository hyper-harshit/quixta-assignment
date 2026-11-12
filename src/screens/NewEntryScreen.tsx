import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { EntryForm } from '../components/EntryForm';
import { nextEntryId } from '../ids';
import { MSG, describeOutcome } from '../messages';
import { clearDraftForm, loadDraftForm, saveDraftForm } from '../storage/draftForm';
import { queueChange, runSync, useRows } from '../store';
import { colors, space } from '../theme';
import { EMPTY_FORM, type FormValues, type OpKind } from '../types';
import { formToEntry, hasDuplicate, isValid, validateForm } from '../validation';

/**
 * The new-entry form. What the user has typed is written to device storage on
 * every change and read back when the screen mounts, so it survives leaving
 * the screen or the app being closed.
 */
export function NewEntryScreen() {
  const rows = useRows();
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  // False until the stored draft has been read; the form is locked until then
  // so that typing cannot race the restore.
  const [ready, setReady] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [savedWarning, setSavedWarning] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadDraftForm()
      .then((stored) => {
        if (!active) return;
        if (stored) setValues(stored);
      })
      .catch((error) => console.warn('Could not restore the draft form', error))
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const change = (next: FormValues) => {
    setValues(next);
    setResult(null);
    setSavedWarning(null);
    saveDraftForm(next).catch((error) => console.warn('Could not save the draft form', error));
  };

  const clear = () => {
    setValues(EMPTY_FORM);
    setAttempted(false);
    setResult(null);
    setSavedWarning(null);
    clearDraftForm().catch((error) => console.warn('Could not clear the draft form', error));
  };

  const save = async (kind: OpKind) => {
    if (saving) return;
    if (!isValid(validateForm(values))) {
      setAttempted(true);
      return;
    }

    const known = rows.map((row) => row.entry);
    const id = nextEntryId(known.map((entry) => entry.id));
    const entry = formToEntry(values, id, kind === 'submit' ? 'submitted' : 'draft');
    const duplicate = hasDuplicate(known, entry.category, entry.date);

    setSaving(true);
    try {
      // The change is safe in the queue before anything else happens.
      await queueChange(kind, entry);
      await clearDraftForm();
      setValues(EMPTY_FORM);
      setAttempted(false);
      setSavedWarning(duplicate ? MSG.duplicate : null);

      try {
        setResult(describeOutcome(await runSync(), entry.id, kind));
      } catch (error) {
        console.warn('Sync failed', error);
        setResult(MSG.syncFailed);
      }
    } catch (error) {
      console.warn('Could not save the entry', error);
      setResult('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const liveDuplicate =
    values.category !== '' &&
    hasDuplicate(
      rows.map((row) => row.entry),
      values.category,
      values.date,
    );
  const warning = savedWarning ?? (liveDuplicate ? MSG.duplicate : null);

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
    >
      <EntryForm
        values={values}
        onChange={change}
        showAllErrors={attempted}
        warning={warning}
        disabled={!ready || saving}
        onSaveDraft={() => save('saveDraft')}
        onSubmit={() => save('submit')}
        onClear={clear}
      />
      {result ? (
        <Text style={styles.result} testID="save-result" accessibilityLiveRegion="polite">
          {result}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.lg },
  result: {
    padding: space.md,
    borderRadius: 8,
    backgroundColor: colors.noticeBackground,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
