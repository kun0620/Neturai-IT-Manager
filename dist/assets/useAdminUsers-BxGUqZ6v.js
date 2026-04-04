import{a}from"./vendor-tanstack-DGffBuGa.js";import{s as r}from"./index-Ce7gQNUQ.js";async function t(){const{data:s,error:e}=await r.from("profiles").select(`
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
    `).order("name");if(e)throw e;return s??[]}function i(){return a({queryKey:["admin-users"],queryFn:t})}export{i as u};
