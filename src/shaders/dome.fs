#version 300 es

precision mediump float; 

uniform sampler2D domeTex;

uniform mat3 rotation; 

uniform vec2 norm; 
uniform float domeScale;

in vec2 xy;

out vec4 rgba;

void main() {
  vec3 look = vec3(xy * norm, 1.0); 
  look = normalize(look); 
  look = rotation * look;

  rgba.rgb = look.y < -0.1 ? vec3(-look.y * 0.2) : 
    (look.y < 0.0 ? vec3(0.1 + look.y) : texture(domeTex, look.xz * domeScale + 0.5).rgb); 

  // invert
  // rgba.rgb = 1. - rgba.rgb; 

  rgba.a = 1.0;
}

