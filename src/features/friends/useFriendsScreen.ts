import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useRepo } from '@/src/data/RepositoryProvider';
import { AppState } from 'react-native';
import { createFriendsController } from './friendsController';

export function useFriendsScreen() {
  const repo = useRepo();
  const controller = useMemo(() => createFriendsController(repo), [repo]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useFocusEffect(useCallback(() => {
    controller.activate();
    void controller.refresh();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        controller.activate();
        void controller.refresh();
      } else controller.deactivate();
    });
    // Refresh new posts and the server's day boundary while this tab is visible.
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && !controller.getSnapshot().working) void controller.refresh();
    }, 60_000);
    return () => { clearInterval(timer); subscription.remove(); controller.deactivate(); };
  }, [controller]));
  return { state, controller };
}
