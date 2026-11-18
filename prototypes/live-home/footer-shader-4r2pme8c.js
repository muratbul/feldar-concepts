import{a as W,c as m}from"./home-54q0d5df.js";import"./home-t9p0s6g3.js";var n=`
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`,l=`
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
`,g={home:{colors:{top:[0.79,0.91,0.965],mid:[0.56,0.79,0.9],base:[0.31,0.63,0.805],deep:[0.1,0.36,0.56],accent:[0.68,0.76,0.93],pale:[0.925,0.975,0.99]},grain:1,motion:1},pricing:{colors:{top:[0.955,0.785,0.6],mid:[0.85,0.42,0.265],base:[0.65,0.255,0.205],deep:[0.28,0.09,0.105],accent:[0.965,0.525,0.3],pale:[0.99,0.88,0.73]},grain:0.82,motion:0.86},download:{colors:{top:[0.82,0.875,0.865],mid:[0.59,0.7,0.73],base:[0.3,0.41,0.48],deep:[0.11,0.16,0.19],accent:[0.455,0.749,0.894],pale:[0.9,0.93,0.925]},grain:0.82,motion:0.82},resources:{colors:{top:[0.969,0.969,0.957],mid:[0.867,0.894,0.875],base:[0.624,0.706,0.784],deep:[0.114,0.145,0.133],accent:[0.784,0.663,0.42],pale:[0.98,0.98,0.98]},grain:0.7,motion:0.72},company:{colors:{top:[0.845,0.91,0.92],mid:[0.6,0.745,0.76],base:[0.39,0.575,0.6],deep:[0.16,0.3,0.34],accent:[0.56,0.735,0.76],pale:[0.93,0.965,0.95]},grain:0.78,motion:0.8},careers:{colors:{top:[0.82,0.8,0.7],mid:[0.56,0.61,0.47],base:[0.43,0.455,0.335],deep:[0.205,0.235,0.17],accent:[0.69,0.52,0.35],pale:[0.93,0.9,0.79]},grain:0.82,motion:0.8}};function i(E){let G=E.dataset.footerShaderVariant;if(G==="pricing"||G==="download"||G==="resources"||G==="company"||G==="careers")return G;return"home"}function f(E,G,K){let I=E.createShader(G);if(!I)return null;if(E.shaderSource(I,K),E.compileShader(I),!E.getShaderParameter(I,E.COMPILE_STATUS))return console.warn(E.getShaderInfoLog(I)),E.deleteShader(I),null;return I}function r(E){let G=f(E,E.VERTEX_SHADER,n),K=f(E,E.FRAGMENT_SHADER,l);if(!G||!K)return null;let I=E.createProgram();if(!I)return null;if(E.attachShader(I,G),E.attachShader(I,K),E.linkProgram(I),E.deleteShader(G),E.deleteShader(K),!E.getProgramParameter(I,E.LINK_STATUS))return console.warn(E.getProgramInfoLog(I)),E.deleteProgram(I),null;return I}function t(E){let G=i(E),K=g[G],I=window.matchMedia("(prefers-reduced-motion: reduce)"),O=document.createElement("canvas");O.className=`footer-shader-canvas footer-shader-canvas--${G}`,O.setAttribute("aria-hidden","true"),O.dataset.footerShader=G,E.dataset.footerShaderVariant=G,E.prepend(O);let j=null,J=null,X=null,C=-1,R=null,D=null,F=null,y=null,B=null,T=null,b=null,x=null,P=null,V=null,Y=0,Z=0,_=0,U=!1,H=!1,$=performance.now(),Q=W()?$:null,A=0,h=()=>{if(j)return!0;if(j=O.getContext("webgl",{antialias:!1,depth:!1,stencil:!1,alpha:!1,powerPreference:"low-power"}),!j)return!1;if(J=r(j),!J)return!1;if(X=j.createBuffer(),!X)return!1;return C=j.getAttribLocation(J,"a_position"),R=j.getUniformLocation(J,"u_resolution"),D=j.getUniformLocation(J,"u_time"),F=j.getUniformLocation(J,"u_color_top"),y=j.getUniformLocation(J,"u_color_mid"),B=j.getUniformLocation(J,"u_color_base"),T=j.getUniformLocation(J,"u_color_deep"),b=j.getUniformLocation(J,"u_color_accent"),x=j.getUniformLocation(J,"u_color_pale"),P=j.getUniformLocation(J,"u_motion"),V=j.getUniformLocation(J,"u_grain"),j.bindBuffer(j.ARRAY_BUFFER,X),j.bufferData(j.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),j.STATIC_DRAW),!0},p=()=>{if(!j)return;let N=O.getBoundingClientRect(),q=Math.min(window.devicePixelRatio||1,1.25),S=Math.max(1,Math.floor(N.width*q)),L=Math.max(1,Math.floor(N.height*q));if(S===Z&&L===_)return;Z=S,_=L,O.width=Z,O.height=_,j.viewport(0,0,Z,_)},M=(N)=>{if(!h()||!j||!J||!X)return;p(),j.useProgram(J),j.bindBuffer(j.ARRAY_BUFFER,X),j.enableVertexAttribArray(C),j.vertexAttribPointer(C,2,j.FLOAT,!1,0,0),j.uniform2f(R,Z,_),j.uniform1f(D,(N-$)/1000),j.uniform3fv(F,K.colors.top),j.uniform3fv(y,K.colors.mid),j.uniform3fv(B,K.colors.base),j.uniform3fv(T,K.colors.deep),j.uniform3fv(b,K.colors.accent),j.uniform3fv(x,K.colors.pale),j.uniform1f(P,K.motion),j.uniform1f(V,K.grain),j.drawArrays(j.TRIANGLES,0,3)},z=()=>{cancelAnimationFrame(Y),Y=0},v=(N)=>{if(!U||document.hidden){z();return}if(N-A>=33)M(N),A=N;if(!I.matches)Y=requestAnimationFrame(v)},k=()=>{if(document.hidden)return;if(I.matches||Q!==null){if(!H)M(Q??$),H=!0;return}if(Y)return;Y=requestAnimationFrame(v)},d=new IntersectionObserver((N)=>{let[q]=N;if(U=Boolean(q?.isIntersecting),U){if(Q===null)$=performance.now();k()}else z()},{rootMargin:"160px 0px",threshold:0.05}),c=()=>{if(document.hidden)z();else if(U)k()},w=()=>{if(!U)return;H=!1,z(),k()},s=()=>{if(W()){Q=performance.now(),z();return}if(Q!==null)$+=performance.now()-Q,Q=null;if(U)k()};d.observe(E),window.addEventListener("resize",w),document.addEventListener("visibilitychange",c),I.addEventListener?.("change",w),m(s)}function u(){let E=Array.from(document.querySelectorAll(".footer-cta"));for(let G of E){if(G.__feldarFooterShaderMounted)continue;G.__feldarFooterShaderMounted=!0,t(G)}}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",u);else u();export{u as initFooterShader};
