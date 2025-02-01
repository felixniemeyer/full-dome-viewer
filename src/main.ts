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
  
  fds.start()
}

window.onload = main

