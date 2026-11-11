import { useLocalSearchParams, useRouter } from 'expo-router';

import { backToList, entryPath } from '../../../src/navigation';
import { EditEntryScreen } from '../../../src/screens/EditEntryScreen';

export default function EditEntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <EditEntryScreen
      id={id}
      onDone={() => (router.canGoBack() ? router.back() : router.replace(entryPath(id)))}
      onBackToList={backToList}
    />
  );
}
