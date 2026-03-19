import{d as o}from"./index-CeijoTdn.js";/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=o("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]),n=e=>(e??"").trim().toLowerCase(),h=e=>e.reduce((r,a)=>{const s=n(a.priority);if(!s)return r;const t=Number(a.resolution_time_hours??0);return!Number.isFinite(t)||t<=0||(r[s]=t),r},{}),f=(e,r,a=Date.now())=>{if(e.status==="closed")return!1;if(e.due_at){const i=new Date(e.due_at).getTime();if(Number.isFinite(i))return i<a}if(!e.created_at||!e.priority)return!1;const s=new Date(e.created_at).getTime();if(!Number.isFinite(s))return!1;const t=r[n(e.priority)];return t?a>s+t*60*60*1e3:!1};export{d as F,h as b,f as i};
