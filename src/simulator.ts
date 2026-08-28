import { compileShaders, makeUniformLocationAccessor } from './shader-tools'

import domeVs from './shaders/dome.vs'
import domeFs from './shaders/dome.fs'
import minimapVs from './shaders/minimap.vs'
import minimapFs from './shaders/minimap.fs'

import { RectVao } from './geometry'

import { mat3, vec3 } from 'gl-matrix'


const up = vec3.fromValues(0, 1, 0)
const front = vec3.fromValues(0, 0, 1)

const rUp = vec3.create()
const rFront = vec3.create()
const rRight = vec3.create()

export default class FullDomeSimulator {
  gl: WebGL2RenderingContext
  canvas: HTMLCanvasElement

  started = false

  rotationMatrix = mat3.create()

  program: WebGLProgram
  uniLocs: any

  rectVao: RectVao

  domeTex: WebGLTexture
  fovDeg: number = 90;
  minimapProgram: WebGLProgram;
  minimapUniLocs: any;
  textureReady: boolean = false;
  normX: number = 0.0;
  normY: number = 0.0;

  constructor() {
    this.canvas = document.getElementById("canvas") as HTMLCanvasElement
    const gl = this.gl = this.setUpWebGL(this.canvas) 

    this.program = compileShaders(gl, domeVs, domeFs)
    this.uniLocs = makeUniformLocationAccessor(gl, this.program)

    gl.useProgram(this.program)
    gl.uniform1i(this.uniLocs.domeTex, 0)
    gl.uniform1f(this.uniLocs.domeScale, 0.5)

    this.rectVao = new RectVao(gl)

    // minimap program
    this.minimapProgram = compileShaders(gl, minimapVs, minimapFs)
    this.minimapUniLocs = makeUniformLocationAccessor(gl, this.minimapProgram)

    this.domeTex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.domeTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)


