import * as friendsApi from '@/src/data/supabase/friends';
import type { FriendListEntry, FriendSearchResult } from '@/src/data/supabase/friends';

type FriendsState = {
  open: boolean;
  friendsOpen: boolean;
  friendQuery: string;
  removalTarget: FriendListEntry | null;
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
    open: false, friendsOpen: false, friendQuery: '', removalTarget: null,
    lists: null, loading: false, loadError: '', query: '',
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

  async function act(action: 'send' | 'accept' | 'decline' | 'cancel' | 'remove', id: string) {
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
      else if (action === 'remove') await api.removeFriend(id);
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
    openFriends: () => {
      if (mutating) return;
      searchVersion++;
      update({ open: false, friendsOpen: true, friendQuery: '', removalTarget: null, actionError: '', searchStatus: 'idle' });
      void refresh();
    },
    setFriendQuery: (friendQuery: string) => { if (!mutating) update({ friendQuery }); },
    requestRemoval: (friendshipId: string) => {
      if (mutating || state.loading || state.loadError || !state.friendsOpen) return;
      const person = state.lists?.friends.find((friend) => friend.friendshipId === friendshipId);
      if (person) update({ removalTarget: person, actionError: '' });
    },
    cancelRemoval: () => { if (!mutating) update({ removalTarget: null }); },
    confirmRemoval: async () => {
      if (mutating || state.loading || state.loadError || !state.removalTarget || !state.friendsOpen) return;
      const id = state.removalTarget.friendshipId;
      update({ removalTarget: null });
      await act('remove', id);
    },
    open: () => {
      if (mutating) return;
      searchVersion++;
      update({ open: true, friendsOpen: false, removalTarget: null, query: '', result: null, searchStatus: 'idle', searchError: '', actionError: '' });
      void refresh();
    },
    close: () => {
      if (mutating) return;
      searchVersion++;
      update({ open: false, friendsOpen: false, removalTarget: null, searchStatus: 'idle' });
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

export function visibleFriends(friends: FriendListEntry[], query: string): FriendListEntry[] {
  const filter = query.trim().toLowerCase();
  return friends.filter((friend) => friend.username.toLowerCase().includes(filter))
    .sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()) || a.userId.localeCompare(b.userId));
}
