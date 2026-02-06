/*
  # Add CCTV Camera asset type and fields
*/

DO $$
DECLARE
  v_type_id uuid;
BEGIN
  SELECT id INTO v_type_id
  FROM asset_types
  WHERE key = 'cctv_camera'
  LIMIT 1;

  IF v_type_id IS NULL THEN
    INSERT INTO asset_types (key, name, description, icon)
    VALUES (
      'cctv_camera',
      'CCTV Camera',
      'Security camera',
      'camera'
    )
    RETURNING id INTO v_type_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM asset_fields
    WHERE asset_type_id = v_type_id AND field_key = 'ip_address'
  ) THEN
    INSERT INTO asset_fields (asset_type_id, field_key, field_label, field_type, is_required)
    VALUES (v_type_id, 'ip_address', 'IP Address', 'text', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM asset_fields
    WHERE asset_type_id = v_type_id AND field_key = 'nvr_channel'
  ) THEN
    INSERT INTO asset_fields (asset_type_id, field_key, field_label, field_type, is_required)
    VALUES (v_type_id, 'nvr_channel', 'NVR Channel', 'text', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM asset_fields
    WHERE asset_type_id = v_type_id AND field_key = 'resolution'
  ) THEN
    INSERT INTO asset_fields (asset_type_id, field_key, field_label, field_type, is_required)
    VALUES (v_type_id, 'resolution', 'Resolution', 'text', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM asset_fields
    WHERE asset_type_id = v_type_id AND field_key = 'lens'
  ) THEN
    INSERT INTO asset_fields (asset_type_id, field_key, field_label, field_type, is_required)
    VALUES (v_type_id, 'lens', 'Lens', 'text', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM asset_fields
    WHERE asset_type_id = v_type_id AND field_key = 'firmware_version'
  ) THEN
    INSERT INTO asset_fields (asset_type_id, field_key, field_label, field_type, is_required)
    VALUES (v_type_id, 'firmware_version', 'Firmware Version', 'text', false);
  END IF;
END $$;
