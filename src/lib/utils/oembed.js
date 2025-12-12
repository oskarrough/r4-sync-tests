const providers = {
	'youtube.com': 'https://www.youtube.com/oembed',
	'youtu.be': 'https://www.youtube.com/oembed',
	'soundcloud.com': 'https://soundcloud.com/oembed',
	'vimeo.com': 'https://vimeo.com/api/oembed.json'
}

/** @param {string} mediaUrl */
export async function fetchOEmbedTitle(mediaUrl) {
	try {
		const hostname = new URL(mediaUrl).hostname.replace('www.', '')
		const endpoint = providers[hostname]
		if (!endpoint) return null
		const res = await fetch(`${endpoint}?url=${encodeURIComponent(mediaUrl)}&format=json`)
		if (!res.ok) return null
		const data = await res.json()
		return data.title || null
	} catch {
		return null
	}
}
