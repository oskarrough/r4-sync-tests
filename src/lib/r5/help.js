/**
 * CLI-style help for r5 commands
 */
export function help() {
	return `r5 - Radio4000 Local-First Music Player SDK

Usage:
  r5 channels [<slug>]
  r5 channels (pull|r4|v1) [<slug>]
  r5 tracks [<slug>]
  r5 tracks (pull|r4|v1) <slug>
  r5 pull <slug>
  r5 search <query>
  r5 search (channels|tracks) <query>
  r5 db (export|reset|migrate)
  r5 help

Commands:
  channels      List all local channels or get specific channel by slug
  tracks        List all local tracks or get tracks for specific channel
  pull          Pull channel and tracks for slug from remote
  search        Search all content (channels and tracks)
  db            Database operations (export, reset, migrate)

Data Sources:
  pull          Remote to local (default for pull operations)
  r4            Radio4000 Supabase API (current, read-only)
  v1            Radio4000 Firebase export (legacy, read-only)

Examples:
  r5 channels                 # List local channels
  r5 channels ko002           # Get channel 'ko002'
  r5 channels pull            # Pull all channels from remote
  r5 channels pull ko002      # Pull specific channel
  r5 tracks ko002             # Get tracks for channel 'ko002'
  r5 pull ko002               # Pull both channel and tracks
  r5 search "electronic"      # Search all content
  r5 db export                # Export database`
}
