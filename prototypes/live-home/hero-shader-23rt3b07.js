import"./home-nfjt25qb.js";function m(o,e,r){let t=o.createShader(e);if(!t)return null;if(o.shaderSource(t,r),o.compileShader(t),!o.getShaderParameter(t,o.COMPILE_STATUS))return console.warn(o.getShaderInfoLog(t)),o.deleteShader(t),null;return t}function _(o,e){let r=m(o,o.VERTEX_SHADER,`
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`),t=m(o,o.FRAGMENT_SHADER,e);if(!r||!t)return null;let c=o.createProgram();if(!c)return null;if(o.attachShader(c,r),o.attachShader(c,t),o.linkProgram(c),o.deleteShader(r),o.deleteShader(t),!o.getProgramParameter(c,o.LINK_STATUS))return console.warn(o.getProgramInfoLog(c)),o.deleteProgram(c),null;return c}function C(o){let e=o.getContext("webgl",{antialias:!1,depth:!1,stencil:!1,alpha:!1,powerPreference:"high-performance"});if(!e)return;let r=_(e,`
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_uv;

float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

mat2 rotate2d(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 m = mat2(0.84, -0.54, 0.54, 0.84);

    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p = m * p * 2.03 + 17.13;
        amplitude *= 0.5;
    }

    return value;
}

float lobe(vec2 p, vec2 center, vec2 radius, float angle) {
    vec2 d = rotate2d(angle) * (p - center);
    d /= radius;
    return exp(-dot(d, d));
}

void main() {
    vec2 uv = v_uv;
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    vec2 p = (uv - 0.5) * aspect;
    float t = u_time * 0.065;

    vec2 flow = vec2(
        fbm(p * 1.25 + vec2(t * 0.45, -t * 0.18)),
        fbm(p * 1.18 + vec2(-t * 0.16, t * 0.40))
    ) - 0.5;

    vec2 fineFlow = vec2(
        fbm(p * 3.2 + vec2(-t * 0.9, t * 0.22)),
        fbm(p * 3.0 + vec2(t * 0.28, t * 0.72))
    ) - 0.5;

    vec2 q = p + flow * 0.34 + fineFlow * 0.055;
    q += 0.035 * vec2(
        sin((p.y * 3.6 + p.x * 1.2) + t * 1.7),
        cos((p.x * 3.1 - p.y * 1.4) - t * 1.4)
    );

    vec3 skyTop = vec3(0.285, 0.505, 0.790);
    vec3 skyMid = vec3(0.455, 0.690, 0.910);
    vec3 skyLow = vec3(0.680, 0.825, 0.955);
    vec3 sphereBlue = vec3(0.640, 0.805, 0.955);
    vec3 spherePale = vec3(0.865, 0.955, 1.000);
    vec3 cloudWhite = vec3(0.955, 0.990, 1.000);

    float vertical = smoothstep(0.0, 1.0, uv.y);
    vec3 color = mix(skyLow, skyTop, vertical);
    color = mix(color, skyMid, lobe(q, vec2(0.0, 0.06), vec2(0.92, 0.56), 0.0) * 0.34);

    vec2 sphereCenter = vec2(0.0, -0.26);
    vec2 sphereRadius = vec2(1.04, 0.76);
    vec2 sphereUv = (q - sphereCenter) / sphereRadius;
    float sphereDistance = length(sphereUv);
    float sphereMask = 1.0 - smoothstep(0.90, 1.14, sphereDistance);
    float sphereFeather = 1.0 - smoothstep(0.62, 1.08, sphereDistance);
    float rim = exp(-pow((sphereDistance - 0.94) * 3.6, 2.0));

    float z = sqrt(max(0.0, 1.0 - dot(sphereUv, sphereUv)));
    vec3 normal = normalize(vec3(sphereUv * vec2(0.72, 0.92), z));
    float light = clamp(dot(normal, normalize(vec3(-0.18, 0.62, 1.0))), 0.0, 1.0);

    vec2 cloudDrift = sphereUv;
    cloudDrift.x += t * 0.68 + fbm(sphereUv * 1.7 + vec2(t * 0.25, -t * 0.14)) * 0.16;
    cloudDrift.y += sin(sphereUv.x * 2.7 + t * 1.1) * 0.045;

    float lowCloud = fbm(cloudDrift * vec2(2.0, 1.08) + vec2(-t * 0.54, t * 0.18));
    float highCloud = fbm(cloudDrift * vec2(5.1, 2.6) + vec2(t * 0.72, -t * 0.34));
    float streaks = fbm(vec2(cloudDrift.x * 1.45 + t * 0.42, cloudDrift.y * 7.4 - t * 0.62));
    float cloud = smoothstep(0.40, 0.78, lowCloud * 0.72 + highCloud * 0.24 + streaks * 0.28);
    float mist = smoothstep(0.32, 0.78, fbm(vec2(cloudDrift.x * 1.1 - t * 0.30, cloudDrift.y * 4.8 + t * 0.48)));

    float cloudLift =
        lobe(q, vec2(-0.50, -0.02), vec2(0.26, 0.13), -0.20) +
        lobe(q, vec2(-0.10, 0.08), vec2(0.34, 0.16), 0.16) +
        lobe(q, vec2(0.44, -0.04), vec2(0.30, 0.16), 0.28) +
        lobe(q, vec2(0.58, 0.12), vec2(0.22, 0.12), -0.18);

    vec3 sphereColor = mix(sphereBlue, spherePale, light * 0.72 + 0.22);
    sphereColor = mix(sphereColor, cloudWhite, cloud * sphereMask * 0.42);
    sphereColor = mix(sphereColor, cloudWhite, mist * sphereMask * 0.24);
    sphereColor = mix(sphereColor, cloudWhite, cloudLift * sphereMask * 0.38);
    sphereColor -= (1.0 - cloud) * sphereMask * vec3(0.025, 0.050, 0.085);

    color = mix(color, sphereColor, sphereMask * 0.96);
    color = mix(color, cloudWhite, rim * 0.46);

    float skyMist =
        lobe(q, vec2(-0.30, 0.10), vec2(0.48, 0.18), 0.18) +
        lobe(q, vec2(0.36, 0.08), vec2(0.50, 0.20), -0.15);
    color = mix(color, vec3(0.730, 0.875, 0.980), skyMist * 0.18);

    float domeCap = lobe(q, vec2(0.0, 0.36), vec2(0.86, 0.20), 0.0);
    float sideClouds =
        lobe(q, vec2(-0.54, 0.12), vec2(0.32, 0.18), -0.24) +
        lobe(q, vec2(-0.48, -0.15), vec2(0.28, 0.20), 0.28) +
        lobe(q, vec2(0.50, 0.02), vec2(0.32, 0.22), 0.18) +
        lobe(q, vec2(0.58, 0.22), vec2(0.26, 0.16), -0.20);
    float cloudShadows =
        lobe(q, vec2(-0.42, 0.02), vec2(0.28, 0.10), 0.12) +
        lobe(q, vec2(-0.10, -0.03), vec2(0.30, 0.11), -0.22) +
        lobe(q, vec2(0.45, 0.08), vec2(0.28, 0.12), 0.20) +
        lobe(q, vec2(0.58, -0.10), vec2(0.22, 0.12), -0.10);
    float exposedMist = smoothstep(
        0.42,
        0.82,
        fbm(q * vec2(2.4, 3.8) + vec2(-t * 0.95, t * 0.36))
    );
    color = mix(color, cloudWhite, domeCap * 0.38);
    color = mix(color, vec3(0.840, 0.945, 1.000), sideClouds * (0.34 + exposedMist * 0.24));
    color = mix(color, vec3(0.500, 0.690, 0.900), cloudShadows * (0.16 + (1.0 - exposedMist) * 0.12));

    float cellular = fbm(q * 8.0 + vec2(t * 1.2, -t * 0.8));
    float softGrain = fbm(q * 25.0 + 9.0);
    color += (cellular - 0.5) * 0.030;
    color += (softGrain - 0.5) * 0.018;

    float pixelGrain = hash(gl_FragCoord.xy + floor(u_time * 24.0));
    color += (pixelGrain - 0.5) * 0.095;

    float vignette = smoothstep(1.32, 0.22, length(p * vec2(0.82, 1.05)));
    color = mix(color * 0.92, color, vignette);
    color = mix(color, vec3(0.780, 0.890, 0.990), sphereFeather * 0.08);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`);if(!r)return;let t=e.createBuffer();if(!t)return;let c=e.getAttribLocation(r,"a_position"),x=e.getUniformLocation(r,"u_resolution"),b=e.getUniformLocation(r,"u_time");e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);let s=window.matchMedia("(prefers-reduced-motion: reduce)"),n=0,g=performance.now(),a=0,i=0,S=()=>{let l=o.getBoundingClientRect(),f=Math.min(window.devicePixelRatio||1,1.6),h=Math.max(1,Math.floor(l.width*f)),u=Math.max(1,Math.floor(l.height*f));if(h===a&&u===i)return;a=h,i=u,o.width=a,o.height=i,e.viewport(0,0,a,i)},v=(l)=>{if(S(),e.useProgram(r),e.bindBuffer(e.ARRAY_BUFFER,t),e.enableVertexAttribArray(c),e.vertexAttribPointer(c,2,e.FLOAT,!1,0,0),e.uniform2f(x,a,i),e.uniform1f(b,(l-g)/1000),e.drawArrays(e.TRIANGLES,0,3),!s.matches&&!document.hidden)n=requestAnimationFrame(v)},d=()=>{cancelAnimationFrame(n),n=requestAnimationFrame(v)},y=()=>{if(document.hidden||s.matches){cancelAnimationFrame(n);return}d()};window.addEventListener("resize",d),document.addEventListener("visibilitychange",y),s.addEventListener?.("change",d),v(performance.now())}function p(){let o=Array.from(document.querySelectorAll("[data-hero-shader]"));for(let e of o){if(e.__feldarHeroShaderMounted)continue;e.__feldarHeroShaderMounted=!0,C(e)}}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",p);else p();export{p as initHeroShader};
