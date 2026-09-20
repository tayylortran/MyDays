import { useFocusEffect } from 'expo-router';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { createFriendsController } from './friendsController';

export function useFriendsScreen() {
  const [controller] = useState(createFriendsController);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useFocusEffect(useCallback(() => {
    controller.activate();
    void controller.refresh();
    return controller.deactivate;
  }, [controller]));
  return { state, controller };
}
