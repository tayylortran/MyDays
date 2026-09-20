import * as friendsApi from '@/src/data/supabase/friends';
import type { FriendListEntry, FriendSearchResult } from '@/src/data/supabase/friends';

type FriendsState = {
  open: boolean;
  lists: { friends: FriendListEntry[]; incoming: FriendListEntry[]; outgoing: FriendListEntry[] } | null;
  loading: boolean;
  loadError: string;
  query: string;
  searchStatus: 'idle' | 'loading' | 'done' | 'error';
  result: FriendSearchResult | null;
  searchError: string;
  working: string | null;
  actionError: string;
};

const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';

// Keep asynchronous state separate from rendering so races and retries can be tested.
export function createFriendsController(api = friendsApi) {
  let state: FriendsState = {
    open: false, lists: null, loading: false, loadError: '', query: '',
    searchStatus: 'idle', result: null, searchError: '', working: null, actionError: '',
  };
  let active = false;
  let loadVersion = 0;
  let searchVersion = 0;
  let mutating = false;
  const listeners = new Set<() => void>();
  const update = (patch: Partial<FriendsState>) => {
    if (!active) return;
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  async function refreshLists() {
    if (!active) return;
    const version = ++loadVersion;
    update({ loading: true, loadError: '' });
    try {
      const [friends, incoming, outgoing] = await Promise.all([
        api.listFriends(), api.listIncomingFriendRequests(), api.listOutgoingFriendRequests(),
      ]);
      if (version === loadVersion) update({ lists: { friends, incoming, outgoing } });
    } catch (error) {
      if (version === loadVersion) update({ loadError: message(error) });
    } finally {
      if (version === loadVersion) update({ loading: false });
    }
  }

  async function search() {
    if (!active) return;
    const version = ++searchVersion;
    const username = state.query.trim();
    update({ searchStatus: 'loading', searchError: '', result: null });
    try {
      const result = await api.searchFriendUsername(username);
      if (version === searchVersion) update({ searchStatus: 'done', result });
    } catch (error) {
      if (version === searchVersion) update({ searchStatus: 'error', searchError: message(error) });
    }
  }

  async function refresh() {
    const version = searchVersion;
    const recheckSearch = state.searchStatus === 'done';
    await refreshLists();
    if (active && state.open && recheckSearch && version === searchVersion && !state.loadError) await search();
  }

  async function act(action: 'send' | 'accept' | 'decline' | 'cancel', id: string) {
    if (!active || mutating || state.loading || state.loadError) return;
    mutating = true;
    const query = state.query;
    const recheckSearch = state.searchStatus === 'done' || state.searchStatus === 'loading';
    searchVersion++;
    update({ working: `${action}:${id}`, actionError: '' });
    try {
      if (action === 'send') await api.sendFriendRequest(id);
      else if (action === 'accept') await api.acceptFriendRequest(id);
      else if (action === 'decline') await api.declineFriendRequest(id);
      else await api.cancelFriendRequest(id);
    } catch (error) {
      update({ actionError: message(error) });
    } finally {
      // Reconcile even on failure: a lost response may follow a committed change.
      await refreshLists();
      if (active && recheckSearch && state.query === query && state.open) await search();
      mutating = false;
      update({ working: null });
    }
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    activate: () => { active = true; update({ working: mutating ? state.working : null }); },
    deactivate: () => { active = false; loadVersion++; searchVersion++; },
    refresh,
    open: () => {
      if (mutating) return;
      searchVersion++;
      update({ open: true, query: '', result: null, searchStatus: 'idle', searchError: '', actionError: '' });
      void refresh();
    },
    close: () => {
      if (mutating) return;
      searchVersion++;
      update({ open: false, searchStatus: 'idle' });
    },
    setQuery: (query: string) => {
      if (mutating) return;
      searchVersion++;
      update({ query, result: null, searchStatus: 'idle', searchError: '', actionError: '' });
    },
    search: () => { if (!mutating) return search(); },
    act,
  };
}

export type FriendsController = ReturnType<typeof createFriendsController>;
