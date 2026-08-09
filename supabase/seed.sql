insert into actors (id, name, role) values
  ('landlord-morgan', 'Morgan Lee', 'landlord'),
  ('tenant-jamie', 'Jamie Rivera', 'tenant'),
  ('tenant-noah', 'Noah Williams', 'tenant')
on conflict (id) do nothing;

insert into units (id, label, address) values
  ('unit-cedar-2a', 'Cedar House · 2A', '18 Cedar Lane, Portland'),
  ('unit-corner-1b', 'Corner Flat · 1B', '42 Alcott Street, Portland')
on conflict (id) do nothing;

insert into memberships (actor_id, unit_id, membership_role) values
  ('landlord-morgan', 'unit-cedar-2a', 'owner'),
  ('landlord-morgan', 'unit-corner-1b', 'owner'),
  ('tenant-jamie', 'unit-cedar-2a', 'tenant'),
  ('tenant-noah', 'unit-corner-1b', 'tenant')
on conflict (actor_id, unit_id) do nothing;
