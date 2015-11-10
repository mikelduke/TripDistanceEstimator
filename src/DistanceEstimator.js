/**
 * DistanceEstimator.js
 * 
 * Used for trip distance estimation and planning. 
 * 
 * http://www.mikelduke.com/TripDistanceEstimator/
 * https://github.com/mikelduke/TripDistanceEstimator
 * 
 */

//TODO Add saving markers to local storage or soemthing, could integrate with phpGPS
//TODO Add total distance for google maps directions route
//TODO Possible idea for overlaying multiple searches on top of the map, like for hotels or camping
//TODO Use google maps Elevation service with directions results to get elevations on path, then sum the positive differences of each point and show total
//TODO Change to use a new object to contain marker and circles[] instead of syncing two arrays

const KM_TO_MI = 0.621371;
const MI_TO_M = 1609.344;
const MI_TO_KM = 1.609344;
const MAX_WAYPTS_FOR_ROUTE = 10;
const DEFAULT_STROKE_COLOR = '#0000FF';
const HIDDEN_STROKE_COLOR = 'rgba(0,0,0,0)';

var map;
var directionsDisplay = null;
var markers = [];
var circles = [];
var path;
var updateTimeout;
var distanceDisplay;
var isKM  = false;
var circleSize = 10;
var numOfCircles = 3;
var prevCirclesHidden = false;
var directionDistanceControl;
var directionDistanceControlText;
var rightControlDiv;
var directionsDistance = 0;
var strokeColor = DEFAULT_STROKE_COLOR;
var prevStrokeColor = true;

function load() {
	var center = new google.maps.LatLng(41.988308,-99.483202);
	var zoom = 3;
	
	if(typeof(Storage) !== "undefined") {
		if (localStorage.mapZoom) zoom = Number(localStorage.mapZoom);
		
		if (localStorage.mapLat && localStorage.mapLng) {
			var lat = Number(localStorage.mapLat);
			var lng = Number(localStorage.mapLng);
			
			center = new google.maps.LatLng(lat, lng);
		}
		
		if (localStorage.isKM) {
			if (localStorage.isKM == true || localStorage.isKM == "true")
				isKM = true;
			else isKM = false;
		}
		if (localStorage.numOfCircles) numOfCircles = localStorage.numOfCircles;
		if (localStorage.circleSize) circleSize = localStorage.circleSize;
		if (localStorage.prevStrokeColor) {
			if (localStorage.prevStrokeColor == true || localStorage.prevStrokeColor == "true") {
				prevStrokeColor = true;
				strokeColor = DEFAULT_STROKE_COLOR;
			} else {
				prevStrokeColor = false;
				strokeColor = HIDDEN_STROKE_COLOR;
			}
		}
		if (localStorage.prevCirclesHidden) {
			if (localStorage.prevCirclesHidden == true || localStorage.prevCirclesHidden == "true")
				prevCirclesHidden = true;
			else prevCirclesHidden = false;
		}
	}
	
	map = new google.maps.Map(document.getElementById("map"), {
		center: center,
		zoom: zoom,
		mapTypeId: 'roadmap'
	});
	//var infoWindow = new google.maps.InfoWindow({map: map});
	
	/*if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			center = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
			map.setCenter(center);
		}, function(){
			handleLocationError(true, infoWindow, map.getCenter());
		});
	} else {
		handleLocationError(false, infoWindow, map.getCenter());
	}*/
	
	google.maps.event.addListener(map, 'click', function(event) {
		updateTimeout = setTimeout(function(){
			var marker = addNewMarker(map, event.latLng);
		}, 200);
	});
	
	google.maps.event.addListener(map, 'dblclick', function(event) {
		clearTimeout(updateTimeout);
	});
	
	google.maps.event.addListener(map, 'rightclick', function(event) {
		var marker = addNewMarker(map, event.latLng);
	});
	
	google.maps.event.addListener(map, 'zoom_changed', function(event) {
		if(typeof(Storage) !== "undefined") {
		    localStorage.mapZoom = map.getZoom();
		}
	});
	
	google.maps.event.addListener(map, 'center_changed', function(event) {
		if(typeof(Storage) !== "undefined") {
		    localStorage.mapLat = map.getCenter().lat() + "";
		    localStorage.mapLng = map.getCenter().lng() + "";
		}
	});
	
	createControls();
}

