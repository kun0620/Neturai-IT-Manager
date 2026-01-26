export type AssetType = {
  id: string;
  key: string;
  name: string;
  icon: string | null; // ✅ แก้ตรงนี้
};

export type AssetWithType = {
  id: string;
  name: string;
  asset_code: string;
  category: string;
  status: string;
  serial_number: string | null;
  location: string | null;     // (ถ้ายังไม่แก้)
  assigned_to: string | null;  // (ถ้ายังไม่แก้)
  last_service_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  asset_type: AssetType | null;
};
