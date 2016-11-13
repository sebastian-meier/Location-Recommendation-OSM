- Data based fingerprinting, attribute vectors
- Orient fnp at osm
- color map based on primary location
- fnp first level / second level
- tale of cities / a tale of four cities (data sources)

Paper



OSM Importing:

Merging: ./osmconvert /Users/sebastianmeier/Desktop/koeln-regbez-latest.osm /Users/sebastianmeier/Desktop/berlin-latest.osm /Users/sebastianmeier/Desktop/hamburg-latest.osm /Users/sebastianmeier/Desktop/oberbayern-latest.osm -o=merged.osm

Import: osm2pgsql -s -U sebastianmeier -P 5433 -d foursquare --style /Users/sebastianmeier/Sites/work@beanstalk/trunk/prjcts/foursquare/data/cities/default.style /Applications/merged.osm



------


List indexes:

SELECT i.relname as indname,
       i.relowner as indowner,
       idx.indrelid::regclass,
       am.amname as indam,
       idx.indkey,
       ARRAY(
       SELECT pg_get_indexdef(idx.indexrelid, k + 1, true)
       FROM generate_subscripts(idx.indkey, 1) as k
       ORDER BY k
       ) as indkey_names,
       idx.indexprs IS NOT NULL as indexprs,
       idx.indpred IS NOT NULL as indpred
FROM   pg_index as idx
JOIN   pg_class as i
ON     i.oid = idx.indexrelid
JOIN   pg_am as am
ON     i.relam = am.oid;
