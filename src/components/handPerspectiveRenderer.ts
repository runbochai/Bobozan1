import type { HandWarp } from '../logic/handPerspective';

const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position; gl_Position = vec4(position.x * 2.0 - 1.0, 1.0 - position.y * 2.0, 0.0, 1.0); }
`;
const FRAGMENT = `
precision highp float;
uniform sampler2D frame;
uniform vec2 center;
uniform vec2 axis;
uniform vec2 radius;
uniform float magnification;
varying vec2 uv;
void main() {
  vec2 pixel = uv * vec2(192.0, 256.0);
  vec2 delta = pixel - center;
  vec2 local = vec2(dot(delta, axis), dot(delta, vec2(-axis.y, axis.x))) / radius;
  float distance = length(local);
  if (distance >= 1.0) { gl_FragColor = texture2D(frame, uv); return; }
  float weight = 1.0 - smoothstep(0.55, 1.0, distance);
  float factor = 1.0 + (magnification - 1.0) * weight;
  vec2 sampleUV = (center + delta / factor) / vec2(192.0, 256.0);
  gl_FragColor = texture2D(frame, sampleUV);
}
`;

interface Renderer {
  draw: (image: HTMLImageElement, column: number, row: number, region: HandWarp, scale: number, target: CanvasRenderingContext2D) => boolean;
  listeners: Set<() => void>;
  dispose: () => void;
}

let shared: Renderer | null = null;

/** One tiny GL context for the entire table; only cropped cells enter GPU memory. */
function makeRenderer(): Renderer | null {
  const canvas = document.createElement('canvas');
  canvas.width = 192; canvas.height = 256;
  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: true,
  });
  if (!gl) return null;
  const textures = new Map<string, WebGLTexture>();
  const shaders: WebGLShader[] = [];
  const listeners = new Set<() => void>();
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let disposed = false;
  let lost = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    textures.forEach(texture => gl.deleteTexture(texture));
    textures.clear();
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.width = canvas.height = 1;
  };
  canvas.addEventListener('webglcontextlost', () => {
    if (disposed) return;
    lost = true;
    listeners.forEach(listener => listener());
  });
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader unavailable');
      shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader unsupported');
    }
    program = gl.createProgram();
    if (!program) throw new Error('Program unavailable');
    shaders.forEach(shader => gl.attachShader(program!, shader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program unsupported');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('Buffer unavailable');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(['center', 'axis', 'radius', 'magnification', 'frame']
      .map(name => [name, gl.getUniformLocation(program!, name)]));
    gl.uniform1i(uniforms.frame, 0);
    gl.disable(gl.DITHER);
    gl.viewport(0, 0, 192, 256);
    const crop = document.createElement('canvas');
    crop.width = 192; crop.height = 256;
    const context = crop.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.imageSmoothingEnabled = false;
    return {
      listeners, dispose,
      draw(image, column, row, region, scale, target) {
        if (disposed || lost || gl.isContextLost()) return false;
        try {
          const key = `${image.currentSrc || image.src}:${column}:${row}`;
          let texture = textures.get(key);
          if (!texture) {
            const created = gl.createTexture();
            if (!created) return false;
            texture = created;
            const width = image.naturalWidth / 8, height = image.naturalHeight / 4;
            context.clearRect(0, 0, 192, 256);
            context.drawImage(image, column * width, row * height, width, height, 0, 0, 192, 256);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, crop);
            if (gl.getError() !== gl.NO_ERROR) { gl.deleteTexture(texture); return false; }
            textures.set(key, texture);
          } else gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform2f(uniforms.center, region.center.x, region.center.y);
          gl.uniform2f(uniforms.axis, region.axis.x, region.axis.y);
          gl.uniform2f(uniforms.radius, region.along, region.across);
          gl.uniform1f(uniforms.magnification, scale);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          if (gl.isContextLost()) return false;
          target.clearRect(0, 0, 192, 256);
          target.drawImage(canvas, 0, 0);
          return true;
        } catch { return false; }
      },
    };
  } catch { dispose(); return null; }
}

export function acquireHandPerspective(onLost: () => void) {
  shared ??= makeRenderer();
  const renderer = shared;
  if (!renderer) return null;
  renderer.listeners.add(onLost);
  return {
    draw: renderer.draw,
    release() {
      renderer.listeners.delete(onLost);
      // React switches every player's pose together. Reuse across those cleanups.
      queueMicrotask(() => {
        if (renderer.listeners.size === 0) {
          renderer.dispose();
          if (shared === renderer) shared = null;
        }
      });
    },
  };
}
