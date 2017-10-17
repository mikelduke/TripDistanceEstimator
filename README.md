# TripDistanceEstimator
A Javascript Google Maps app to help with planning trips and estimating trip distances

## Try it out
Now hosted on Github Pages https://mikelduke.github.io/TripDistanceEstimator/

## Features
- Left click to add markers
- Right click to remove
- Automatically draws circles of a configurable radius around each marker
- Automatically draws a straight line path between markers and sums the total distance in Miles or KM
- Can get directions from Google with up to 6 markers
- Saves viewport and other options to local storage
- Can be run locally without a webhost, but an internet connection is required due to the use of the Google Maps API

## About
On a recent cross country bicycle tour, I found planning which cities to hit next was a little tedious using the basic Google Maps app. I didn't really need exact directions when I was trying to plan out which towns I would be in over the next couple of days. Without a useful scale on the map, picking the right cities in a general direction became a repetitive task of constantly reloading directions and remembering or writing the the general distances.

Using this tool, you would instead be able to set, for example, a 50 mile radius with 2 circles to help pick towns along a vague route and then get an actual distance calculation to verify the route. Then for the day to day driving, a regular turn by turn maps app could be used.

This same process could easily be used for planning out a road trip, just on a larger scale.

## Usage
When planning a trip over multiple days, set the Circle Radius to an estimated amount to travel for a half day or day to get an idea of what can be reached.

The Number of Circles option helps to see further distance estimates.

After clicking the second destination, a line will be drawn and a straight-line distance calculated.

Continue to add up to 6 waypoints for directions to work, if not using directions, then the amount is unlimited. 

Click the Get Directions button in the top right corner if it is visible to have Google draw the street directions on to the map and a total actual distance will be calculated.

Click the Clear Map button to start over.

For actual turn by turn directions, it is recommended to use the regular Google Maps app.
