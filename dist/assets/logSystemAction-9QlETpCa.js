import{s as n}from"./index-W22mHG5Q.js";async function l({action:s,details:o=null,userId:r=null}){const{error:t}=await n.from("logs").insert({action:s,details:o,user_id:r})}export{l};
