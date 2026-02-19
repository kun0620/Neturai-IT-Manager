import{d as r,s as n}from"./index-W22mHG5Q.js";import{u as a}from"./vendor-tanstack-CEPwOq2U.js";/**
 * @license lucide-react v0.321.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=r("Pencil",[["path",{d:"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z",key:"5qss01"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);async function t(){const{data:s,error:e}=await n.from("profiles").select("id, email, name").order("name");if(e)throw e;return s??[]}function m(){return a({queryKey:["users-for-assignment"],queryFn:t})}export{u as P,m as u};
