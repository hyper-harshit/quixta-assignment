import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, space } from '../theme';
import { CATEGORIES, type FormValues } from '../types';
import { validateForm } from '../validation';
import { Button } from './Button';

interface Props {
  values: FormValues;
  onChange: (next: FormValues) => void;
  /** Show errors on untouched fields too. Set after a save was attempted. */
  showAllErrors: boolean;
  /** A non-blocking note such as the duplicate category/date warning. */
  warning: string | null;
  disabled?: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  /** Shows a Clear draft button when given. */
  onClear?: () => void;
}

/** The four entry fields with their validation. Used for both new and edit. */
export function EntryForm({
  values,
  onChange,
  showAllErrors,
  warning,
  disabled = false,
  onSaveDraft,
  onSubmit,
  onClear,
}: Props) {
  const errors = validateForm(values);
  // A field's error appears once it has content, or once a save was attempted.
  const categoryError = showAllErrors ? errors.category : null;
  const dateError = showAllErrors || values.date !== '' ? errors.date : null;
  const durationError = showAllErrors || values.duration !== '' ? errors.duration : null;

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.options} accessibilityRole="radiogroup">
          {CATEGORIES.map((category) => {
            const selected = values.category === category;
            return (
              <Pressable
                key={category}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled }}
                accessibilityLabel={category}
                disabled={disabled}
                onPress={() => onChange({ ...values, category })}
                testID={`category-${category}`}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {categoryError ? <Text style={styles.error}>{categoryError}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Date</Text>
        <TextInput
          accessibilityLabel="Date"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          keyboardType="numbers-and-punctuation"
          onChangeText={(date) => onChange({ ...values, date })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          style={styles.input}
          testID="date-input"
          value={values.date}
        />
        {dateError ? <Text style={styles.error}>{dateError}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput
          accessibilityLabel="Duration in minutes"
          editable={!disabled}
          keyboardType="number-pad"
          onChangeText={(duration) => onChange({ ...values, duration })}
          placeholder="15 to 720, in steps of 15"
          placeholderTextColor={colors.muted}
          style={styles.input}
          testID="duration-input"
          value={values.duration}
        />
        {durationError ? <Text style={styles.error}>{durationError}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Note</Text>
        <TextInput
          accessibilityLabel="Note"
          editable={!disabled}
          multiline
          onChangeText={(note) => onChange({ ...values, note })}
          placeholder="Optional"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.noteInput]}
          testID="note-input"
          value={values.note}
        />
      </View>

      {warning ? (
        <Text style={styles.warning} testID="form-warning">
          {warning}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Save draft"
          onPress={onSaveDraft}
          disabled={disabled}
          testID="save-draft-button"
        />
        <Button
          label="Submit"
          onPress={onSubmit}
          variant="primary"
          disabled={disabled}
          testID="submit-button"
        />
      </View>
      {onClear ? (
        <Button label="Clear draft" onPress={onClear} disabled={disabled} testID="clear-draft-button" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  field: { gap: space.xs },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionLabel: { fontSize: 16, color: colors.text },
  optionLabelSelected: { color: colors.primaryText, fontWeight: '600' },
  input: {
    minHeight: 44,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  noteInput: { minHeight: 88, textAlignVertical: 'top' },
  error: { fontSize: 14, color: colors.error },
  warning: {
    padding: space.md,
    borderRadius: 8,
    backgroundColor: colors.warningBackground,
    color: colors.warning,
    fontSize: 14,
  },
  actions: { flexDirection: 'row', gap: space.md },
});