/**
 * Adds a new marker to the map and calls the drawMarkerCircles function for it
 * 
 * @param map
 * @param latLng
 */
function addNewMarker(map, latLng) {
	//alert(latLng);
	var markerID = markers.length + 1;
	var markerName = markerID + "";
	
	var newMarker = new google.maps.Marker({
		position: latLng,
		map: map,
		name: markerName,
		draggable: true
	});
	
	google.maps.event.addListener(newMarker, 'drag', function() {
		deleteCircles(newMarker);
		
		for (var i = 0; i < markers.length; i++) {
			if (markers[i] == newMarker) {
				drawMarkerCircles(newMarker, i, numOfCircles);
				break;
			}
		}
		
		redrawPath();
	});
	
	google.maps.event.addListener(newMarker, 'rightclick', function(event) {
		deleteMarker(newMarker);
	});
	
	var newMarkerID = markers.length;
	drawMarkerCircles(newMarker, newMarkerID, numOfCircles);
	markers[newMarkerID] = newMarker;
	
	if (prevCirclesHidden) hideAllButLatestCircles();
	
	redrawPath();
	
	if (activeMarkers() > MAX_WAYPTS_FOR_ROUTE) {
		rightControlDiv.style.display = "none"; 
		directionDistanceControl.style.display = "none";
	}
}

/**
 * Clears the markers on the map
 */
function clearMarkers() {
	for (var i = 0; i < markers.length; i++) {
		if (markers[i] != undefined && markers[i] != null)
			markers[i].setMap(null);
	}
	markers = [];
	
	rightControlDiv.style.display = "";
}

function clearCircles() {
	for (var i = 0; i < circles.length; i++) {
		if (circles[i] != undefined && circles[i] != null) {
			for (var j = 0; j < circles[i].length; j++) {
				if (circles[i][j] != undefined && circles[i][j] != null) {
					circles[i][j].setMap(null);
					circles[i][j] = null;
				}
			}
		}
		circles[i] = []; 
	}
	circles = [];
}

/**
 * Clears all the stuff on the map
 */
function clearMap() {
	clearPath();
	clearCircles();
	clearMarkers();
	clearDirections();
}

function clearDirections() {
	if (directionsDisplay != undefined && directionsDisplay != null) {
		directionsDisplay.setMap(null);
		directionsDisplay = null;
	}
	
	directionDistanceControl.style.display = "none";
}

function bindInfoWindow(marker, map, infoWindow, html) {
	google.maps.event.addListener(marker, 'click', function() {
		infoWindow.setContent(html);
		infoWindow.open(map, marker);
	});
}

function drawCircle(marker, distance) {
	var circleVals = {
		strokeColor: '#FF0000',
		strokeOpacity: 0.8,
		strokeWeight: 2,
		fillColor: '#FF0000',
		fillOpacity: 0.1,
		map: map,
		center: marker.position,
		radius: distance
	};
	
	var circle = new google.maps.Circle(circleVals);
	
	google.maps.event.addListener(circle, 'click', function(event) {
		addNewMarker(map, event.latLng);
	});
	
	google.maps.event.addListener(circle, 'rightclick', function(event) {
		deleteMarker(marker);
	});
	
	return circle;
}

function drawMarkerCircles(marker, id, numOfCircles) {
	var distance = circleSize;
	if (!isKM) distance *= MI_TO_M;
	else distance *= 1000;

	circles[id] = [];
	for (var i = 1; i <= numOfCircles; i++) {
		circles[id][i] = drawCircle(marker, distance * i);
	} 
}

function deleteMarker(marker) {
	deleteCircles(marker);
	
	//find the index
	var ind = -1;
	
	for (var i = 0; i < markers.length; i++) {
		if (markers[i] == marker) {
			ind = i;
			break;
		}
	}
	
	if (ind > -1) {
		markers[ind].setMap(null);
		markers[ind] = null;
	}
	
	redrawPath();
	
	if (activeMarkers() <= MAX_WAYPTS_FOR_ROUTE) rightControlDiv.style.display = "";
}

