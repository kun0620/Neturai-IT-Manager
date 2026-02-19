import{d as o,m as R,Q as H,b as h,g as F}from"./index-C_wQioo6.js";import{r as l,j as t}from"./vendor-react-CQhyLJhi.js";import{C as q,a as _,b as $,d as E}from"./card-CkIEAavX.js";import{A as S,a as G}from"./subDays-CxkVo8Mp.js";/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=o("CheckCircle",[["path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14",key:"g774vq"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=o("CircleDot",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}]]);/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=o("Hourglass",[["path",{d:"M5 22h14",key:"ehvnwv"}],["path",{d:"M5 2h14",key:"pdyrp9"}],["path",{d:"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22",key:"1d314k"}],["path",{d:"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2",key:"1vvvr6"}]]);/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=o("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=o("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);function W({title:w,value:e,valueSuffix:u,decimalPlaces:a=0,icon:v,description:x,color:k="text-primary",trend:r,index:j=0,onClick:i,clickHint:M,className:C}){const[N,d]=l.useState(typeof e=="number"?e:0),c=l.useRef(typeof e=="number"?e:null);l.useEffect(()=>{if(typeof e!="number")return;const s=c.current??e;if(s===e){d(e),c.current=e;return}const n=380,p=performance.now();let m=0;const f=V=>{const g=Math.min((V-p)/n,1),D=1-Math.pow(1-g,3),y=s+(e-s)*D;if(a>0){const b=Math.pow(10,a);d(Math.round(y*b)/b)}else d(Math.round(y));g<1?m=window.requestAnimationFrame(f):c.current=e};return m=window.requestAnimationFrame(f),()=>{window.cancelAnimationFrame(m)}},[e,a]);const A=typeof e=="number"?N.toLocaleString(void 0,{minimumFractionDigits:a,maximumFractionDigits:a}):e,L=()=>{if(!r)return"border-border bg-muted/40 text-muted-foreground";const s=r.mode??"increase_is_good";if(r.value===0)return"border-border bg-muted/40 text-muted-foreground";if(s==="neutral")return"border-blue-500/30 bg-blue-500/10 text-blue-700";const n=r.value>0;return(s==="increase_is_good"?n:!n)?"border-green-500/30 bg-green-500/10 text-green-600":"border-red-500/30 bg-red-500/10 text-red-600"};return t.jsx(R.div,{initial:"hidden",animate:"visible",variants:F,custom:j,className:h(i&&"group cursor-pointer","print:scale-100"),whileHover:i?H:void 0,onClick:i,children:t.jsxs(q,{className:h("h-full min-h-[148px] border-border/80 bg-card/90",C),children:[t.jsxs(_,{className:"flex flex-row items-start justify-between pb-2",children:[t.jsx($,{className:"text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",children:w}),t.jsx("div",{className:"rounded-md border border-border/70 bg-muted/40 p-1.5",children:t.jsx(v,{className:h("h-4 w-4",k)})})]}),t.jsxs(E,{className:"flex min-h-[108px] flex-col gap-2 pt-0",children:[t.jsxs("div",{className:"text-2xl font-semibold leading-tight tracking-tight",children:[A,typeof e=="number"&&u?` ${u}`:""]}),x?t.jsx("p",{className:"text-xs text-muted-foreground leading-snug line-clamp-2",children:x}):t.jsx("div",{className:"h-[16px]"}),r&&t.jsxs("div",{className:`mt-auto inline-flex w-fit items-center gap-1 rounded-md border px-2 py-1 text-xs ${L()}`,children:[r.value>0&&t.jsx(S,{className:"h-3 w-3"}),r.value<0&&t.jsx(G,{className:"h-3 w-3"}),t.jsx("span",{children:r.value===0?"No change":`${Math.abs(r.value)} ${r.label??"vs yesterday"}`})]}),i&&t.jsx("p",{className:"h-4 text-[11px] text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100",children:M??"Click to open details"})]})]})})}export{B as C,J as H,K as L,O as R,W as S,U as a};
