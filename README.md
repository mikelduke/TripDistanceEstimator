# TripDistanceEstimator
A Javascript Google Maps app to help with planning trips and estimating trip distances

## Features
- Left click to add markers
- Right click to remove
- Automatically draws circles of a configurable radius around each marker
- Automatically draws a straight line path between markers and sums the total distance in Miles or KM
- Can get directions from Google with up to 6 markers
- Saves viewport and other options to local storage
- Can be run locally without a webhost, but an internet connection is required due to the use of the Google Maps API

##Usage
When planning a trip over multiple days, set the Circle Radius to an estimated amount to travel for a half day or day to get an idea of what can be reached.

The Number of Circles option helps to see further distance estimates.

After clicking the second destination, a line will be drawn and a straight-line distance calculated.

Continue to add up to 6 waypoints for directions to work, if not using directions, then the amount is unlimited. 

Click the Get Directions button in the top right corner if it is visible to have Google draw the street directions on to the map and a total actual distance will be calculated.

Click the Clear Map button to start over.

For actual turn by turn directions, it is recommended to use the regular Google Maps app.

Currently only bicycling directions are provided.

##Coming Soon
- Support for more types of directions
- Saving markers