function deleteCircles(marker) {
	var ind = -1;
	
	for (var i = 0; i < markers.length; i++) {
		if (markers[i] == marker) {
			ind = i;
			break;
		}
	}
	
	if (ind > -1) {
		if (circles[ind] != undefined && circles[ind] != null) {
			for (var i = 0; i < circles[ind].length; i++) {
				if (circles[ind][i] != undefined && circles[ind][i] != null) {
					circles[ind][i].setMap(null);
					circles[ind][i] = null;
				}
			}
			circles[ind] = [];
		}
	}
}

function redrawCircles() {
	clearCircles();

	for (var i = 0; i < markers.length; i++) {
		if (markers[i] != undefined && markers[i] != null) {
			drawMarkerCircles(markers[i], i, numOfCircles);
		}
	}
}

function hideAllButLatestCircles() {
	if (circles.length < 1) return;
	
	for (var i = 0; i < circles.length - 1; i++) {
		if (circles[i] != undefined && circles[i] != null) {
			for (var j = 0; j < circles[i].length; j++) {
				if (circles[i][j] != undefined && circles[i][j] != null) {
					circles[i][j].setMap(null);
				}
			}
		}
	}
}

function showAllCircles() {
	if (circles.length < 1) return;
	
	for (var i = 0; i < circles.length; i++) {
		if (circles[i] != undefined && circles[i] != null) {
			for (var j = 0; j < circles[i].length; j++) {
				if (circles[i][j] != undefined && circles[i][j] != null) {
					circles[i][j].setMap(map);
				}
			}
		}
	}
}

function drawPath() {
	var pathCoords = new Array();
	
	for (var i = 0; i < markers.length; i++) {
		if (markers[i] != undefined && markers[i] !=null) {
			var coord = markers[i].getPosition();
            pathCoords.push(coord);
		}
	}
	
	if (pathCoords.length > 0) {
		path = new google.maps.Polyline({
			path: pathCoords,
			geodesic: true,
			strokeColor: strokeColor,
			strokeOpacity: 1.0,
			strokeWeight: 2
		});
		
		path.setMap(map);
	}
	
	var distM = calcPathDistance();
	if (isKM) {
		distanceDisplay.innerHTML = Number(distM/1000).toFixed(2) + " KM";
	} else {
		distanceDisplay.innerHTML = Number(distM/1000 * KM_TO_MI).toFixed(2) + " Mi";
	}
}

function clearPath() {
	if (path != undefined && path != null) {
		path.setMap(null);
		path = null;
	}

	if (isKM) {
		distanceDisplay.innerHTML = "0.00 KM";
	} else {
		distanceDisplay.innerHTML = "0.00 Mi";
	}
}

function redrawPath() {
	clearPath();
	drawPath();
}

function togglePath() {
	if (path != undefined && path != null) {
		var newStrokeColor = prevStrokeColor ? DEFAULT_STROKE_COLOR : HIDDEN_STROKE_COLOR;

		path.set('strokeColor', newStrokeColor);

		return newStrokeColor;
	}
}

function calcPathDistance() {
	var lengthInMeters = 0;
	
	if (path != undefined && path != null && path.getPath().length > 1) {
		lengthInMeters = google.maps.geometry.spherical.computeLength(path.getPath());
	}
	
	return lengthInMeters;
}

/**
 * Creates the controls on the map screen
 */
