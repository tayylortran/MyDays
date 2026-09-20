# Friend profiles

Apply `supabase/migrations/20260920000100_share_friend_profiles.sql` after the
friendships migration. The app opens `/friends/[userId]` from the username/avatar
in Your friends. This route is restricted to signed-in users and the database
independently checks accepted friendship, including for direct links.

Profiles display the friend's username, current avatar, all-time cover count,
and selected covers for the chosen month in calendar or grid view. Month
navigation is separate from the owner's calendar. Photo taps are disabled for
now; the shared photo viewer and today's feed are later steps.

The profile RPC returns only identity and cover fields. Raw profiles, photos,
hangouts and day selections retain their existing owner-only policies. The new
Storage policy allows accepted friends to read only current cover files,
thumbnails and the current avatar, never the whole owner's folder. No friend
write permissions are added.

The app generates photo URLs that expire after five minutes. Removing a friend
or a cover blocks new authorized reads and new URL generation. Already issued
signed URLs remain usable until expiry, and downloaded images cannot be recalled.
The screen reloads when focused, when returning from the background, and when
Refresh is pressed. Errors clear the displayed profile.

Validation:

- `node scripts/test-friend-profiles.cjs` tests profile mapping and signing errors.
- `scripts/test-friend-profiles.sql` tests the actual migrations in an empty,
  disposable local PostgreSQL database with minimal Supabase Auth/Storage stubs.
  It must never be run against a live Supabase project.
- Test on two signed-in accounts: open an accepted friend's profile, switch
  months/views, replace or remove a cover, remove the friendship, and refresh.
  Pending and unrelated accounts must be denied even through a direct route.
