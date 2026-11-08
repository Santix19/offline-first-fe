// Cobalt palette mirrors --gradient-iridescent in src/styles/tokens.css:
// black -> cobalt -> electric, with ice highlights. Shader vec3 constants only; no UI hex.
export const IRIDESCENT = {
  black: [2 / 255, 4 / 255, 11 / 255] as const,
  cobalt: [11 / 255, 42 / 255, 143 / 255] as const,
  electric: [47 / 255, 107 / 255, 255 / 255] as const,
  ice: [232 / 255, 240 / 255, 255 / 255] as const,
  abyss: [5 / 255, 11 / 255, 24 / 255] as const,
} as const;

export const LIQUID_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export const LIQUID_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uPointer;
uniform float uScroll;
uniform float uIntensity;
uniform vec2 uResolution;

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
  float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 iridescent(float t) {
  vec3 black = vec3(0.0078, 0.0157, 0.0431);
  vec3 cobalt = vec3(0.0431, 0.1647, 0.5608);
  vec3 electric = vec3(0.1843, 0.4196, 1.0);
  vec3 ice = vec3(0.9098, 0.9412, 1.0);
  vec3 col = mix(black, cobalt, smoothstep(0.05, 0.55, t));
  col = mix(col, electric, smoothstep(0.55, 0.92, t));
  col = mix(col, ice, smoothstep(0.92, 1.0, t));
  return col;
}

float grain(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.05;
  vec2 drift = vec2(t * 0.4, t * 0.23 + uScroll * 1.6);
  vec2 q = vec2(fbm(p * 1.6 + drift), fbm(p * 1.6 + vec2(5.2, 1.3) - drift * 0.7));
  vec2 r = vec2(fbm(p * 1.6 + 2.4 * q + vec2(1.7 + uPointer.x * 0.9, 9.2 + uPointer.y * 0.9) + drift * 0.6), fbm(p * 1.6 + 2.6 * q + vec2(8.3, 2.8) - drift * 0.4));
  float f = fbm(p * 1.7 + 2.2 * r + uScroll * 0.7);
  float flow = clamp(f * 0.72 + r.x * 0.28, 0.0, 1.0);
  // fbm flow lives in ~0.29..0.70, so normalize it to 0..1 before the palette:
  // the ice band at the top 8% of this tone is then a real (thin) highlight.
  float tone = smoothstep(0.28, 0.72, flow);
  vec3 lava = iridescent(tone);
  vec3 abyss = vec3(0.0196, 0.0431, 0.0941);
  vec3 col = mix(abyss, lava, clamp(0.25 + uIntensity * 0.75, 0.0, 1.0));
  float shade = 0.75 + 0.5 * f;
  col *= shade;
  vec2 d = uv - 0.5 - uPointer * 0.08;
  float vig = smoothstep(0.95, 0.35, length(d * vec2(aspect * 0.7, 1.0)));
  col *= mix(0.72, 1.0, vig);
  col += (grain(uv * uResolution + fract(uTime) * 100.0) - 0.5) * 0.07;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const ORB_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPos;
uniform float uTime;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec3 displaced = position + normal * (sin(position.y * 3.0 + uTime * 0.8) * 0.06 + sin(position.x * 4.0 - uTime * 0.6) * 0.04);
  vPos = displaced;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

export const ORB_FRAG = /* glsl */ `
precision highp float;
varying vec3 vNormal;
varying vec3 vPos;
uniform float uTime;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = vec3(0.0, 0.0, 1.0);
  float fres = pow(1.0 - abs(dot(n, v)), 2.0);
  float bands = 0.5 + 0.5 * sin(vPos.x * 4.0 + vPos.y * 5.0 + uTime * 0.7 + fres * 6.0);
  vec3 body = vec3(0.0431, 0.1647, 0.5608);
  vec3 rim = vec3(0.1843, 0.4196, 1.0);
  vec3 spec = vec3(0.9098, 0.9412, 1.0);
  vec3 light = normalize(vec3(-0.45, 0.6, 0.65));
  float diffuse = max(dot(n, light), 0.0);
  // Chrome: cobalt body, electric rim on the silhouette, ice speculars on lit facets.
  vec3 col = mix(body, rim, clamp(fres * 0.85 + bands * 0.25, 0.0, 1.0));
  col *= 0.3 + diffuse * 0.75;
  float glint = pow(max(dot(n, normalize(light + v)), 0.0), 20.0);
  col += spec * glint * 0.9;
  col += spec * pow(fres, 3.0) * 0.8;
  gl_FragColor = vec4(col, 1.0);
}
`;
