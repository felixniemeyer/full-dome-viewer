#version 300 es

precision mediump float; 

uniform sampler2D domeTex;

uniform mat3 rotation; 

uniform vec2 norm; 

in vec2 xy;

out vec4 rgba;

void main() {
  vec3 look = vec3(xy * norm, 1.0); 
  look = normalize(look); 
  look = rotation * look;

  rgba.rgb = mod(look * 10., vec3(1.)); 

  if(look.y > 0.0) {
    rgba = texture(domeTex, look.xz * 0.5 + 0.5);
  }
}

