import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { NewEntryScreen } from '../src/screens/NewEntryScreen';
import { DRAFT_FORM_KEY, loadDraftForm } from '../src/storage/draftForm';
import { resetAll } from './support/resetAll';

beforeEach(resetAll);

const FILLED = { category: 'repair', date: '2026-06-02', duration: '90', note: 'Replaced valve' };

/** Mounts a fresh screen and waits until it has read storage and unlocked the form. */
async function mountForm() {
  const view = await render(<NewEntryScreen />);
  await waitFor(() => expect(screen.getByTestId('date-input')).toBeEnabled());
  return view;
}

function expectFormToShow(values: typeof FILLED | null) {
  for (const category of ['inspection', 'repair', 'travel']) {
    const option = screen.getByTestId(`category-${category}`);
    if (values?.category === category) expect(option).toBeChecked();
    else expect(option).not.toBeChecked();
  }
  expect(screen.getByTestId('date-input')).toHaveDisplayValue(values?.date ?? '');
  expect(screen.getByTestId('duration-input')).toHaveDisplayValue(values?.duration ?? '');
  expect(screen.getByTestId('note-input')).toHaveDisplayValue(values?.note ?? '');
}

test('the in-progress form is stored as it changes and restored by a new mount', async () => {
  const first = await mountForm();
  expectFormToShow(null);

  await fireEvent.press(screen.getByTestId('category-repair'));
  await fireEvent.changeText(screen.getByTestId('date-input'), FILLED.date);
  await fireEvent.changeText(screen.getByTestId('duration-input'), FILLED.duration);
  await fireEvent.changeText(screen.getByTestId('note-input'), FILLED.note);

  // Stored under draft_form without any save button being pressed.
  // loadDraftForm waits for the writes above, then reads.
  expect(await loadDraftForm()).toEqual(FILLED);
  expect(JSON.parse((await AsyncStorage.getItem(DRAFT_FORM_KEY)) ?? 'null')).toEqual(FILLED);

  await first.unmount();

  // A new tree: nothing is carried over in memory, only what storage holds.
  await mountForm();
  expectFormToShow(FILLED);
});

test('Clear draft empties the form and removes draft_form', async () => {
  await AsyncStorage.setItem(DRAFT_FORM_KEY, JSON.stringify(FILLED));

  const first = await mountForm();
  expectFormToShow(FILLED);

  await fireEvent.press(screen.getByTestId('clear-draft-button'));

  expectFormToShow(null);
  expect(await loadDraftForm()).toBeNull();
  expect(await AsyncStorage.getItem(DRAFT_FORM_KEY)).toBeNull();

  // And it stays empty after a remount.
  await first.unmount();
  await mountForm();
  expectFormToShow(null);
});
