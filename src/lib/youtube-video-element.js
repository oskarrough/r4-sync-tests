// https://developers.google.com/youtube/iframe_api_reference
import {logger} from '$lib/logger'

const log = logger.ns('<youtube-video>').seal()

const EMBED_BASE = 'https://www.youtube.com/embed'
const EMBED_BASE_NOCOOKIE = 'https://www.youtube-nocookie.com/embed'
const API_URL = 'https://www.youtube.com/iframe_api'
const API_GLOBAL = 'YT'
const API_GLOBAL_READY = 'onYouTubeIframeAPIReady'
const VIDEO_MATCH_SRC =
	/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))((\w|-){11})/
const PLAYLIST_MATCH_SRC = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/.*?[?&]list=)([\w_-]+)/

function getTemplateHTML(attrs, props = {}) {
	const iframeAttrs = {
		id: 'yt-player-iframe',
		src: serializeIframeUrl(attrs, props),
		frameborder: 0,
		width: '100%',
		height: '100%',
		allow: 'accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture'
	}

	if (props.config) {
		// Serialize YouTube config on iframe so it can be quickly accessed on first load.
		// Required for React SSR because the custom element is initialized long before React client render.
		iframeAttrs['data-config'] = JSON.stringify(props.config)
	}

	return /*html*/ `
    <style>
      :host {
        display: inline-block;
        line-height: 0;
        position: relative;
        min-width: 300px;
        min-height: 150px;
      }
      iframe {
        position: absolute;
        top: 0;
        left: 0;
      }
    </style>
    <iframe${serializeAttributes(iframeAttrs)}></iframe>
  `
}

function serializeIframeUrl(attrs, props) {
	if (!attrs.src) return

	const embedBase = attrs.src.includes('-nocookie') ? EMBED_BASE_NOCOOKIE : EMBED_BASE

	const params = {
		// ?controls=true is enabled by default in the iframe
		controls: attrs.controls === '' ? null : 0,
		autoplay: attrs.autoplay,
		loop: attrs.loop,
		mute: attrs.muted,
		playsinline: attrs.playsinline,
		preload: attrs.preload ?? 'metadata',
		// https://developers.google.com/youtube/player_parameters#Parameters
		// origin: globalThis.location?.origin,
		enablejsapi: 1,
		showinfo: 0,
		rel: 0,
		iv_load_policy: 3,
		modestbranding: 1,
		...props.config
	}

	// If the src is a video, we use the video ID.
	if (VIDEO_MATCH_SRC.test(attrs.src)) {
		const matches = attrs.src.match(VIDEO_MATCH_SRC)
		const srcId = matches?.[1]
		return `${embedBase}/${srcId}?${serialize(params)}`
	}

	// Otherwise, we use the playlist ID.
	const matches = attrs.src.match(PLAYLIST_MATCH_SRC)
	const playlistId = matches?.[1]
	const extendedParams = {
		listType: 'playlist',
		list: playlistId,
		...params
	}

	return `${embedBase}?${serialize(extendedParams)}`
}

class YoutubeVideoElement extends HTMLElement {
	static getTemplateHTML = getTemplateHTML
	static shadowRootOptions = {mode: 'open'}
	static observedAttributes = [
		'autoplay',
		'controls',
		'crossorigin',
		'loop',
		'muted',
		'playsinline',
		'poster',
		'preload',
		'src'
	]

	#ready = new PublicPromise()
	#readyResolved = false
	#readyState = 0
	#seeking = false
	#seekComplete
	#videoChangeComplete = null

	get ready() {
		return this.#ready
	}
	#error = null
	#config = null

	constructor() {
		super()
		console.log(4242, 'constructor')
		this.#upgradeProperty('config')
	}

