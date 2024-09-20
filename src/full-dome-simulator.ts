import { compileShaders, makeUniformLocationAccessor } from './shader-tools'

import domeVs from './shaders/dome.vs'
import domeFs from './shaders/dome.fs'

import { RectVao } from './geometry'

import { mat3, vec3 } from 'gl-matrix'

import { loadImage } from './tex-utils'

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

  constructor() {
    this.canvas = document.getElementById("canvas") as HTMLCanvasElement
    const gl = this.gl = this.setUpWebGL(this.canvas) 

    this.program = compileShaders(gl, domeVs, domeFs)
    this.uniLocs = makeUniformLocationAccessor(gl, this.program)

    gl.useProgram(this.program)
    gl.uniform1i(this.uniLocs.domeTex, 0)

    this.rectVao = new RectVao(gl)

    this.domeTex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.domeTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)

    loadImage('test.png').then(this.setImage.bind(this))
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
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.domeTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
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
    let normY = Math.sqrt(resY / resX)
    let normX = 1 / normY

    const zoom = 1.5
    normX /= zoom
    normY /= zoom

    const gl = this.gl
    gl.useProgram(this.program)

    gl.uniform2fv(this.uniLocs.res, [resX, resY])

    console.log('norm', normX, normY)
    gl.uniform2fv(this.uniLocs.norm, [normX, normY])

    // calculate view angles, 
    this.viewAngleX = Math.asin(normX) * 2
    this.viewAngleY = Math.asin(normY) * 2
  }

  mouseDown = false
  mX = 0
  mY = 0
  xRot = 0
  yRot = 0
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

      this.canvas.addEventListener('resize', this.resize.bind(this))
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

    gl.uniformMatrix3fv(this.uniLocs.rotation, false, this.rotationMatrix)

    this.rectVao.draw()
  }
}
