import './style.css'

import FullDomeSimulator from './full-dome-simulator'

const fds = new FullDomeSimulator()

function main() {
  const input = document.getElementById('file')
  if(input !== null) {
    // on file selection, load the image
    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if(file !== undefined) {
        const bitmap = await createImageBitmap(file) 
        console.log('setting image', bitmap) 
        fds.setImage(bitmap)
      }
    })
  }
  
  fds.start()
}

window.onload = main

