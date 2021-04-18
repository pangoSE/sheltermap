/*
This file is part of sheltermap.

Sheltermap is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Sheltermap is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with sheltermap.  If not, see <https://www.gnu.org/licenses/>.
*/

if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    alert("This map is not suitable for use on mobile devices. Please download OsmAnd instead. It enables adding notes, searching for shelters, seeing pictures linked from OSM objects and editing the map directly.");
}

var markers = new L.FeatureGroup();

$('#load').click(function(){init2()});

function init2() {
    var zoom = map.getZoom();
    console.info(zoom);
    var zoomlimit = 9;
    if (zoom <= zoomlimit)
	alert("On zoom level:" + zoom + ". Please zoom in to at least level "+(zoomlimit + 1)+" or higher");	
    else {
	//$('.spinner').fadeIn();
  	$('#mySpinner').addClass('spinner');
	getData();
    }
};

function getData() {
    // Clear markers before getting new ones
    markers.clearLayers();
    
    var bbox = map.getBounds();
    console.log(bbox);
    // Order to fit overpass bbox
    // see https://dev.socrata.com/blog/2015/02/10/within-box-query-with-leaflet.html
    var overpassQueryBox = [
	bbox._southWest.lat,
	bbox._southWest.lng,
	bbox._northEast.lat, 
	bbox._northEast.lng
    ];
    var overpassQuery = buildQuery(overpassQueryBox);

    function buildQuery(overpassQueryBox) {
	var query =
	    'https://overpass-api.de/api/interpreter?data=[out:xml][timeout:25];(nwr["access"!="private"]["tourism"="alpine_hut"]('+overpassQueryBox+');nwr["access"!="private"]["tourism"="wilderness_hut"]('+overpassQueryBox+');nwr["access"!="private"]["amenity"="shelter"]["shelter_type"!="public_transport"]["public_transport"!~".*"]["leisure"!="bird_hide"]('+overpassQueryBox+'););out%20center;';
	console.log(query);
	return query;
    }

    $.get(overpassQuery, function(data) {
	//console.info(data);
	var data = osmtogeojson(data);
	//console.info(data);
	var geojsonLayer =  L.geoJson(data, {
            pointToLayer: function(feature, latlng) {
		var MarkerOptions = L.icon({
        	    iconUrl: 'red.svg',
		    iconSize:     [30, 30],
        	    iconAnchor:   [15, 15],
        	    popupAnchor:  [0, -15]
    		});
                return L.marker(latlng, {icon: MarkerOptions});
	    },
	    onEachFeature: function(feature, layer) {
		var popupOptions = {maxWidth: 320, minWidth: 250, maxHeight: 350, autoPan: true, closeButton: true};
		var desc_head = "<b>Description:</b> ";
		var desc = feature.properties.description;
		if (desc == undefined)
		    desc = desc_head+"None yet";
		else {
		    desc = desc_head+desc; 
		}
		var wikimedia_commons = feature.properties.wikimedia_commons;
		var mapillary = feature.properties.mapillary;
		var image = feature.properties.image;
		if (wikimedia_commons == undefined && mapillary == undefined && image == undefined){
		    var images = ['<div style=\"border-left:5px solid red; background-color:lightgrey; padding: 3px 3px 3px 3px\">No image yet! <br />Please improve the map by recording a photo with the <a href="https://play.google.com/store/apps/details?id=app.mapillary">Mapillary App</a> on your phone (it\'s quick and simple!) or alternatively by uploading a photo to <a href="https://commons.wikimedia.org">Wikimedia Commons</a> with the coordinates e.g. by using the <a href="https://play.google.com/store/apps/details?id=fr.free.nrw.commons">Wikimedia Commons App</a>.</div>'];
		} else {
		    // Some are defined, show them
		    var images = [];
		    var m = '<a href="https://www.mapillary.com/app/?pKey='+mapillary+'"><img src="https://images.mapillary.com/'+mapillary+'/thumb-320.jpg" width="300"></a>'
		    var i = '<a href="' + image + '"><img src="' + image + '" width="300"></a>'
		    for (var x of [wikimedia_commons,mapillary,image]) {
			if (x !== undefined) {
			    if (x == wikimedia_commons) {
				// remove File: prefix
				var w = '<a href="https://commons.wikimedia.org/wiki/'+wikimedia_commons+'"><img src="https://commons.wikimedia.org/w/thumb.php?w=300&f=' +wikimedia_commons.replace(/^File:/,'')+ '" width="300"></a>'
				images.push(w);
			    }
			    if (x == mapillary) {
				images.push(m);
			    }
			    if (x == image) {
				images.push(i);
			    }
			}
		    }
		}
		// loop through all tags and convert them to html
		// inspired by https://stackoverflow.com/questions/33838315/how-to-loop-over-geojson-properties-to-display-in-leaflet-markers	
		var tags = [];
		// avoid showing description twice
		delete feature.properties.description;
		// delete links clutter
		delete feature.properties.mapillary;
		delete feature.properties.wikimedia_commons;
		delete feature.properties.image;
		// loop through
		for (var prop in feature.properties) {
		    if (prop == 'id')
        		tags.push('<b><a target="_blank" href="https://openstreetmap.org/'+feature.properties[prop]+'">View on openstreetmap.org</a></b>');
		    else if (prop == 'wikidata')
        		tags.push('<b><a target="_blank" href="https://wikidata.org/wiki/'+feature.properties[prop]+'">View on Wikidata.org</a></b>');
		    else if (prop == 'website')
        		tags.push('<b><a href="'+feature.properties[prop]+'">View the website of the feature</a></b>');
		    else
        		tags.push('<b>' + prop + ":</b> " + feature.properties[prop]);
		}
		// avoid undefined names
		if (feature.properties.name == undefined)
		    var name = "";
		else
		    var name = feature.properties.name;
		var popupContent = '<h1>'+name+'</h1>'+
                    '<div>'+desc+'<br />'+images.join("</br>")+'</div>'+
		    '<h3>Tags</h3>'+
		    '<div>' + tags.join("<br />") + '</div>';
		layer.bindPopup(popupContent, popupOptions);
	    } //close oneachfeature
      	});// close L.geojson
	//console.log(geojsonLayer);
	markers.addLayer(geojsonLayer);
	//console.log(markers);
	map.addLayer(markers);

	//fade out the loading spinner
	//$('.spinner').fadeOut();
	$('#mySpinner').removeClass('spinner');
    }, "xml")
} // End of getData()