	async connectedCallback() {
		log.debug('connected - api exists?', !!this.api)

		// Create shadow DOM and iframe immediately
		if (!this.shadowRoot) {
			this.attachShadow({mode: 'open'})
		}

		if (!this.src) return

		// Don't create player if already exists
		if (this.api) {
			log.debug('api already exists, skipping creation')
			return
		}

		const attrs = namedNodeMapToObject(this.attributes)
		this.shadowRoot.innerHTML = getTemplateHTML(attrs, this)

		// Wait for iframe to be in DOM and ready
		await new Promise((resolve) => setTimeout(resolve, 50))
		const iframe = this.shadowRoot.querySelector('#yt-player-iframe')

		if (!iframe) {
			log.error('iframe not found in shadow DOM')
			return
		}

		// Load YouTube API and create player
		const YT = await loadScript(API_URL, API_GLOBAL, API_GLOBAL_READY)

		log.debug('creating YT.Player with iframe:', !!iframe, 'iframe.id:', iframe.id, 'iframe.src:', iframe.src)

		// Set up ready handler before creating player
		const handleReady = () => {
			if (!this.#readyResolved) {
				this.#readyResolved = true
				this.#ready.resolve()
				log.debug('yt ready - onReady fired!')
			}
		}

		const handleError = (error) => {
			console.error('YT Player error:', error, this.src)
			this.#error = {
				code: error.data,
				message: `YouTube iframe player error #${error.data}`
			}
			this.#ready.reject(new Error(`YouTube error: ${error.data}`))
			this.dispatchEvent(new Event('error'))
		}

		log.debug('about to create YT.Player...')
		this.api = new YT.Player(iframe, {
			events: {
				onReady: handleReady,
				onError: handleError
			}
		})
		log.debug('YT.Player created, api exists:', !!this.api)

		// Set up event listeners immediately after player creation (like npm version)
		this.#setupEventListeners()

