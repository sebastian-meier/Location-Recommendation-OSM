- Download files from e.g. geofabrik
- Unzip
- Merge with osmconvert:
./osmconvert /Users/sebastianmeier/Desktop/koeln-regbez-latest.osm /Users/sebastianmeier/Desktop/berlin-latest.osm /Users/sebastianmeier/Desktop/hamburg-latest.osm /Users/sebastianmeier/Desktop/oberbayern-latest.osm -o=merged.osm

- Change default osm2pgsql style file to include required columns: default.style

- Import using osm2pgsql:
osm2pgsql -s -U sebastianmeier -P 5433 -d foursquare -S /Users/sebastianmeier/Sites/work@beanstalk/trunk/prjcts/foursquare/data/cities/default.style /Applications/merged.osm
