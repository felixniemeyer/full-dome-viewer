#version 300 es

precision mediump float; 

uniform sampler2D domeTex;

uniform mat3 rotation; 

uniform vec2 norm; 
uniform float domeScale;

in vec2 xy;

out vec4 rgba;

const float PI = 3.14159265359;

// DomeMaster: 180° equidistant fisheye.
// Center of the square is zenith, the inscribed circle is the horizon.
// Radial distance is proportional to the angle from zenith (not sin of it).
vec2 domeMasterUv(vec3 look) {
  float xzLen = length(look.xz);
  float theta = atan(xzLen, look.y); // 0 at zenith, π/2 at horizon
  float r = theta * (2.0 / PI);
  vec2 dir = xzLen > 1e-6 ? look.xz / xzLen : vec2(0.0);
  return dir * r * domeScale + 0.5;
}

void main() {
  vec3 look = vec3(xy * norm, 1.0); 
  look = normalize(look); 
  look = rotation * look;

  rgba.rgb = look.y < -0.1 ? vec3(-look.y * 0.2) : 
    (look.y < 0.0 ? vec3(0.1 + look.y) : texture(domeTex, domeMasterUv(look)).rgb); 

  // invert
  // rgba.rgb = 1. - rgba.rgb; 

  rgba.a = 1.0;
}