		// Fallback timeout if onReady never fires
		setTimeout(() => {
			if (!this.#readyResolved) {
				log.warn('onReady timeout, resolving manually')
				this.#readyResolved = true
				this.#ready.resolve()
			}
		}, 3000)
	}

	get config() {
		return this.#config
	}

	set config(value) {
		this.#config = value
	}

	async load() {
		log.info('load')

		await this.#ready

		if (!this.src) return

		// Extract video ID from the new src
		const videoMatch = this.src.match(VIDEO_MATCH_SRC)
		const videoId = videoMatch?.[1]

		if (videoId && this.api) {
			log.debug('changing video', videoId)

			// Create promise that resolves when video is ready
			this.#videoChangeComplete = new Promise((resolve) => {
				const handleStateChange = (event) => {
					// Video is ready when it's cued (5) or buffering/playing (3,1)
					if ([1, 3, 5].includes(event.data)) {
						this.api.removeEventListener('onStateChange', handleStateChange)
						resolve()
						this.#videoChangeComplete = null
					}
				}
				this.api.addEventListener('onStateChange', handleStateChange)
			})

			if (this.autoplay) {
				this.api.loadVideoById(videoId)
			} else {
				this.api.cueVideoById(videoId)
			}

			await this.#videoChangeComplete
			log.debug('video change complete')
		}
	}

	async attributeChangedCallback(attrName, oldValue, newValue) {
		log.log('attrChange', attrName, oldValue, newValue)
		if (attrName === 'src' && oldValue === newValue) {
			log.debug('@todo handle same track, if its not playing, call play')
		}
		if (oldValue === newValue) return

		// This is required to come before the await for resolving loadComplete.
		switch (attrName) {
			case 'src':
			case 'autoplay':
			case 'controls':
			case 'loop':
			case 'playsinline': {
				this.load()
			}
		}
	}

	#setupEventListeners() {
		const YT = globalThis.YT
		let lastCurrentTime = 0
		let playFired = false

		this.api.addEventListener('onStateChange', (event) => {
			const state = event.data
			if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
				if (!playFired) {
					playFired = true
					this.dispatchEvent(new Event('play'))
				}
			}

			if (state === YT.PlayerState.PLAYING) {
				if (this.seeking) {
					this.#seeking = false
					this.#seekComplete?.resolve()
					this.dispatchEvent(new Event('seeked'))
				}
				this.#readyState = 3
				this.dispatchEvent(new Event('playing'))
			} else if (state === YT.PlayerState.PAUSED) {
				const diff = Math.abs(this.currentTime - lastCurrentTime)
				if (!this.seeking && diff > 0.1) {
					this.#seeking = true
					this.dispatchEvent(new Event('seeking'))
				}
				playFired = false
				this.dispatchEvent(new Event('pause'))
			}
			if (state === YT.PlayerState.ENDED) {
				playFired = false
				this.dispatchEvent(new Event('pause'))
				this.dispatchEvent(new Event('ended'))
				if (this.loop) {
					this.play()
				}
			}
		})

		this.api.addEventListener('onPlaybackRateChange', () => {
			this.dispatchEvent(new Event('ratechange'))
		})

		this.api.addEventListener('onVolumeChange', () => {
			this.dispatchEvent(new Event('volumechange'))
		})

		this.api.addEventListener('onVideoProgress', () => {
			this.dispatchEvent(new Event('timeupdate'))
		})
	}

	async play() {
		log.debug('play() called - api:', !!this.api, 'videoChangeInProgress:', !!this.#videoChangeComplete)
		this.#seekComplete = null
		await this.#ready

		// Wait for any ongoing video change to complete
		if (this.#videoChangeComplete) {
			log.debug('waiting for video change to complete')
			await this.#videoChangeComplete
		}

		// yt.playVideo doesn't return a play promise.
		this.api?.playVideo()
		return createPlayPromise(this)
	}

	async pause() {
		await this.#ready
		return this.api?.pauseVideo()
	}

	get seeking() {
		return this.#seeking
	}

	get readyState() {
		return this.#readyState
	}

	get src() {
		return this.getAttribute('src')
	}

	set src(val) {
		if (this.src === val) return
		this.setAttribute('src', val)
	}

	get error() {
		return this.#error
	}

	/* onStateChange
		-1 (unstarted)
		0 (ended)
		1 (playing)
		2 (paused)
		3 (buffering)
		5 (video cued).
	*/

	get paused() {
		if (!this.api) return !this.autoplay
		return [-1, 0, 2, 5].includes(this.api?.getPlayerState?.())
	}

	get duration() {
		return this.api?.getDuration?.() ?? NaN
	}

	get autoplay() {
		return this.hasAttribute('autoplay')
	}

	set autoplay(val) {
		if (this.autoplay === val) return
		this.toggleAttribute('autoplay', Boolean(val))
	}

	get buffered() {
		if (!this.api) return createTimeRanges()
		const progress = this.api?.getVideoLoadedFraction() * this.api?.getDuration()
		if (progress > 0) {
			return createTimeRanges(0, progress)
		}
		return createTimeRanges()
	}

	get controls() {
		return this.hasAttribute('controls')
	}

	set controls(val) {
		if (this.controls === val) return
		this.toggleAttribute('controls', Boolean(val))
	}

	get currentTime() {
		return this.api?.getCurrentTime?.() ?? 0
	}

	set currentTime(val) {
		if (this.currentTime === val) return
		this.#seekComplete = new PublicPromise()
		this.#ready.then(() => {
			this.api?.seekTo(val, true)
			if (this.paused) {
				this.#seekComplete?.then(() => {
					if (!this.#seekComplete) return
					this.api?.pauseVideo()
				})
			}
		})
	}

	set defaultMuted(val) {
		if (this.defaultMuted === val) return
		this.toggleAttribute('muted', Boolean(val))
	}

	get defaultMuted() {
		return this.hasAttribute('muted')
	}

	get loop() {
		return this.hasAttribute('loop')
	}

	set loop(val) {
		if (this.loop === val) return
		this.toggleAttribute('loop', Boolean(val))
	}

	set muted(val) {
		if (this.muted === val) return
		this.#ready.then(() => {
			if (val) this.api?.mute()
			else this.api?.unMute()
		})
	}

	get muted() {
		if (!this.api) return this.defaultMuted
		return this.api?.isMuted?.()
	}

	get playbackRate() {
		return this.api?.getPlaybackRate?.() ?? 1
	}

	set playbackRate(val) {
		if (this.playbackRate === val) return
		this.#ready.then(() => {
			this.api?.setPlaybackRate(val)
		})
	}

	get playsInline() {
		return this.hasAttribute('playsinline')
	}

	set playsInline(val) {
		if (this.playsInline === val) return
		this.toggleAttribute('playsinline', Boolean(val))
	}

	get poster() {
		return this.getAttribute('poster')
	}

	set poster(val) {
		if (this.poster === val) return
		this.setAttribute('poster', `${val}`)
	}

	set volume(val) {
		if (this.volume === val) return
		this.#ready.then(() => {
			this.api?.setVolume(val * 100)
		})
	}

	get volume() {
		if (!this.api) return 1
		return this.api?.getVolume() / 100
	}

	// This is a pattern to update property values that are set before
	// the custom element is upgraded.
	// https://web.dev/custom-elements-best-practices/#make-properties-lazy
	#upgradeProperty(prop) {
		if (Object.prototype.hasOwnProperty.call(this, prop)) {
			const value = this[prop]
			// Delete the set property from this instance.
			delete this[prop]
			// Set the value again via the (prototype) setter on this class.
			this[prop] = value
		}
	}
}