function createControls() {
	//BOTTOM CENTER
	var bottomCenterControlDiv = document.createElement('div');
	createControl(bottomCenterControlDiv, map, "Click to Clear map", "Clear Map", function() {
		clearMap();
	});
	bottomCenterControlDiv.index = 1;
	map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(bottomCenterControlDiv);
	//TODO Add Save
	
	//TOP CENTER
	var topCenterDiv = document.createElement('div');
	if (isKM) {
		distanceDisplay = createControl(topCenterDiv, map, "Path Distance", "0.00 KM", null);
	} else {
		distanceDisplay = createControl(topCenterDiv, map, "Path Distance", "0.00 Mi", null);
	}
	topCenterDiv.index = 1;
	map.controls[google.maps.ControlPosition.TOP_CENTER].push(topCenterDiv);
	
	//LEFT BOTTOM
	var bottomLeftControlDiv = document.createElement('div');
	var bottomLeftControlUI = createControlUI("");
	bottomLeftControlDiv.appendChild(bottomLeftControlUI);
	createCircleSizeControl(bottomLeftControlUI, map);
	createCircleNumControl(bottomLeftControlUI, map);
	bottomLeftControlUI.appendChild(document.createElement("BR"));
	createCBControl(bottomLeftControlUI, map, "Toggle Direct Path",
			"Toggle Direct Path", "togglePath", prevStrokeColor, function() {
		if(prevStrokeColor) {
			prevStrokeColor = false;
		} else {
			prevStrokeColor = true;
		}
		togglePath();

		if(typeof(Storage) !== "undefined") {
			localStorage.prevStrokeColor = prevStrokeColor + "";
		}
	});
	bottomLeftControlUI.appendChild(document.createElement("BR"));
	createCBControl(bottomLeftControlUI, map, "Hide Previous Circles", 
			"Hide Previous Circles", "prevCircleCB", prevCirclesHidden, function() {
		if (prevCircleCB.checked) {
			prevCirclesHidden = true;
			hideAllButLatestCircles();
		} else {
			prevCirclesHidden = false;
			showAllCircles();
		}
		
		if(typeof(Storage) !== "undefined") {
			localStorage.prevCirclesHidden = prevCirclesHidden + "";
		}
	});
	bottomLeftControlUI.appendChild(document.createElement("BR"));
	var defaultMiOrKm = "KM";
	if (!isKM) defaultMiOrKm = "Miles";
	createRBControl(bottomLeftControlUI, map, "Miles or KM", "Miles or KM", 
			"MIKM", defaultMiOrKm, ["Miles", "KM"], function() {
		var isKMValue = !document.getElementById("MIKM").checked;
		isKM = isKMValue;
		
		if(typeof(Storage) !== "undefined") {
			localStorage.isKM = isKM + "";
		}
		
		redrawCircles();
		redrawPath();
	});
	bottomLeftControlDiv.index = 1;
	map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(bottomLeftControlDiv);
	
	//RIGHT TOP
	rightControlDiv = document.createElement('div');
	var rightControlText = createControl(rightControlDiv, map, "Get Directions", "Get Directions", function() {
		getDirections();
	});
	createModeSelectionControl(rightControlText, map);
	
	var rightControlDistanceDiv = document.createElement('div');
	directionDistanceControlText = createControl(rightControlDistanceDiv, map, "Total Distance ", "Total Distance ", null);
	rightControlDiv.index = 1;
	rightControlDistanceDiv.index = 1;
	map.controls[google.maps.ControlPosition.RIGHT_TOP].push(rightControlDiv);
	map.controls[google.maps.ControlPosition.RIGHT_TOP].push(rightControlDistanceDiv);
	rightControlDistanceDiv.style.display = "none";
	directionDistanceControl = rightControlDistanceDiv; 
}

/**
 * Creates a control inside the controlDiv on the map, returns the text item
 * 
 * @param controlDiv
 * @param map
 * @param title
 * @param text
 * @param func
 * @returns {___anonymous7563_7573}
 */
function createControl(controlDiv, map, title, text, func) {
	var controlUI = createControlUI(title)
	controlDiv.appendChild(controlUI);
	
	// Set CSS for the control interior.
	var controlText = createControlItem('div', text);
	controlUI.appendChild(controlText);
	
	if (func != undefined && func != null)
		controlUI.addEventListener('click', func);
	
	return controlText;
}

function createModeSelectionControl(controlDiv, map) {
	// Set CSS for the control interior.
	var controlItem = createControlItem('select', '');
	controlItem.style.paddingLeft = '5px';
	controlItem.id = "mode";
	controlDiv.appendChild(controlItem);
	
	var bikeMode = document.createElement('option');
	bikeMode.value = "BICYCLING";
	bikeMode.innerHTML = "Bicycling";
	controlItem.appendChild(bikeMode);
	
	var driveMode = document.createElement('option');
	driveMode.value = "DRIVING";
	driveMode.innerHTML = "Driving";
	controlItem.appendChild(driveMode);
	
	var walkMode = document.createElement('option');
	walkMode.value = "WALKING";
	walkMode.innerHTML = "Walking";
	controlItem.appendChild(walkMode);
}

function createControlItem(type, text) {
	var controlText = document.createElement(type);
	controlText.style.color = 'rgb(25,25,25)';
	controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
	controlText.style.fontSize = '16px';
	controlText.style.lineHeight = '38px';
	controlText.style.paddingLeft = '5px';
	controlText.style.paddingRight = '5px';
	controlText.innerHTML = text;
	return controlText;
}

