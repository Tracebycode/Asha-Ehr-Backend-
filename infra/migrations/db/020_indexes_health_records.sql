create index on health_records(phc_id);
create index on health_records(area_id);
create index on health_records(member_id);
create index on health_records(asha_id);
create index on health_records(visit_type);
create index on health_records using gin (data_json);
