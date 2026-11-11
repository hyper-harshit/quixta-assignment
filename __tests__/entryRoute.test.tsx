import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { resetAll } from './support/resetAll';

beforeEach(resetAll);

// renderRouter switches Jest to fake timers; put real ones back for the next test.
afterEach(() => {
  jest.useRealTimers();
});

describe('app/entries/[id].tsx', () => {
  test('/entries/srv_1 shows the entry', async () => {
    await renderRouter('./app', { initialUrl: '/entries/srv_1' });

    expect(await screen.findByTestId('detail-note')).toHaveTextContent('Lobby');
    expect(screen.getByTestId('detail-category')).toHaveTextContent('inspection');
    expect(screen.getByTestId('detail-date')).toHaveTextContent('2026-06-01');
    expect(screen.getByTestId('detail-duration')).toHaveTextContent('60 minutes');
    expect(screen.getByTestId('detail-status')).toHaveTextContent('submitted');
  });

  test('an unknown id shows "Entry not found" and a way back to the list', async () => {
    await renderRouter('./app', { initialUrl: '/entries/does_not_exist' });

    expect(await screen.findByText('Entry not found')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('back-to-list-button'));

    expect(await screen.findByTestId('sync-button')).toBeOnTheScreen();
    expect(await screen.findByTestId('entry-row-srv_1')).toBeOnTheScreen();
  });
});
