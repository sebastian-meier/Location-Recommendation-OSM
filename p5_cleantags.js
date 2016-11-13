SELECT COUNT(*), tags_id, name FROM venues_tags, tags WHERE tags_id = id GROUP BY tags_id, name HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC
