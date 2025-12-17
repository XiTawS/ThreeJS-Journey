#define PI 3.1415926535897932384626433832795

varying vec2 vUv;

float random (in vec2 _st) {
    return fract(sin(dot(_st.xy, vec2(12.9898,78.233)))* 43758.5453123);
}

vec2 rotate(vec2 uv, float rotation, vec2 mid)
{
    return vec2(
      cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,
      cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) + mid.y
    );
}

//	Classic Perlin 2D Noise 
//	by Stefan Gustavson (https://github.com/stegu/webgl-noise)
//
vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

vec4 permute(vec4 x)
{
    return mod(((x*34.0)+1.0)*x, 289.0);
}

float cnoise(vec2 P){
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);
  vec4 norm = 1.79284291400159 - 0.85373472095314 * 
    vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

void main()
{
    // //Pattern 01
    // gl_FragColor = vec4(vUv.x, vUv.y, 1.0, 1.0);

    // //Pattern 02
    // gl_FragColor = vec4(vUv.x, vUv.y, 0.0, 1.0);

    // //Pattern 03
    // float strenght = vUv.x;
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 04
    // float strenght = vUv.y;
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 05
    // float strenght = 1.0 - vUv.y;
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 06
    // float strenght = vUv.y * 10.0;
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 07
    // float strenght = mod(vUv.y * 10.0, 1.0);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 08
    // float strenght = mod(vUv.y * 10.0, 1.0);

    // strenght = step(0.5, strenght);
    
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 09
    // float strenght = mod(vUv.y * 10.0, 1.0);
    // strenght = step(0.8, strenght);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 10
    // float strenght = mod(vUv.x * 10.0, 1.0);
    // strenght = smoothstep(0.8, 0.81, strenght);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 11
    // float strenght = step(0.8, mod(vUv.x * 10.0, 1.0));
    // strenght += step(0.8, mod(vUv.y * 10.0, 1.0));

    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 12
    // float strenght = step(0.8, mod(vUv.x * 10.0, 1.0));
    // strenght *= step(0.8, mod(vUv.y * 10.0, 1.0));
    
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 13
    // float strenght = step(0.4, mod(vUv.x * 10.0, 1.0));
    // strenght *= step(0.8, mod(vUv.y * 10.0, 1.0));
    
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 14
    // float barX = step(0.4, mod(vUv.x * 10.0, 1.0));
    // barX *= step(0.8, mod(vUv.y * 10.0, 1.0));

    // float barY = step(0.8, mod(vUv.x * 10.0, 1.0));
    // barY *= step(0.4, mod(vUv.y * 10.0, 1.0));

    // float strenght = barX + barY;
    
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 15
    // float barX = step(0.4, mod(vUv.x * 10.0, 1.0));
    // barX *= step(0.8, mod(vUv.y * 10.0 + 0.2, 1.0));

    // float barY = step(0.8, mod(vUv.x * 10.0 + 0.2, 1.0));
    // barY *= step(0.4, mod(vUv.y * 10.0, 1.0));

    // float strenght = barX + barY;
    
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 16
    // float strenght = abs(vUv.x -0.5);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 17
    // float strenght =min(abs(vUv.x -0.5), abs(vUv.y -0.5));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 18
    // float strenght = max(abs(vUv.x -0.5), abs(vUv.y -0.5));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 19
    // float strenght = step(0.2, max(abs(vUv.x -0.5), abs(vUv.y -0.5)));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 20
    // float square1 = step(0.2, max(abs(vUv.x -0.5), abs(vUv.y -0.5)));
    // float square2 = 1.0 - step(0.25, max(abs(vUv.x -0.5), abs(vUv.y -0.5)));
    // float strenght = square1 * square2;
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 21
    // float strenght = floor(vUv.x * 10.0) / 10.0;
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 22
    // float strenght = floor(vUv.x * 10.0) / 10.0;
    // strenght *= floor(vUv.y * 10.0) / 10.0;
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 23
    // float strenght = random(vUv);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 24
    // vec2 gridUv = vec2(floor(vUv.x * 10.0) / 10.0, floor(vUv.y * 10.0) / 10.0);
    // float strenght = random(gridUv);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 25
    // vec2 gridUv = vec2(
    //     floor(vUv.x * 10.0) / 10.0, 
    //     floor((vUv.y + vUv.x * 0.5) * 10.0) / 10.0
    // );
    // float strenght = random(gridUv);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 26
    // float strenght = length(vUv);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 27
    // float strenght = distance(vUv, vec2(0.5));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 28
    // float strenght = 1.0 - distance(vUv, vec2(0.5));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 29
    // float strenght = 0.015 / distance(vUv, vec2(0.5));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 30
    // vec2 lightUv = vec2(
    //     vUv.x * 0.1 + 0.45,
    //     vUv.y * 0.5 + 0.25
    // );
    // float strenght = 0.015 / distance(lightUv, vec2(0.5));
    
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 31
    // vec2 lightUvX = vec2(vUv.x * 0.1 + 0.45,vUv.y * 0.5 + 0.25);
    // float lightX = 0.015 / distance(lightUvX, vec2(0.5));

    // vec2 lightUvY = vec2(vUv.y * 0.1 + 0.45,vUv.x * 0.5 + 0.25);
    // float lightY = 0.015 / distance(lightUvY, vec2(0.5));

    // float strenght = lightX * lightY;
    
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 32
    // vec2 rotatedUv = rotate(vUv, PI * 0.25, vec2(0.5));
    // vec2 lightUvX = vec2(rotatedUv.x * 0.1 + 0.45,rotatedUv.y * 0.5 + 0.25);
    // float lightX = 0.015 / distance(lightUvX, vec2(0.5));

    // vec2 lightUvY = vec2(rotatedUv.y * 0.1 + 0.45,rotatedUv.x * 0.5 + 0.25);
    // float lightY = 0.015 / distance(lightUvY, vec2(0.5));

    // float strenght = lightX * lightY;
    
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 33
    // float strenght = distance(vUv, vec2(0.5));
    // strenght = step(0.25, strenght);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 34
    // float strenght = abs(distance(vUv, vec2(0.5)) - 0.25);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 35
    // float strenght = step(0.01, abs(distance(vUv, vec2(0.5)) - 0.25));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 36
    // float strenght = 1.0 - step(0.01, abs(distance(vUv, vec2(0.5)) - 0.25));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 37
    // vec2 wavedUv = vec2(
    //     vUv.x,
    //     vUv.y + sin(vUv.x * 30.0) * 0.1
    // );
    // float strenght = 1.0 - step(0.01, abs(distance(wavedUv, vec2(0.5)) - 0.25));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 38
    // vec2 wavedUv = vec2(
    //     vUv.x + sin(vUv.y * 30.0) * 0.1,
    //     vUv.y + sin(vUv.x * 30.0) * 0.1
    // );
    // float strenght = 1.0 - step(0.01, abs(distance(wavedUv, vec2(0.5)) - 0.25));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 39
    // vec2 wavedUv = vec2(
    //     vUv.x + sin(vUv.y * 100.0) * 0.1,
    //     vUv.y + sin(vUv.x * 100.0) * 0.1
    // );
    // float strenght = 1.0 - step(0.01, abs(distance(wavedUv, vec2(0.5)) - 0.25));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 40
    // float angle = atan(vUv.x, vUv.y);
    // float strenght = angle;
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 41
    // float angle = atan(vUv.x - 0.5, vUv.y);
    // float strenght = sin(angle);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 42
    // float angle = atan(vUv.x - 0.5, vUv.y - 0.5);
    // angle /= PI * 2.0;
    // angle += 0.5;
    // float strenght = angle;
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 43
    // float angle = atan(vUv.x - 0.5, vUv.y - 0.5);
    // angle /= PI * 2.0;
    // angle += 0.5;
    // angle *= 20.0;
    // angle = mod(angle, 1.0);
    // float strenght = angle;
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 44
    // float angle = atan(vUv.x - 0.5, vUv.y - 0.5);
    // angle /= PI * 2.0;
    // angle += 0.5;
    // float strenght = sin(angle * 100.0);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 45
    // float angle = atan(vUv.x - 0.5, vUv.y - 0.5);
    // angle /= PI * 2.0;
    // angle += 0.5;
    // float sinusoid = sin(angle * 100.0);

    // float radius = 0.25 + sinusoid * 0.02;
    // float strenght = 1.0 - step(0.01, abs(distance(vUv, vec2(0.5)) - radius));
    
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 46
    // float strenght = cnoise(vUv * 10.0);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 47
    // float strenght = step(0.0, cnoise(vUv * 10.0));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 48
    // float strenght = 1.0 - abs(cnoise(vUv * 10.0));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 49
    // float strenght =sin(cnoise(vUv * 10.0) * 20.0);
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    // //Pattern 50
    // float strenght =step(0.9, sin(cnoise(vUv * 10.0) * 20.0));
    // gl_FragColor = vec4(vec3(strenght), 1.0);

    //Colored version

    float strenght = step(0.9, sin(cnoise(vUv * 10.0) * 20.0));
    
    //Clamp the strenght
    strenght = clamp(strenght, 0.0, 1.0);
    
    vec3 blackColor = vec3(0.0);
    vec3 uvColor = vec3(vUv, 1.0);
    vec3 mixedColor = mix(blackColor, uvColor, strenght);

    gl_FragColor = vec4(mixedColor, 1.0);
    
}