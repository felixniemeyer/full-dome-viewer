export function loadImage(imageUrl: string) {
  const image = new Image();
  image.src = imageUrl;

  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => {
      resolve(image); 
    };

    image.onerror = () => {
      console.error("Error loading texture", imageUrl);
      reject();
    };
  })
}

export class VideoTexture {

  private newFrameReady = false;

  public ready = false; 

  private video: HTMLVideoElement;

  constructor(
    url: string, 
    loop = true, 
    public onEnd = () => {}, 
  ) {
    const video = this.video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.loop = loop;
    video.preload = "auto";

    video.addEventListener("ended", this.onEnd, true);

    const onLoadedData = () => {
      this.ready = true;
      video.removeEventListener("playing", onLoadedData);
      this.waitForNextFrame(); 
    }
    video.addEventListener("loadeddata", onLoadedData, true);

    video.src = url;
  }

  waitForNextFrame() {
    this.newFrameReady = true;
    this.video.requestVideoFrameCallback(this.waitForNextFrame.bind(this));
  }

  play() {
    this.video.play();
  }

  hasFrame() {
    return this.ready;
  }

  hasNewFrame() {
    if(this.newFrameReady) {
      this.newFrameReady = false;
      return true;
    }
    return false;
  }

  getVideo() {
    return this.video;
  }

  updatePlaybackRate(rate: number) {
    this.video.playbackRate = rate
  }
}

