#version 300 es

precision mediump float;
uniform sampler2D domeTex;
uniform vec2 u_offset; // lower-left corner of minimap in window pixels
uniform vec2 u_size;   // width,height of minimap in pixels
uniform vec2 u_norm;   // norm from main shader (horizontal/vertical scale)
uniform mat3 u_rotation; // rotation matrix from main shader (same as used in main render)
uniform vec4 u_highlightColor; // e.g., vec4(1.0,1.0,1.0,0.5)

in vec2 xy; // from vertex shader (range -1 to 1)
out vec4 rgba;

void main() {
    // window coordinates of fragment
    vec2 uv = (gl_FragCoord.xy - u_offset) / u_size; // [0,1] within minimap
    // discard outside the inscribed circle
    vec2 uv2 = uv * 2.0 - 1.0; // map to [-1,1]
    if (dot(uv2, uv2) > 1.0) {
        discard;
    }
    vec4 col = texture(domeTex, uv);

    // Inverse domeMasterUv to get the direction after rotation (look_rot)
    // domeMasterUv: UV = dir * r * domeScale + 0.5, where r = theta * (2.0/PI), dir = normalize(xz), domeScale = 0.5
    vec2 uv2c = uv - 0.5;
    float len = length(uv2c);
    vec2 dir;
    if (len > 0.0) {
        dir = uv2c / len; // unit vector in xz plane
    } else {
        dir = vec2(0.0); // direction undefined at center
    }
    // r = theta * (2.0/PI)  =>  theta = len * PI
    float theta = len * 3.141592653589793;
    // Reconstruct look_rot: look.y = cos(theta), look.xz = dir * sin(theta)
    vec3 look_rot;
    look_rot.x = dir.x * sin(theta);
    look_rot.y = cos(theta);
    look_rot.z = dir.y * sin(theta);
    // look_rot is unit length (dir unit, sin^2+cos^2=1)

    // Undo rotation: look_pre = transpose(u_rotation) * look_rot
    // Since u_rotation is a pure rotation matrix, its inverse is its transpose.
    vec3 look_pre;
    look_pre.x = u_rotation[0][0] * look_rot.x + u_rotation[0][1] * look_rot.y + u_rotation[0][2] * look_rot.z;
    look_pre.y = u_rotation[1][0] * look_rot.x + u_rotation[1][1] * look_rot.y + u_rotation[1][2] * look_rot.z;
    look_pre.z = u_rotation[2][0] * look_rot.x + u_rotation[2][1] * look_rot.y + u_rotation[2][2] * look_rot.z;
    // look_pre should be unit length as well

    // Viewport indicator: check if the point is within the current view
    bool visible = false;
    if (look_pre.z > 0.0) {
        vec2 ndc = look_pre.xy / (look_pre.z * u_norm);
        visible = abs(ndc.x) <= 1.0 && abs(ndc.y) <= 1.0;
    }

    // Adjust brightness: +0.3 for visible, -0.3 for non-visible
    if (visible) {
        col += 0.3;
    } else {
        col -= 0.3;
    }

    rgba = col;
}