import{a as u,s as c}from"./visual-element-BFqWQ40i.js";import{u as i,a as f}from"./motion-minimal-DZtZgbm6.js";function h(r){r.values.forEach(t=>t.stop())}function e(r,t){[...t].reverse().forEach(o=>{const a=r.getVariant(o);a&&c(r,a),r.variantChildren&&r.variantChildren.forEach(n=>{e(n,t)})})}function p(r,t){if(Array.isArray(t))return e(r,t);if(typeof t=="string")return e(r,[t]);c(r,t)}function m(){const r=new Set,t={subscribe(s){return r.add(s),()=>void r.delete(s)},start(s,o){const a=[];return r.forEach(n=>{a.push(u(n,s,{transitionOverride:o}))}),Promise.all(a)},set(s){return r.forEach(o=>{p(o,s)})},stop(){r.forEach(s=>{h(s)})},mount(){return()=>{t.stop()}}};return t}function b(){const r=i(m);return f(r.mount,[]),r}const d=b;export{m as a,d as b,b as u};