function serializeAttributes(attrs) {
	let html = ''
	for (const key in attrs) {
		const value = attrs[key]
		if (value === '') html += ` ${escapeHtml(key)}`
		else html += ` ${escapeHtml(key)}="${escapeHtml(`${value}`)}"`
	}
	return html
}

function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
		.replace(/`/g, '&#x60;')
}

function serialize(props) {
	return String(new URLSearchParams(boolToBinary(props)))
}

function boolToBinary(props) {
	let p = {}
	for (let key in props) {
		let val = props[key]
		if (val === true || val === '') p[key] = 1
		else if (val === false) p[key] = 0
		else if (val != null) p[key] = val
	}
	return p
}

function namedNodeMapToObject(namedNodeMap) {
	let obj = {}
	for (let attr of namedNodeMap) {
		obj[attr.name] = attr.value
	}
	return obj
}

const loadScriptCache = {}
async function loadScript(src, globalName, readyFnName) {
	if (loadScriptCache[src]) return loadScriptCache[src]
	if (globalName && self[globalName]) {
		await delay(0)
		return self[globalName]
	}
	return (loadScriptCache[src] = new Promise(function (resolve, reject) {
		const script = document.createElement('script')
		script.src = src
		const ready = () => resolve(self[globalName])
		if (readyFnName) self[readyFnName] = ready
		script.onload = () => !readyFnName && ready()
		script.onerror = reject
		document.head.append(script)
	}))
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function promisify(fn) {
	return (...args) =>
		new Promise((resolve) => {
			fn(...args, (...res) => {
				if (res.length > 1) resolve(res)
				else resolve(res[0])
			})
		})
}

function createPlayPromise(player) {
	return promisify((event, cb) => {
		let fn
		player.addEventListener(
			event,
			(fn = () => {
				player.removeEventListener(event, fn)
				cb()
			})
		)
	})('playing')
}

/**
 * A utility to create Promises with convenient public resolve and reject methods.
 * @return {Promise}
 */
class PublicPromise extends Promise {
	constructor(executor = () => {}) {
		let res, rej
		super((resolve, reject) => {
			executor(resolve, reject)
			res = resolve
			rej = reject
		})
		this.resolve = res
		this.reject = rej
	}
}

/**
 * Creates a fake `TimeRanges` object.
 *
 * A TimeRanges object. This object is normalized, which means that ranges are
 * ordered, don't overlap, aren't empty, and don't touch (adjacent ranges are
 * folded into one bigger range).
 *
 * @param  {(Number|Array)} Start of a single range or an array of ranges
 * @param  {Number} End of a single range
 * @return {Array}
 */
function createTimeRanges(start, end) {
	if (Array.isArray(start)) {
		return createTimeRangesObj(start)
	} else if (start == null || end == null || (start === 0 && end === 0)) {
		return createTimeRangesObj([[0, 0]])
	}
	return createTimeRangesObj([[start, end]])
}

function createTimeRangesObj(ranges) {
	Object.defineProperties(ranges, {
		start: {
			value: (i) => ranges[i][0]
		},
		end: {
			value: (i) => ranges[i][1]
		}
	})
	return ranges
}

if (globalThis.customElements && !globalThis.customElements.get('youtube-video')) {
	globalThis.customElements.define('youtube-video', YoutubeVideoElement)
}

export default YoutubeVideoElement
