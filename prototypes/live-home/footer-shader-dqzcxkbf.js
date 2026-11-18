import"./home-nfjt25qb.js";var z={home:{colors:{top:[0.79,0.91,0.965],mid:[0.56,0.79,0.9],base:[0.31,0.63,0.805],deep:[0.1,0.36,0.56],accent:[0.68,0.76,0.93],pale:[0.925,0.975,0.99]},grain:1,motion:1},pricing:{colors:{top:[0.955,0.785,0.6],mid:[0.85,0.42,0.265],base:[0.65,0.255,0.205],deep:[0.28,0.09,0.105],accent:[0.965,0.525,0.3],pale:[0.99,0.88,0.73]},grain:0.82,motion:0.86},download:{colors:{top:[0.82,0.875,0.865],mid:[0.59,0.7,0.73],base:[0.3,0.41,0.48],deep:[0.11,0.16,0.19],accent:[0.455,0.749,0.894],pale:[0.9,0.93,0.925]},grain:0.82,motion:0.82},resources:{colors:{top:[0.969,0.969,0.957],mid:[0.867,0.894,0.875],base:[0.624,0.706,0.784],deep:[0.114,0.145,0.133],accent:[0.784,0.663,0.42],pale:[0.98,0.98,0.98]},grain:0.7,motion:0.72},company:{colors:{top:[0.845,0.91,0.92],mid:[0.6,0.745,0.76],base:[0.39,0.575,0.6],deep:[0.16,0.3,0.34],accent:[0.56,0.735,0.76],pale:[0.93,0.965,0.95]},grain:0.78,motion:0.8},careers:{colors:{top:[0.82,0.8,0.7],mid:[0.56,0.61,0.47],base:[0.43,0.455,0.335],deep:[0.205,0.235,0.17],accent:[0.69,0.52,0.35],pale:[0.93,0.9,0.79]},grain:0.82,motion:0.8}};function H(o){let t=o.dataset.footerShaderVariant;if(t==="pricing"||t==="download"||t==="resources"||t==="company"||t==="careers")return t;return"home"}function B(o,t,a){let r=o.createShader(t);if(!r)return null;if(o.shaderSource(r,a),o.compileShader(r),!o.getShaderParameter(r,o.COMPILE_STATUS))return console.warn(o.getShaderInfoLog(r)),o.deleteShader(r),null;return r}function N(o){let t=B(o,o.VERTEX_SHADER,`
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`),a=B(o,o.FRAGMENT_SHADER,`
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color_top;
uniform vec3 u_color_mid;
uniform vec3 u_color_base;
uniform vec3 u_color_deep;
uniform vec3 u_color_accent;
uniform vec3 u_color_pale;
uniform float u_motion;
uniform float u_grain;
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
    mat2 m = mat2(0.82, -0.57, 0.57, 0.82);

    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p = m * p * 2.02 + 11.7;
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
    float t = u_time * 0.045 * u_motion;

    vec2 flow = vec2(
        fbm(p * 1.18 + vec2(t * 0.42, -t * 0.18)),
        fbm(p * 1.05 + vec2(-t * 0.22, t * 0.34))
    ) - 0.5;

    vec2 q = p + flow * 0.28;
    q.x += sin(p.y * 3.0 + t * 1.25) * 0.025;
    q.y += cos(p.x * 2.4 - t * 1.05) * 0.020;

    float vertical = smoothstep(0.0, 1.0, uv.y);
    vec3 color = mix(u_color_top, u_color_base, smoothstep(0.10, 0.64, vertical));
    color = mix(color, u_color_deep, smoothstep(0.55, 1.0, vertical) * 0.82);

    float horizon = lobe(q, vec2(0.0, -0.05), vec2(1.28, 0.34), 0.0);
    float coolLift = lobe(q, vec2(-0.30, -0.36), vec2(0.70, 0.32), -0.08);
    float softSweep = lobe(q, vec2(0.28, -0.18), vec2(0.82, 0.26), 0.12);
    color = mix(color, u_color_mid, horizon * 0.24);
    color = mix(color, u_color_accent, coolLift * 0.20);
    color = mix(color, u_color_pale, softSweep * 0.18);

    float wovenA = fbm(q * vec2(7.0, 2.3) + vec2(t * 0.52, -t * 0.28));
    float wovenB = fbm(q * vec2(2.2, 8.4) + vec2(-t * 0.36, t * 0.30));
    float texture = wovenA * 0.55 + wovenB * 0.45;
    color += (texture - 0.5) * (0.075 * u_grain);

    float grain = hash(gl_FragCoord.xy + floor(u_time * 18.0));
    color += (grain - 0.5) * (0.045 * u_grain);

    float topLight = 1.0 - smoothstep(0.02, 0.56, uv.y);
    color = mix(color, u_color_pale, topLight * 0.22);

    float vignette = smoothstep(1.28, 0.25, length(p * vec2(0.72, 1.10)));
    color = mix(color * 0.86, color, vignette);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`);if(!t||!a)return null;let r=o.createProgram();if(!r)return null;if(o.attachShader(r,t),o.attachShader(r,a),o.linkProgram(r),o.deleteShader(t),o.deleteShader(a),!o.getProgramParameter(r,o.LINK_STATUS))return console.warn(o.getProgramInfoLog(r)),o.deleteProgram(r),null;return r}function O(o){let t=H(o),a=z[t],r=window.matchMedia("(prefers-reduced-motion: reduce)"),c=document.createElement("canvas");c.className=`footer-shader-canvas footer-shader-canvas--${t}`,c.setAttribute("aria-hidden","true"),c.dataset.footerShader=t,o.dataset.footerShaderVariant=t,o.prepend(c);let e=null,n=null,l=null,v=-1,g=null,L=null,S=null,x=null,w=null,A=null,y=null,U=null,F=null,R=null,u=0,f=0,m=0,s=!1,h=!1,b=performance.now(),E=0,q=()=>{if(e)return!0;if(e=c.getContext("webgl",{antialias:!1,depth:!1,stencil:!1,alpha:!1,powerPreference:"low-power"}),!e)return!1;if(n=N(e),!n)return!1;if(l=e.createBuffer(),!l)return!1;return v=e.getAttribLocation(n,"a_position"),g=e.getUniformLocation(n,"u_resolution"),L=e.getUniformLocation(n,"u_time"),S=e.getUniformLocation(n,"u_color_top"),x=e.getUniformLocation(n,"u_color_mid"),w=e.getUniformLocation(n,"u_color_base"),A=e.getUniformLocation(n,"u_color_deep"),y=e.getUniformLocation(n,"u_color_accent"),U=e.getUniformLocation(n,"u_color_pale"),F=e.getUniformLocation(n,"u_motion"),R=e.getUniformLocation(n,"u_grain"),e.bindBuffer(e.ARRAY_BUFFER,l),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),!0},V=()=>{if(!e)return;let i=c.getBoundingClientRect(),p=Math.min(window.devicePixelRatio||1,1.25),P=Math.max(1,Math.floor(i.width*p)),T=Math.max(1,Math.floor(i.height*p));if(P===f&&T===m)return;f=P,m=T,c.width=f,c.height=m,e.viewport(0,0,f,m)},G=(i)=>{if(!q()||!e||!n||!l)return;V(),e.useProgram(n),e.bindBuffer(e.ARRAY_BUFFER,l),e.enableVertexAttribArray(v),e.vertexAttribPointer(v,2,e.FLOAT,!1,0,0),e.uniform2f(g,f,m),e.uniform1f(L,(i-b)/1000),e.uniform3fv(S,a.colors.top),e.uniform3fv(x,a.colors.mid),e.uniform3fv(w,a.colors.base),e.uniform3fv(A,a.colors.deep),e.uniform3fv(y,a.colors.accent),e.uniform3fv(U,a.colors.pale),e.uniform1f(F,a.motion),e.uniform1f(R,a.grain),e.drawArrays(e.TRIANGLES,0,3)},d=()=>{cancelAnimationFrame(u),u=0},M=(i)=>{if(!s||document.hidden){d();return}if(i-E>=33)G(i),E=i;if(!r.matches)u=requestAnimationFrame(M)},_=()=>{if(document.hidden)return;if(r.matches){if(!h)G(b),h=!0;return}if(u)return;u=requestAnimationFrame(M)},I=new IntersectionObserver((i)=>{let[p]=i;if(s=Boolean(p?.isIntersecting),s)b=performance.now(),_();else d()},{rootMargin:"160px 0px",threshold:0.05}),D=()=>{if(document.hidden)d();else if(s)_()},W=()=>{if(!s)return;h=!1,d(),_()};I.observe(o),window.addEventListener("resize",W),document.addEventListener("visibilitychange",D),r.addEventListener?.("change",W)}function C(){let o=Array.from(document.querySelectorAll(".footer-cta"));for(let t of o){if(t.__feldarFooterShaderMounted)continue;t.__feldarFooterShaderMounted=!0,O(t)}}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",C);else C();export{C as initFooterShader};