function createControlUI(title) {
	var controlUI = document.createElement('div');
	controlUI.style.backgroundColor = '#fff';
	controlUI.style.border = '2px solid #fff';
	controlUI.style.borderRadius = '3px';
	controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
	controlUI.style.cursor = 'pointer';
	controlUI.style.marginBottom = '22px';
	controlUI.style.textAlign = 'center';
	controlUI.title = title;
	
	return controlUI;
}

function createCircleSizeControl(controlDiv, map) {
	// Set CSS for the control interior.
	var controlText = createControlItem('div', 'Circle Radius');
	controlDiv.appendChild(controlText);
	
	var circleSizeSlider = document.createElement("INPUT");
	circleSizeSlider.setAttribute("type", "range");
	circleSizeSlider.setAttribute("id", "circleSizeSlider");
	circleSizeSlider.setAttribute("min", 1);
	circleSizeSlider.setAttribute("max", 100);
	circleSizeSlider.setAttribute("value", circleSize);
	controlDiv.appendChild(circleSizeSlider);
	
	function sliderUpdate() {
		circleSize = circleSizeSlider.value;
		redrawCircles();
		controlText.innerHTML = "Circle Radius " + circleSize;
		
		if(typeof(Storage) !== "undefined") {
			localStorage.circleSize = circleSize + "";
		}
	}
	sliderUpdate();
	circleSizeSlider.addEventListener('change', sliderUpdate);
	circleSizeSlider.addEventListener('input', sliderUpdate);
	
	return controlText;
}

function createCircleNumControl(controlDiv, map) {
	// Set CSS for the control interior.
	var controlText = createControlItem('div', 'Number of Circles');
	controlDiv.appendChild(controlText);
	
	var circleNumSlider = document.createElement("INPUT");
	circleNumSlider.setAttribute("type", "range");
	circleNumSlider.setAttribute("id", "circleNumSlider");
	circleNumSlider.setAttribute("min", 0);
	circleNumSlider.setAttribute("max", 5);
	circleNumSlider.setAttribute("value", numOfCircles);
	controlDiv.appendChild(circleNumSlider);
	
	function sliderNumUpdate() {
		numOfCircles = circleNumSlider.value;
		redrawCircles();
		controlText.innerHTML = "Number of Circles " + numOfCircles;
		
		if(typeof(Storage) !== "undefined") {
			localStorage.numOfCircles = numOfCircles + "";
		}
	}
	sliderNumUpdate();
	circleNumSlider.addEventListener('change', sliderNumUpdate);
	circleNumSlider.addEventListener('input', sliderNumUpdate);
	
	return controlText;
}

function createCBControl(controlDiv, map, title, name, id, defaultValue, func) {
	// Set CSS for the control interior.
	var controlText = createControlItem('label', name); 
	controlDiv.appendChild(controlText);
	
	var newCBControl = createControlItem('INPUT', '');
	newCBControl.setAttribute("type", "checkbox");
	newCBControl.setAttribute("id", id);
	newCBControl.checked = defaultValue;
	controlDiv.appendChild(newCBControl);
	
	controlText.labelFor = newCBControl;
	
	if (func != undefined && func != null)
		newCBControl.addEventListener('change', func);
	
	return controlText;
}

function createRBControl(controlDiv, map, title, name, id, defaultValue, valuesAr, func) {
	for (var i = 0; i < valuesAr.length; i++) {
		var newRBControl = createControlItem('INPUT', '');
		newRBControl.setAttribute("type", "radio");
		newRBControl.setAttribute("id", id);
		newRBControl.setAttribute("name", id);
		newRBControl.setAttribute("value", valuesAr[i]);
		
		if (valuesAr[i] == defaultValue) newRBControl.checked = true;
		
		var newLabel = createControlItem('label', valuesAr[i]);
		newLabel.labelFor = newRBControl;
		
		controlDiv.appendChild(newRBControl);
		controlDiv.appendChild(newLabel);
		
		if (func != undefined && func != null)
			newRBControl.addEventListener('change', func);
	}
}