    // Set initial rotation based on yRot (pitch up)
    vec3.rotateX(rFront, front, [0, 0, 0], this.yRot)
    vec3.rotateY(rFront, rFront, [0, 0, 0], this.xRot)
    vec3.cross(rRight, rFront, up)
    vec3.normalize(rRight, rRight)
    vec3.cross(rUp, rRight, rFront)
    vec3.normalize(rUp, rUp)
    // update rotation matrix
    mat3.set(
      this.rotationMatrix,
      rRight[0], rRight[1], rRight[2],
      rUp[0], rUp[1], rUp[2],
      rFront[0], rFront[1], rFront[2]
    )
  }

  setUpWebGL(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
    })
    if(!gl) {
      throw new Error(`WebGL2 is not supported`)
    }

    [].forEach(ext => {
      if(!gl.getExtension(ext)) {
        throw new Error(`${ext} is not supported`)
      }
    })
    return gl
  }

  setImage(img: TexImageSource) {
    this.video = null
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.domeTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    this.textureReady = true
  }

  private video: HTMLVideoElement | null = null
  setVideo(video: HTMLVideoElement) {
    this.video = video
    this.textureReady = true
  }

  setFov(fovDeg: number) {
    this.fovDeg = fovDeg
    const gl = this.gl
    gl.useProgram(this.program)
    // compute norm based on current fov and canvas aspect
    const fovRad = (this.fovDeg * Math.PI) / 180.0
    const normX = Math.tan(fovRad / 2.0)
    const normY = normX * (this.canvas.height / this.canvas.width)
    gl.uniform2fv(this.uniLocs.norm, [normX, normY])
    this.normX = normX
    this.normY = normY
  }

  setDomeScale(scale: number) {
    const gl = this.gl
    gl.useProgram(this.program)
    gl.uniform1f(this.uniLocs.domeScale, scale)
  }

  res = [1, 1]
  viewAngleX = Math.PI / 2
  viewAngleY = Math.PI / 2
  resize() { 
    const pixelRatio = window.devicePixelRatio || 1

    const resX = Math.round(this.canvas.clientWidth * pixelRatio) 
    const resY = Math.round(this.canvas.clientHeight * pixelRatio)

    this.canvas.width = resX
    this.canvas.height = resY

    this.res = [resX, resY]

    // I) rx * ry = 1
    // II) resX / resY = rx / ry
    // => rx = ry * resX / resY
    // => ry * ry * resX / resY = 1
    // => ry = sqrt(resY / resX)
    // rx = 1 / ry
    const gl = this.gl
    gl.useProgram(this.program)
    gl.uniform2fv(this.uniLocs.res, [resX, resY])

    // compute norm based on FOV and aspect ratio
    const fovRad = (this.fovDeg * Math.PI) / 180.0
    const normX = Math.tan(fovRad / 2.0) // horizontal scale
    const normY = normX * (this.canvas.height / this.canvas.width) // vertical scale for aspect

    console.log('norm', normX, normY)
    gl.uniform2fv(this.uniLocs.norm, [normX, normY])
    this.normX = normX
    this.normY = normY

    // calculate view angles for mouse dragging
    this.viewAngleX = Math.asin(normX / Math.sqrt(1.0 + normX * normX)) * 2.0
    this.viewAngleY = Math.asin(normY / Math.sqrt(1.0 + normY * normY)) * 2.0
  }

  mouseDown = false
  mX = 0
  mY = 0
  xRot = 0
  yRot = -Math.PI/6
  
  async start() {
    if (window.self === window.top) { // if not in iframe
      document.body.style.backgroundColor = "#222"
    }
    if(!this.started) {
      // 
      this.canvas.addEventListener('mousedown', (e) => {
        this.mouseDown = true
        this.mX = e.clientX
        this.mY = e.clientY
      })
      this.canvas.addEventListener('mouseup', (_e) => {
        this.mouseDown = false
      })
      this.canvas.addEventListener('mousemove', (e) => {
        if(this.mouseDown) {
          const dx = e.clientX - this.mX
          const dy = - (e.clientY - this.mY)
          this.mX = e.clientX
          this.mY = e.clientY

          // rotate 
          this.xRot += dx / this.canvas.clientWidth * this.viewAngleX
          while(this.xRot > Math.PI) {
            this.xRot -= Math.PI * 2
          }
          while(this.xRot < -Math.PI) {
            this.xRot += Math.PI * 2
          }

          this.yRot += dy / this.canvas.clientHeight * this.viewAngleY
          if(this.yRot > Math.PI / 2) {
            this.yRot = Math.PI / 2
          }
          if(this.yRot < -Math.PI / 2) {
            this.yRot = -Math.PI / 2
          }

          vec3.rotateX(rFront, front, [0, 0, 0], this.yRot)
          vec3.rotateY(rFront, rFront, [0, 0, 0], this.xRot)

          vec3.cross(rRight, rFront, up)
          vec3.normalize(rRight, rRight)

          vec3.cross(rUp, rRight, rFront)
          vec3.normalize(rUp, rUp)

          // update rotation matrix
          mat3.set(
            this.rotationMatrix, 
            rRight[0], rRight[1], rRight[2],
            rUp[0], rUp[1], rUp[2],
            rFront[0], rFront[1], rFront[2],
          ) 
        }
      })


      window.addEventListener('resize', this.resize.bind(this))
      this.resize()

      this.started = true
      this.loop() 
    }
  }

  private loop() {
    this.render()
    requestAnimationFrame(this.loop.bind(this))
  }

  private render() {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.res[0], this.res[1])
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.useProgram(this.program)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.domeTex)
    if(this.video !== null) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video)
    }

    gl.uniformMatrix3fv(this.uniLocs.rotation, false, this.rotationMatrix)

    this.rectVao.draw()

    // Minimap
    if (this.textureReady) {
      const m = Math.min(0.25 * this.canvas.width, 0.25 * this.canvas.height);
      const margin = 10;
      const offsetX = this.canvas.width - m - margin; // distance from right
      const offsetY = margin; // distance from bottom
      gl.viewport(offsetX, offsetY, m, m);
      gl.useProgram(this.minimapProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.domeTex);
      gl.uniform1i(this.minimapUniLocs.domeTex, 0);
      gl.uniform2f(this.minimapUniLocs.u_offset, offsetX, offsetY);
      gl.uniform2f(this.minimapUniLocs.u_size, m, m);
      gl.uniform2f(this.minimapUniLocs.u_norm, this.normX, this.normY);
      gl.uniformMatrix3fv(this.minimapUniLocs.u_rotation, false, this.rotationMatrix);
      gl.uniform4f(this.minimapUniLocs.u_highlightColor, 1.0, 1.0, 1.0, 0.5);
      this.rectVao.draw()
    }
  }
}
