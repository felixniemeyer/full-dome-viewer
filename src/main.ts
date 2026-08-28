import './style.css'

import FullDomeSimulator from './simulator'

const fds = new FullDomeSimulator()

import { loadImage, loadVideo } from './tex-utils'

function main() {
  const input = document.getElementById('file')
  const audioCheckbox = document.getElementById('audio-checkbox') as HTMLInputElement
  let currentVideo: HTMLVideoElement | null = null
  let prevObjURL: string | null = null
  let audioEnabled = true  // enable audio by default

  if (audioCheckbox) {
    audioCheckbox.checked = audioEnabled
    audioCheckbox.addEventListener('change', () => {
      audioEnabled = audioCheckbox.checked
      if (currentVideo) {
        currentVideo.muted = !audioEnabled
      }
    })
  }

  // UI state
  const selector = document.getElementById('selector')
  const label = selector?.querySelector('label')
  const uploadText = 'Click to upload a domemaster file (image or video)'
  function setSelectorUploaded(uploaded: boolean) {
    if (!selector || !label) return
    selector.classList.toggle('uploaded', uploaded)
    if (label.firstChild && label.firstChild.nodeType === Node.TEXT_NODE) {
      label.firstChild.textContent = uploaded ? 'Upload different medium' : uploadText
    }
  }
  setSelectorUploaded(false)

  // Timeline (video playback)
  const timeline = document.getElementById('timeline')
  const playPauseBtn = document.getElementById('play-pause-button') as HTMLButtonElement
  const timeSlider = document.getElementById('time-slider') as HTMLInputElement
  const timeLabel = document.getElementById('time-label')

  const formatTime = (t: number) => {
    if (!isFinite(t)) t = 0
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }
  const updateTimeLabel = () => {
    if (timeLabel && currentVideo) {
      timeLabel.textContent = `${formatTime(currentVideo.currentTime)} | ${formatTime(currentVideo.duration)}`
    }
  }
  if (timeSlider) {
    timeSlider.addEventListener('input', () => {
      if (currentVideo) {
        currentVideo.currentTime = parseFloat(timeSlider.value)
        updateTimeLabel()
      }
    })
  }
  const showTimeline = (video: HTMLVideoElement | null) => {
    if (video && timeline && timeSlider) {
      timeline.classList.add('visible')
      timeSlider.max = video.duration.toString()
      timeSlider.value = video.currentTime.toString()
      updateTimeLabel()
      video.addEventListener('timeupdate', () => {
        timeSlider.value = video.currentTime.toString()
        updateTimeLabel()
      })
    } else if (timeline) {
      timeline.classList.remove('visible')
    }
  }

  if (input !== null) {
    input.setAttribute('accept', 'image/*, video/*')
    input.addEventListener('change', async (e) => {
      // Clean up previous media
      if (prevObjURL) {
        URL.revokeObjectURL(prevObjURL)
        prevObjURL = null
      }
      if (currentVideo) {
        currentVideo.pause()
        currentVideo = null
      }
      fds.textureReady = false // hide controls while loading
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file === undefined) {
        showTimeline(null)
        setSelectorUploaded(false)
        return
      }
      if (file.type.match('image.*')) {
        const objURL = URL.createObjectURL(file)
        prevObjURL = objURL
        loadImage(objURL).then(fds.setImage.bind(fds)).then(() => {
          currentVideo = null
          showTimeline(null)
          setSelectorUploaded(true)
        }).catch(err => {
          console.error('Failed to load image:', err)
        })
      } else if (file.type.match('video.*')) {
        const objURL = URL.createObjectURL(file)
        prevObjURL = objURL
        loadVideo(objURL).then((video) => {
          currentVideo = video
          fds.setVideo(video)
          video.muted = !audioEnabled
          showTimeline(video)
          setSelectorUploaded(true)
          // Setup play/pause button
          if (playPauseBtn) {
            playPauseBtn.textContent = video.paused ? '\u25BA' : '\u23F8'
            playPauseBtn.onclick = () => {
              if (video.paused) {
                video.play()
              } else {
                video.pause()
              }
            }
            const updateBtn = () => {
              playPauseBtn.textContent = video.paused ? '\u25BA' : '\u23F8'
            }
            video.addEventListener('play', updateBtn)
            video.addEventListener('pause', updateBtn)
            video.addEventListener('ended', () => {
              playPauseBtn.textContent = '\u25BA'
            })
          }
        }).catch(err => {
          console.error('Failed to load video:', err)
        })
      }
    })
  }

  // Space bar to toggle play/pause
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      // Ignore if focus is on an input or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }
      e.preventDefault()
      if (currentVideo) {
        if (currentVideo.paused) {
          currentVideo.play()
        } else {
          currentVideo.pause()
        }
      }
    }
  })

  setupFovControls(fds)
  fds.start()

  // Hide/show controls based on whether media is loaded
  const controlsEl = document.getElementById('controls')
  if (controlsEl) {
    setInterval(() => {
      controlsEl.style.display = fds.textureReady ? 'block' : 'none'
    }, 100)
  }
}

function setupFovControls(fds: FullDomeSimulator) {
  const slider = document.getElementById('fov-slider') as HTMLInputElement
  const text = document.getElementById('fov-text') as HTMLInputElement

  if (!slider || !text) return

  // Fixed range
  slider.min = '10'
  slider.max = '120'
  slider.step = '0.1'
  slider.value = '90'
  text.value = '90'

  const applyFov = (val: number) => {
    const clamped = Math.min(120, Math.max(10, val))
    fds.setFov(clamped)
    slider.value = clamped.toFixed(1)
    text.value = clamped.toFixed(1)
  }

  // Slider interaction
  slider.addEventListener('input', () => {
    applyFov(parseFloat(slider.value))
  })

  // Text interaction
  text.addEventListener('change', () => {
    const val = parseFloat(text.value)
    if (!isNaN(val)) {
      applyFov(val)
    }
  })

  // Mouse wheel on canvas: zoom in/out by adjusting FOV
  const canvas = document.getElementById('canvas')
  if (canvas) {
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const step = (e.deltaY > 0 ? 1 : -1) * 2 // degrees per wheel tick
      applyFov(parseFloat(slider.value) + step)
    }, { passive: false })
  }
}

window.onload = main