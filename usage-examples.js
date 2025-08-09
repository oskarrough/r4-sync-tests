// Usage comparison: source-first vs verb-first
// (mock imports for demonstration)

console.log('=== COMMON SCENARIOS ===\n')

// Scenario 1: Load channels for homepage
console.log('1. Load channels for homepage')
console.log('source-first: await r5.channels()')
console.log('verb-first:   await r5VerbFirst.query.channels()\n')

// Scenario 2: Get fresh channels from server
console.log('2. Get fresh channels from server')
console.log('source-first: await r5.channels.remote()')
console.log('verb-first:   await r5VerbFirst.read.channels()\n')

// Scenario 3: Pull channels (fetch + store + return)
console.log('3. Pull channels (fetch + store + return)')
console.log('source-first: await r5.channels.pull()')
console.log('verb-first:   await r5VerbFirst.pull.channels()\n')

// Scenario 4: Load tracks for specific channel
console.log('4. Load tracks for specific channel')
console.log('source-first: await r5.tracks({channel: "oskar"})')
console.log('verb-first:   await r5VerbFirst.query.tracks({channel: "oskar"})\n')

// Scenario 5: Play a channel
console.log('5. Play a channel')
console.log('source-first: await r5.player.play.channel("oskar")')
console.log('verb-first:   await r5VerbFirst.play.channel("oskar")\n')

// Scenario 6: Search across all content
console.log('6. Search across all content')
console.log('source-first: await r5.search("jazz")')
console.log('verb-first:   await r5VerbFirst.search("jazz")\n')

// Scenario 7: Add track to queue
console.log('7. Add track to queue')
console.log('source-first: await r5.queue.add(track)')
console.log('verb-first:   await r5VerbFirst.add.toQueue(track)\n')

// Scenario 8: Direct database access
console.log('8. Direct database access')
console.log('source-first: await r5.db.pg.sql`select * from channels`')
console.log('verb-first:   await r5VerbFirst.db.pg.sql`select * from channels`\n')

console.log('=== DISCOVERABILITY TEST ===\n')

// What happens when you type r5.channels. ?
console.log('r5.channels. shows:')
console.log('  - local, remote, pull, v1')
console.log('  - immediate clarity about data sources\n')

console.log('r5VerbFirst. shows:')
console.log('  - query, read, pull, sync, play, pause, next...')
console.log('  - mixed abstraction levels, less clear grouping\n')

console.log('=== MENTAL MODEL TEST ===\n')

console.log('Question: "Where do I get channels from?"')
console.log('source-first: r5.channels. → see all channel operations')
console.log('verb-first:   need to know: query=local, read=remote, pull=store\n')

console.log('Question: "How do I play something?"')
console.log('source-first: r5.player. → see all player operations')
console.log('verb-first:   r5VerbFirst.play. → but also pause, next at top level\n')

console.log('=== COMPONENT USAGE ===\n')

// Channel list component
console.log('// ChannelList.svelte')
console.log('source-first:')
console.log('  let channels = $state([])')
console.log('  $effect(async () => {')
console.log('    channels = await r5.channels()')
console.log('  })')
console.log('')
console.log('  // refresh button')
console.log('  async function refresh() {')
console.log('    channels = await r5.channels.pull()')
console.log('  }\n')

console.log('verb-first:')
console.log('  let channels = $state([])')
console.log('  $effect(async () => {')
console.log('    channels = await r5VerbFirst.query.channels()')
console.log('  })')
console.log('')
console.log('  // refresh button')
console.log('  async function refresh() {')
console.log('    channels = await r5VerbFirst.pull.channels()')
console.log('  }\n')

// Player component
console.log('// Player.svelte')
console.log('source-first:')
console.log('  async function playChannel(slug) {')
console.log('    await r5.player.play.channel(slug)')
console.log('  }')
console.log('  async function pause() {')
console.log('    await r5.player.pause()')
console.log('  }\n')

console.log('verb-first:')
console.log('  async function playChannel(slug) {')
console.log('    await r5VerbFirst.play.channel(slug)')
console.log('  }')
console.log('  async function pause() {')
console.log('    await r5VerbFirst.pause()')
console.log('  }\n')

console.log('=== CLI-STYLE THINKING ===\n')

console.log('unix commands that feel natural:')
console.log('r5 channels          # list local channels')
console.log('r5 channels --remote # fetch from server')
console.log('r5 channels --pull   # refresh and return')
console.log('r5 tracks oskar      # tracks for channel oskar')
console.log('r5 play oskar        # play channel oskar')
console.log('r5 search jazz       # search for jazz\n')

console.log('maps to source-first:')
console.log('r5.channels()              # natural default')
console.log('r5.channels.remote()       # explicit modifier')
console.log('r5.channels.pull()         # refresh all sources')
console.log('r5.tracks({channel: "oskar"}) # parameter approach')
console.log('r5.player.play.channel("oskar") # nested but clear')
console.log('r5.search("jazz")          # direct call\n')

console.log('maps to verb-first:')
console.log('r5VerbFirst.query.channels()      # verbose for common case')
console.log('r5VerbFirst.read.channels()       # less intuitive')
console.log('r5VerbFirst.query.tracks({...})   # consistent but wordy')
console.log('r5VerbFirst.play.channel("oskar") # same nesting')
console.log('r5VerbFirst.search("jazz")        # same\n')

console.log('=== VERDICT ===\n')
console.log('source-first wins on:')
console.log('- discoverability (r5.channels. shows all channel ops)')
console.log('- mental model (think resource first, then operation)')
console.log('- common case optimization (r5.channels() vs r5.query.channels())')
console.log('- unix philosophy alignment (resource.modifier pattern)')
console.log('- performance clarity (r5.channels.remote() obviously async)\n')

console.log('verb-first wins on:')
console.log('- consistency (all operations are explicit verbs)')
console.log('- traditional API familiarity (REST-like structure)')
console.log('- clear separation of concerns by verb type\n')

console.log('conclusion: source-first feels more intuitive for this use case')
