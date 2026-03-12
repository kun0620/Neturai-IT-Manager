import{s as n}from"./index-DN7Skti6.js";async function l({action:s,details:o=null,userId:r=null}){const{error:t}=await n.from("logs").insert({action:s,details:o,user_id:r})}export{l};
