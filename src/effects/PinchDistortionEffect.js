// src/effects/PinchDistortionEffect.js
import { Uniform, Vector2 } from 'three';
import { BlendFunction, Effect } from 'postprocessing';

const fragmentShader = /* glsl */ `
  uniform float strength;
  uniform float radius;
  uniform vec2 center;

  void mainUv(inout vec2 uv) {
    vec2 delta = uv - center;
    float dist = length(delta);

    if (dist < radius) {
      float t = 1.0 - dist / radius;
      float pinch = strength * t * t;
      vec2 dir = delta / max(dist, 0.0001);

      // 중심으로 당기는 왜곡
      uv -= dir * pinch * 0.18;
    }
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    outputColor = inputColor;
  }
`;

export class PinchDistortionEffect extends Effect {
  constructor() {
    super('PinchDistortionEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['strength', new Uniform(0)],
        ['radius', new Uniform(0.36)],
        ['center', new Uniform(new Vector2(0.5, 0.5))],
      ]),
    });
  }

  setStrength(value) {
    this.uniforms.get('strength').value = Math.max(0, value);
  }

  setRadius(value) {
    this.uniforms.get('radius').value = Math.max(0.01, value);
  }

  setCenter(x, y) {
    this.uniforms.get('center').value.set(x, y);
  }
}