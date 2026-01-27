export type AssetType = {
  id: string;
  key: string;
  name: string;
  icon: string | null;
};

export type AssetCategory = {
  id: string;
  name: string;
};

export type AssetWithType = {
  id: string;
  name: string;
  asset_code: string;

  category: AssetCategory | null; // ✅ แก้ตรงนี้

  status: string;
  serial_number: string | null;
  location: string | null;
  assigned_to: string | null;
  last_service_date: string | null;
  created_at: string | null;
  updated_at: string | null;

  asset_type: AssetType | null;
};
