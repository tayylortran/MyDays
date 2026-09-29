# Blocking users

Apply `supabase/migrations/20260929000100_block_users.sql` after the earlier
friendship/profile/feed migrations before releasing the updated app. This work
does not apply migrations to the hosted project.

## Behavior

- Friend profile: the three-dot menu offers Block with confirmation. Profiles
  continue to load on screen focus and when the app returns to the foreground.
- Blocking removes an accepted friendship or pending request in either direction
  in the same database transaction. New requests cannot be sent or accepted while
  either person has a block in place.
- The blocker can search the exact username and sees a Blocked row. Tapping it
  reveals Unblock. The blocked person gets no search result for the blocker.
- Settings → Blocked users lists only the current user's blocks. Tap a row to
  reveal Unblock. Empty, loading, retry, and uncertain-write states are handled.
- Unblocking restores ordinary search/request behavior, not the old friendship.
  Mutual blocks are independent: each person can see/manage their own block in
  search and Settings; removing one leaves the other in effect.

## Access and concurrency

The block table has RLS enabled with no direct client grants. Narrow authenticated
RPCs derive the acting user from `auth.uid()`. The internal pair lock and block
lookup helpers are not executable by clients. Send, accept, block, and unblock
serialize on the same user-pair transaction lock, preventing concurrent friend
requests or accepts from surviving a committed block.

Removing the friendship excludes the pair from friend lists and feeds. The
shared-profile/file access helper additionally checks blocks in either direction.
Existing owner-only profile, hangout, and photo policies are unchanged.

New profile reads and storage URL requests are denied after blocking. Previously
issued shared-image URLs can still work until their existing five-minute expiry,
and already downloaded images cannot be recalled. A profile already open on the
other person's device clears/rechecks access on the next focus/foreground load;
this feature does not add a real-time push subscription.

## Validation

Client tests:

```powershell
node scripts/test-supabase-friends.cjs
node scripts/test-friends-controller.cjs
node scripts/test-friend-profiles.cjs
node scripts/test-friends-feed.cjs
```

Database tests must run only in a new, disposable local database. The SQL suite
includes existing save, friendship, shared-profile, and feed regression suites.
Do not run it against Supabase or a database containing user data.

```powershell
psql -h 127.0.0.1 -p 55439 -U postgres -d mydays_blocks_test -f scripts/test-user-blocks.sql
node scripts/test-user-blocks-concurrency.cjs mydays_blocks_test 55439
```

The concurrency test expects the SQL suite's fixtures, runs simultaneous database
connections in both block/send and block/accept orderings, and checks rollback.

Before release, check the native UI with two accounts: block from a profile,
search in both directions, unblock from search and Settings, and send a fresh
request. Also check long usernames, light/dark mode, and large text in the sheets.
