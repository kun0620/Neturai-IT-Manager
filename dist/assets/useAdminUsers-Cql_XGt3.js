import{u as r}from"./vendor-tanstack-CMeflYOv.js";import{s as a}from"./index-CeijoTdn.js";async function t(){const{data:s,error:e}=await a.from("profiles").select(`
      id,
      name,
      full_name,
      email,
      role,
      created_at,
      department,
      location,
      preferred_contact,
      assigned_asset:assets(
        id,
        name,
        asset_code,
        asset_type:asset_types(key, name)
      )
    `).order("name");if(e)throw e;return s??[]}function i(){return r({queryKey:["admin-users"],queryFn:t})}export{i as u};
