CREATE TABLE `plans` (
  `reply_id` text PRIMARY KEY NOT NULL,
  `place` text NOT NULL,
  `day` text NOT NULL DEFAULT '',
  `time` text NOT NULL DEFAULT ''
);
