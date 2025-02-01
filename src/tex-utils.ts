export function loadImage(imageUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      resolve(image); 
    };
    image.onerror = (err) => {
      console.error("Error loading texture", imageUrl, err);
      reject();
    };
  })
}

export function loadVideo(videoUrl: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video")
    video.src = videoUrl
    video.muted = true
    video.playsInline = true
    video.loop = true
    video.preload = 'auto'
    video.onloadeddata = () => {
      console.log('setting video', video)
      video.play()
      resolve(video)
    }
    video.onerror = (err) => {
      console.error("Error loading video", videoUrl, err);
      reject()
    }
  })
}

