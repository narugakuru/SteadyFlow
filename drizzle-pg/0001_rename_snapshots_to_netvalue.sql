-- rename snapshots table to netvalue
ALTER TABLE snapshots RENAME TO netvalue;
ALTER INDEX snapshots_user_date_idx RENAME TO netvalue_user_date_idx;
