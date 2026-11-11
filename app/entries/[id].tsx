import { useLocalSearchParams, useRouter } from 'expo-router';

import { backToList, entryPath } from '../../src/navigation';
import { EntryDetailScreen } from '../../src/screens/EntryDetailScreen';

/** Entry detail. Reached from the list, from worklog://entries/<id>, and from /entries/<id> on web. */
export default function EntryDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <EntryDetailScreen
      id={id}
      onEdit={() => router.push(`${entryPath(id)}/edit`)}
      onBackToList={backToList}
    />
  );
}
