export type AssetType = {
  id: string;
  key: string;
  name: string;
  icon: string | null;
};

export type AssetWithType = {
  id: string;
  name: string;
  asset_code: string;
  category: string;
  status: string;
  location: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  asset_type: AssetType | null;
};
