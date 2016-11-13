ogr2ogr -s_srs EPSG:3068 -t_srs WGS84 -f geoJSON flaechennutzungsplan_berlin_3068.geojson  WFS:"http://fbinter.stadt-berlin.de/fb/wfs/geometry/senstadt/re_nutz2010_nutzsa" re_nutz2010_nutzsa
