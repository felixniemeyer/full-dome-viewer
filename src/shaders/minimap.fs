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
    float r = length(uv2c) / 0.5; // because domeScale = 0.5
    vec2 dir;
    if (r > 0.0) {
        dir = uv2c / r;
    } else {
        dir = vec2(0.0); // direction undefined at center
    }
    float theta = r * (3.141592653589793 / 2.0); // theta = r * PI/2
    // Reconstruct look_rot: look.y = cos(theta), look.xz = dir * sin(theta)
    vec3 look_rot;
    look_rot.x = dir.x * sin(theta);
    look_rot.y = cos(theta);
    look_rot.z = dir.y * sin(theta);
    // look_rot should be unit length (since dir is unit and sin^2+cos^2=1)

    // Undo rotation: look_norm = transpose(u_rotation) * look_rot
    // Since u_rotation is a pure rotation matrix, its inverse is its transpose.
    vec3 look_norm;
    look_norm.x = u_rotation[0][0] * look_rot.x + u_rotation[1][0] * look_rot.y + u_rotation[2][0] * look_rot.z;
    look_norm.y = u_rotation[0][1] * look_rot.x + u_rotation[1][1] * look_rot.y + u_rotation[2][1] * look_rot.z;
    look_norm.z = u_rotation[0][2] * look_rot.x + u_rotation[1][2] * look_rot.y + u_rotation[2][2] * look_rot.z;
    // look_norm should be unit length as well

    // Recover xy from look_norm: look_norm = s * vec3(xy * u_norm, 1.0) for some s > 0
    bool visible = false;
    vec2 xy_candidate;
    if (look_norm.z > 0.0) {
        float s = look_norm.z;
        xy_candidate.x = look_norm.x / (s * u_norm.x);
        xy_candidate.y = look_norm.y / (s * u_norm.y);
        if (abs(xy_candidate.x) <= 1.0 && abs(xy_candidate.y) <= 1.0) {
            visible = true;
        }
    }

    // Darken non-visible regions
    if (!visible) {
        col *= 0.2;
    }

    // Optional: draw a subtle border around the viewport
    float edge = 0.01; // border thickness in xy space
    bool nearEdge = (abs(xy_candidate.x) > 1.0 - edge && abs(xy_candidate.x) <= 1.0) ||
                    (abs(xy_candidate.y) > 1.0 - edge && abs(xy_candidate.y) <= 1.0);
    if (nearEdge && visible) {
        col = mix(col, vec4(1.0, 1.0, 1.0, 0.5), 0.5);
    }

    rgba = col;
}