// No test touches a device. Each native module is replaced by an in-memory
// stand-in: secure store by __mocks__/expo-secure-store.ts, the other two by
// the mocks their own packages ship.
jest.mock('expo-secure-store');

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
