import {logger} from '$lib/logger'

const log = logger.ns('youtube-2').seal()

class YouTube2Element extends HTMLElement {
	static observedAttributes = ['src']

	isLoaded = false
	api = null
	#loadComplete = null
	#resolveLoad = null
	#pendingVideoLoad = false
	#autoplayAttempted = false

	constructor() {
		super()
		this.#loadComplete = new Promise((resolve) => {
			this.#resolveLoad = resolve
		})
		log.debug('constructor')
	}

	async connectedCallback() {
		log.debug('connected')

		if (!this.shadowRoot) {
			this.attachShadow({mode: 'open'})
		}

		// Create iframe with proper YouTube embed params
		this.shadowRoot.innerHTML = `
			<style>
				:host { display: block; width: 100%; height: 200px; }
				iframe { width: 100%; height: 100%; }
			</style>
			<iframe id="player" frameborder="0" allow="autoplay; encrypted-media"></iframe>
		`

		try {
			await this.loadYouTubeAPI()
			await this.#initializePlayer()
		} catch (err) {
			log.error('Failed to initialize YouTube player:', err)
		}
	}

	async #initializePlayer() {
		const iframe = this.shadowRoot.querySelector('#player')
		log.debug('initializePlayer with iframe:', !!iframe, 'and YT.Player exists:', !!globalThis.YT.Player)

		// Set a dummy video src or the iframe might not initialize properly
		if (!iframe.src) {
			iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1'
		}

		try {
			this.api = new globalThis.YT.Player(iframe, {
				playerVars: {
					enablejsapi: 1,
					origin: window.location.origin
				},
				events: {
					onReady: () => {
						console.log('onready called')
						this.isLoaded = true
						this.#resolveLoad()
						log.debug('READY! API loaded and ready, isLoaded:', this.isLoaded)

						// Load video if src is already set or was pending
						if (this.src || this.#pendingVideoLoad) {
							console.log('loadvideo?')
							this.#pendingVideoLoad = false
							this.#loadVideo()
						}
					},
					onStateChange: (event) => {
						log.debug('state change:', event.data)
						this.#dispatchStateEvents(event.data)
					},
					onError: (error) => {
						log.error('YouTube error:', error.data)
					}
				}
			})
			log.debug('YT.Player created:', !!this.api)
		} catch (error) {
			log.error('Failed to create YT.Player:', error)
		}
	}

	#dispatchStateEvents(state) {
		const YT = globalThis.YT
		if (state === YT.PlayerState.PLAYING) {
			this.dispatchEvent(new Event('play'))
		} else if (state === YT.PlayerState.PAUSED) {
			this.dispatchEvent(new Event('pause'))
		} else if (state === YT.PlayerState.ENDED) {
			this.dispatchEvent(new Event('ended'))
		} else if (state === YT.PlayerState.CUED && this.hasAttribute('autoplay') && !this.#autoplayAttempted) {
			// If video is cued and autoplay is enabled, start playing (only once per video)
			log.debug('video cued with autoplay, calling playVideo()')
			this.#autoplayAttempted = true
			this.api.playVideo()
		}
	}

	async attributeChangedCallback(attrName, oldValue, newValue) {
		if (attrName === 'src' && oldValue !== newValue && newValue) {
			log.debug('src changed to:', newValue)
			if (this.isLoaded) {
				await this.#loadVideo()
			} else {
				log.debug('player not ready yet, marking as pending load')
				this.#pendingVideoLoad = true
			}
		}
	}

	async #loadVideo() {
		await this.#loadComplete

		const videoId = this.#extractVideoId(this.src)
		if (!videoId) return

		log.debug('loading video:', videoId)

		// Reset autoplay attempt flag for new video
		this.#autoplayAttempted = false

		if (this.hasAttribute('autoplay')) {
			this.api.loadVideoById(videoId)
		} else {
			this.api.cueVideoById(videoId)
		}
	}

	#extractVideoId(url) {
		if (!url) return null
		const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/)
		return match?.[1] || null
	}

	async play() {
		await this.#loadComplete
		log.debug('play() called')
		if (this.api) {
			// If video is in unstarted state (-1), try to cue it first
			const state = this.api.getPlayerState()
			if (state === -1 && this.src) {
				const videoId = this.#extractVideoId(this.src)
				if (videoId) {
					log.debug('video unstarted, cueing first')
					this.api.cueVideoById(videoId)
					// Small delay to let it cue
					await new Promise((resolve) => setTimeout(resolve, 100))
				}
			}
			this.api.playVideo()
		}
		return Promise.resolve()
	}

	async pause() {
		await this.#loadComplete
		if (this.api) {
			this.api.pauseVideo()
		}
	}

	get paused() {
		if (!this.isLoaded) return true
		const state = this.api?.getPlayerState?.()
		return state !== globalThis.YT?.PlayerState.PLAYING
	}

	get src() {
		return this.getAttribute('src')
	}

	set src(value) {
		if (value) {
			this.setAttribute('src', value)
		} else {
			this.removeAttribute('src')
		}
	}

	loadYouTubeAPI() {
		log.debug('loadYouTubeAPI')

		if (globalThis.YT?.Player) {
			log.debug('loadYouTubeAPI resolving with existing global YT.Player instance')
			return new Promise((resolve) => resolve(globalThis.YT))
		}

		const previous = globalThis.onYouTubeIframeAPIReady

		return new Promise((resolve) => {
			globalThis.onYouTubeIframeAPIReady = () => {
				if (previous) {
					previous()
				}
				log.debug('YouTube API loaded')
				resolve(globalThis.YT)
			}

			this.#loadScript()
		})
	}

	#loadScript() {
		if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
			const script = document.createElement('script')
			script.src = 'https://www.youtube.com/iframe_api'
			document.head.appendChild(script)
			log.debug('YouTube API script added')
		} else {
			log.debug('YouTube API script already exists')
		}
	}
}

if (!customElements.get('youtube-video')) {
	customElements.define('youtube-video', YouTube2Element)
}

export default YouTube2Element
