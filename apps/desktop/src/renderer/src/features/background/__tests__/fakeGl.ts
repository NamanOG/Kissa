/**
 * A stand-in WebGL context for lifecycle tests. It records what was created and released and
 * how many draws happened. It does not render pixels: real rendering is checked in the app.
 */
export interface FakeGl {
  gl: WebGLRenderingContext
  live: Set<string>
  draws: number
  lost: boolean
  contextReleased: boolean
  failCompile: boolean
  failLink: boolean
}

export function makeFakeGl(opts: { failCompile?: boolean; failLink?: boolean } = {}): FakeGl {
  let n = 0
  const state: FakeGl = {
    gl: null as unknown as WebGLRenderingContext,
    live: new Set(),
    draws: 0,
    lost: false,
    contextReleased: false,
    failCompile: Boolean(opts.failCompile),
    failLink: Boolean(opts.failLink)
  }
  const make = (kind: string): string => {
    const id = `${kind}#${++n}`
    state.live.add(id)
    return id
  }
  const del = (id: unknown): void => {
    if (typeof id === 'string') state.live.delete(id)
  }
  const noop = (): void => {}
  let boundFramebuffer: unknown = null
  state.gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    TEXTURE_2D: 8,
    TEXTURE0: 9,
    TEXTURE1: 10,
    RGBA: 11,
    UNSIGNED_BYTE: 12,
    TRIANGLE_STRIP: 13,
    TEXTURE_MIN_FILTER: 14,
    TEXTURE_MAG_FILTER: 15,
    TEXTURE_WRAP_S: 16,
    TEXTURE_WRAP_T: 17,
    LINEAR: 18,
    CLAMP_TO_EDGE: 19,
    TEXTURE2: 20,
    FRAMEBUFFER: 21,
    COLOR_ATTACHMENT0: 22,
    FRAMEBUFFER_COMPLETE: 23,
    createShader: () => make('shader'),
    shaderSource: noop,
    compileShader: noop,
    getShaderParameter: () => !state.failCompile,
    getShaderInfoLog: () => 'fake',
    deleteShader: del,
    createProgram: () => make('program'),
    attachShader: noop,
    linkProgram: noop,
    bindAttribLocation: noop,
    createFramebuffer: () => make('framebuffer'),
    bindFramebuffer: (_t: number, fb: unknown) => {
      boundFramebuffer = fb
    },
    framebufferTexture2D: noop,
    checkFramebufferStatus: () => 23,
    deleteFramebuffer: del,
    getProgramParameter: () => !state.failLink,
    deleteProgram: del,
    useProgram: noop,
    createBuffer: () => make('buffer'),
    bindBuffer: noop,
    bufferData: noop,
    deleteBuffer: del,
    getAttribLocation: () => 0,
    enableVertexAttribArray: noop,
    vertexAttribPointer: noop,
    getUniformLocation: () => ({}),
    uniform1i: noop,
    uniform1f: noop,
    uniform4f: noop,
    uniform2fv: noop,
    createTexture: () => make('texture'),
    bindTexture: noop,
    texParameteri: noop,
    texImage2D: noop,
    deleteTexture: del,
    activeTexture: noop,
    viewport: noop,
    // Counts frames shown: draws to the canvas, not to the field's own target.
    drawArrays: () => {
      if (!boundFramebuffer) state.draws++
    },
    isContextLost: () => state.lost,
    getExtension: (name: string) =>
      name === 'WEBGL_lose_context'
        ? {
            loseContext: () => {
              state.contextReleased = true
            }
          }
        : null
  } as unknown as WebGLRenderingContext
  return state
}

/** A cover loader whose loads the test settles by hand, in any order. */
export function controlledCovers(): {
  load: (url: string) => Promise<TexImageSource>
  pending: Map<string, Array<{ resolve: () => void; reject: () => void }>>
  succeed: (url: string) => void
  fail: (url: string) => void
} {
  const pending = new Map<string, Array<{ resolve: () => void; reject: () => void }>>()
  const take = (url: string): { resolve: () => void; reject: () => void } => {
    const list = pending.get(url)
    const next = list?.shift()
    if (!next) throw new Error(`no pending load for ${url}`)
    return next
  }
  return {
    pending,
    load: (url) =>
      new Promise<TexImageSource>((resolve, reject) => {
        const list = pending.get(url) ?? []
        list.push({ resolve: () => resolve({} as TexImageSource), reject: () => reject(new Error('fail')) })
        pending.set(url, list)
      }),
    succeed: (url) => take(url).resolve(),
    fail: (url) => take(url).reject()
  }
}
