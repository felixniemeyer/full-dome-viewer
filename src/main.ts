import './style.css'

import FullDomeSimulator from './simulator'

const fds = new FullDomeSimulator()

import { loadImage, loadVideo } from './tex-utils'

function main() {
  const input = document.getElementById('file')
  if(input !== null) {
    // on file selection, load the image
    input.setAttribute('accept', 'image/*, video/*')
    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if(file !== undefined) {
        // if image
        if(file.type.match('image.*')) {
          const objURL = URL.createObjectURL(file)
          loadImage(objURL).then(fds.setImage.bind(fds))
        } else if (file.type.match('video.*')) {
          const objURL = URL.createObjectURL(file)
          loadVideo(objURL).then(fds.setVideo.bind(fds))
        }
      }
    })
  }
  
  setupDomeScaleControls(fds)
  fds.start()
}

function setupDomeScaleControls(fds: FullDomeSimulator) {
  const slider = document.getElementById('dome-scale-slider') as HTMLInputElement
  const text = document.getElementById('dome-scale-text') as HTMLInputElement

  if (!slider || !text) return

  const updateRange = (val: number) => {
    const range = 0.01
    slider.min = (val - range).toFixed(5)
    slider.max = (val + range).toFixed(5)
    slider.value = val.toString()
  }

  // Slider interaction
  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value)
    fds.setDomeScale(val)
    text.value = val.toString()
  })

  // When slider is released/set
  slider.addEventListener('change', () => {
    const val = parseFloat(slider.value)
    updateRange(val)
  })

  // Text interaction
  text.addEventListener('change', () => {
    const val = parseFloat(text.value)
    if (!isNaN(val)) {
      fds.setDomeScale(val)
      slider.value = val.toString() // Update slider visual if within range
      updateRange(val) // Reset range around new value
    }
  })
}

window.onload = main

