// src/scene/createCosmos.js
import * as THREE from 'three';
import {
  createReactiveStarLayer,
  updateReactiveLayer,
} from './reactiveStars.js';
import { createNebulaSprite } from './nebulaUtils.js';

export function createCosmos(scene) {
  const starsBack = createReactiveStarLayer(
    2200,
    90,
    55,
    -140,
    -70,
    0.032,
    0.9
  );

  const starsMid = createReactiveStarLayer(
    1500,
    62,
    40,
    -65,
    -18,
    0.045,
    0.76
  );

  const starsFront = createReactiveStarLayer(
    680,
    35,
    23,
    -16,
    8,
    0.062,
    0.44
  );

  scene.add(starsBack.points);
  scene.add(starsMid.points);
  scene.add(starsFront.points);

  const nebulaGroup = new THREE.Group();
  scene.add(nebulaGroup);

  nebulaGroup.add(createNebulaSprite(0x244a9b, -10, 5, -42, 26, 0.16));
  nebulaGroup.add(createNebulaSprite(0x2d5bb8, 9, -4, -38, 22, 0.13));

  nebulaGroup.add(createNebulaSprite(0x5b2d91, 6, 4, -34, 18, 0.11));
  nebulaGroup.add(createNebulaSprite(0x7a3ca2, -7, -5, -30, 16, 0.09));

  nebulaGroup.add(createNebulaSprite(0x9a3450, 0, 1, -28, 14, 0.06));
  nebulaGroup.add(createNebulaSprite(0xb44a38, 4, 0, -26, 12, 0.04));

  nebulaGroup.add(createNebulaSprite(0xb89958, -2, -3, -32, 15, 0.035));

  const foregroundMist = new THREE.Group();
  scene.add(foregroundMist);

  foregroundMist.add(createNebulaSprite(0x1f3f7a, -6, 3, -8, 10, 0.035));
  foregroundMist.add(createNebulaSprite(0x4d2c6e, 5, -2, -7, 9, 0.03));
  foregroundMist.add(createNebulaSprite(0x7a2a36, 0, 0, -6, 8, 0.02));

  return {
    starsBack,
    starsMid,
    starsFront,
    nebulaGroup,
    foregroundMist,
    singularity: new THREE.Vector3(0, 0, -1.2),
    intensity: 0,
    absorption: 0,
    visibility: 1,
    time: 0,
    theme: 'red',

    setVisibility(visibility) {
      this.visibility = THREE.MathUtils.clamp(visibility, 0, 1);
    },

    setAbsorption(absorption) {
      this.absorption = THREE.MathUtils.clamp(absorption, 0, 1);
    },

    setTheme(theme) {
      this.theme = theme;
    },

    setSingularity(position, intensity) {
      this.singularity.copy(position);
      this.intensity = THREE.MathUtils.lerp(this.intensity, intensity, 0.16);
    },

    update(deltaTime) {
      this.time += deltaTime;

      updateReactiveLayer(
        this.starsBack,
        this.singularity,
        this.intensity * 0.82,
        deltaTime,
        this.time,
        this.absorption,
        this.theme
      );

      updateReactiveLayer(
        this.starsMid,
        this.singularity,
        this.intensity * 1.16,
        deltaTime,
        this.time,
        this.absorption,
        this.theme
      );

      updateReactiveLayer(
        this.starsFront,
        this.singularity,
        this.intensity * 1.55,
        deltaTime,
        this.time,
        this.absorption,
        this.theme
      );

      this.nebulaGroup.rotation.y += deltaTime * 0.003;
      this.nebulaGroup.rotation.z += deltaTime * 0.0012;

      this.foregroundMist.rotation.z -= deltaTime * 0.002;
      this.foregroundMist.rotation.y += deltaTime * 0.001;

      for (let i = 0; i < this.nebulaGroup.children.length; i++) {
        const sprite = this.nebulaGroup.children[i];

        sprite.position.x += Math.sin(this.time * 0.08 + i) * 0.002;
        sprite.position.y += Math.cos(this.time * 0.06 + i * 0.7) * 0.0015;
      }

      this.starsBack.points.material.opacity = 0.9 * this.visibility;
      this.starsMid.points.material.opacity = 0.76 * this.visibility;
      this.starsFront.points.material.opacity = 0.44 * this.visibility;
    },
  };
}