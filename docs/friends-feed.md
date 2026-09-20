# Friends Today feed

Apply `supabase/migrations/20260920000200_friends_today_feed.sql` after the
friendship and shared-profile migrations. No new tables or public buckets are
required.

The server chooses today's date in the viewer's device time zone. Accepted
friends with a selected cover for that date appear in the two-column photo
grid, with usernames above their photos and the associated hangout titles in
the bottom corner. Replacing a cover updates the post; removing it moves the
friend to Everyone else. Historical covers never become new posts today.

Everyone else shows up to nine quiet friends with current avatars or initials,
followed by All. A +N inside All counts quiet friends beyond the preview. All
opens the existing searchable list of every accepted friend. Both post cards
and individual profile circles open the read-only friend profile.

The feed refreshes when focused, when returning from the background, on pull to
refresh, after friendship actions, and once per minute while visible. The
server date is checked between pages to avoid mixing days across midnight.
Only currently displayed avatars and cover thumbnails are signed; links use
the same five-minute expiry as friend profiles.

The RPC exposes today's title only, never notes or unselected photos. It takes
a validated time zone, not an arbitrary historical date. Existing raw-table
policies and friend-profile responses remain unchanged.

Tests: `node scripts/test-friends-feed.cjs` and
`node scripts/test-friends-controller.cjs`. Run `scripts/test-friends-feed.sql`
only in a fresh disposable local PostgreSQL database; it includes the earlier
friendship and shared-profile regression suites. It must never run in a live
Supabase project.
