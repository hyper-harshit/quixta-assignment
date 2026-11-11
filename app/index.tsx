import { useRouter } from 'expo-router';

import { entryPath } from '../src/navigation';
import { EntryListScreen } from '../src/screens/EntryListScreen';

export default function ListRoute() {
  const router = useRouter();
  return (
    <EntryListScreen
      onNewEntry={() => router.push('/new')}
      onOpenEntry={(id) => router.push(entryPath(id))}
    />
  );
}