/*function handleLocationError(browserHasGeolocation, infoWindow, pos) {
	infoWindow.setPosition(pos);
	infoWindow.setContent(browserHasGeolocation ?
			'Error: The Geolocation service failed.' :
			'Error: Your browser doesn\'t support geolocation.');
}*/

/**
 * Function called by the get directions button
 */
function getDirections() {
	clearDirections();
	var directionsService = new google.maps.DirectionsService;
	var stepDisplay = new google.maps.InfoWindow;
	
	// Display the route between the initial start and end selections.
	calculateAndDisplayRoute(directionsService, stepDisplay, map);
	directionDistanceControl.style.display = "";
}

function calculateAndDisplayRoute(directionsService, stepDisplay, map) {
	if (markers.length < 2) return;
	directionsDistance = 0;
	
	// Retrieve the start and end locations and create a DirectionsRequest using
	var start = null;
	var end = null;
	var wayPoints = new Array();
	var startInd = 0;
	var endInd = -1;
	
	//Find start
	var i = 0;
	while (start == null && i < markers.length) {
		if (markers[i] != undefined && markers[i] != null) {
			start = markers[i];
			startInd = i;
		}
		i++;
	}
	
	//Find end
	i = markers.length - 1;
	while (end == null && i > startInd) {
		if (markers[i] != undefined && markers[i] != null) {
			end = markers[i];
			endInd = i;
		}
		i--;
	}
	
	//Fill waypoints array
	if (endInd - startInd > 1) {
		for (var j = startInd + 1; j < endInd; j++) {
			if (markers[j] != undefined && markers[j] != null) {
				//push valid markers in to waypoint array
				var wp = {location: markers[j].position};
				wayPoints.push(wp);
			}
		}
	}
	
	if (start != null && end != null) {
		directionsService.route({origin: start.position,
			destination: end.position,
			waypoints: wayPoints,
			travelMode: document.getElementById('mode').value},
			function(response, status) {
				computeTotalDistance(response);
			// Route the directions and pass the response to a function to create
			// markers for each step.
			if (status === google.maps.DirectionsStatus.OK) {
				var display = new google.maps.DirectionsRenderer({map: map, preserveViewport: true});
				display.setDirections(response);
				directionsDisplay = display;
			} else {
				window.alert('Directions request failed due to ' + status);
			}
		});
	} else {
		return;
	}
}

//Unused
function showSteps(directionResult, markerArray, stepDisplay, map) {
	// For each step, place a marker, and add the text to the marker's infowindow.
	// Also attach the marker to an array so we can keep track of it and remove it
	// when calculating new routes.
	var myRoute = directionResult.routes[0].legs[0];
	for (var i = 0; i < myRoute.steps.length; i++) {
		var marker = markerArray[i] = markerArray[i] || new google.maps.Marker;
		marker.setMap(map);
		marker.setPosition(myRoute.steps[i].start_location);
		attachInstructionText(stepDisplay, marker, myRoute.steps[i].instructions);
	}
}

//Unused
function attachInstructionText(stepDisplay, marker, text, map) {
	google.maps.event.addListener(marker, 'click', function() {
		// Open an info window when the marker is clicked on, containing the text
		// of the step.
		stepDisplay.setContent(text);
		stepDisplay.open(map, marker);
	});
}

/**
 * Returns the number of active markers in the markers array
 * 
 * @returns
 */
function activeMarkers() {
	var active = 0;
	
	for (var i = 0; i < markers.length; i++) {
		if (markers[i] != undefined && markers[i] != null) {
			active++;
		}
	}
	
	return active;
}

function computeTotalDistance(result) {
	if (result == null) return;
	
	var total = 0;
	var myroute = result.routes[0];
	for (var i = 0; i < myroute.legs.length; i++) {
		total += myroute.legs[i].distance.value;
	}
	directionsDistance += total; //Distance in M
	
	//Format new total for display
	var directionsDistanceDisp = directionsDistance;
	directionsDistanceDisp /= 1000;
	
	if (!isKM) directionsDistanceDisp *= KM_TO_MI;
	
	directionsDistanceDisp = Number(directionsDistanceDisp).toFixed(2);
	
	directionDistanceControlText.innerHTML = "Total Distance " + directionsDistanceDisp;
	if (isKM) directionDistanceControlText.innerHTML += " KM";
	else directionDistanceControlText.innerHTML += " Mi";
}
