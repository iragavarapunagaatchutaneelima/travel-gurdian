import { 
  haversineDistanceMeters, 
  pointToSegmentDistanceMeters, 
  findNearestPointOnRoute, 
  calculateRouteProgress, 
  isOffRoute, 
  isArrived, 
  parseManeuverIcon, 
  getCurrentAndNextManeuver 
} from "../services/navigationMath";
import { NavigationPosition } from "../types/navigation";

function runTests() {
  console.log("=== TRAVEL GUARDIAN PHASE 4 NAVIGATION MATH TESTS ===");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${msg}`);
    }
  }

  // TEST 1: Haversine distance
  // Chennai (13.0827, 80.2707) to Bangalore (12.9716, 77.5946) ~ 290 km (approx 280-300 km straight line)
  const dist = haversineDistanceMeters(13.0827, 80.2707, 12.9716, 77.5946);
  assert(dist > 280000 && dist < 300000, `Haversine straight-line distance is accurate (~${Math.round(dist / 1000)} km)`);

  // TEST 2: Point to segment distance
  const segStart: [number, number] = [80.0, 13.0];
  const segEnd: [number, number] = [80.1, 13.0];
  const midPoint: [number, number] = [80.05, 13.001]; // ~111 meters north of segment midpoint
  const segResult = pointToSegmentDistanceMeters(midPoint, segStart, segEnd);
  assert(segResult.distanceMeters > 90 && segResult.distanceMeters < 130, `Point to segment perpendicular distance accurate (~${Math.round(segResult.distanceMeters)}m)`);
  assert(segResult.t >= 0.49 && segResult.t <= 0.51, `Projection parameter t is ~0.50 (got ${segResult.t})`);

  // TEST 3: Nearest point on route polyline
  const routeWaypoints: [number, number][] = [
    [80.0, 13.0],
    [80.1, 13.0],
    [80.2, 13.1],
    [80.3, 13.2]
  ];
  const nearest = findNearestPointOnRoute(13.0005, 80.05, routeWaypoints);
  assert(nearest.nearestSegmentIndex === 0, "Nearest segment correctly identified as segment 0");
  assert(nearest.distanceToRouteMeters < 80, `Distance to route correctly calculated (~${Math.round(nearest.distanceToRouteMeters)}m)`);

  // TEST 4: Route progress calculation
  const gpsPos: NavigationPosition = {
    latitude: 13.0001,
    longitude: 80.05,
    accuracy: 15,
    altitude: 20,
    heading: 90,
    speed: 15, // 15 m/s (~54 km/h)
    timestamp: Date.now()
  };
  const totalRouteDist = 40000; // 40 km
  const totalRouteDur = 3600; // 1 hr
  const progress = calculateRouteProgress(gpsPos, routeWaypoints, totalRouteDist, totalRouteDur);
  assert(progress.progressPercent >= 0 && progress.progressPercent <= 100, `Progress percent within valid range (${progress.progressPercent}%)`);
  assert(progress.distanceRemainingMeters <= totalRouteDist, "Remaining distance less than or equal to total distance");
  assert(progress.etaString.length === 5, `ETA formatted as HH:MM (${progress.etaString})`);

  // TEST 5: Off-route detection with noise filtering
  // 40m distance, accuracy 15m -> On route
  assert(!isOffRoute(40, 15, 80, 1.4), "40m from route with 15m accuracy is NOT off-route");
  // 150m distance, accuracy 15m -> Off route (threshold is max(80, 15*1.4) = 80m)
  assert(isOffRoute(150, 15, 80, 1.4), "150m from route with 15m accuracy IS off-route");
  // 95m distance, accuracy 80m -> On route (threshold expands to min(250, 80*1.4) = 112m)
  assert(!isOffRoute(95, 80, 80, 1.4), "95m from route with low accuracy 80m is NOT off-route (accuracy expansion)");

  // TEST 6: Arrival detection
  // 30m from destination, accuracy 15m -> Arrived
  assert(isArrived(13.0, 80.0002, 13.0, 80.0, 15, 50, 1.2), "30m from destination with 15m accuracy triggers arrival");
  // 500m from destination -> Not arrived
  assert(!isArrived(13.005, 80.0, 13.0, 80.0, 15, 50, 1.2), "500m from destination is NOT arrived");

  // TEST 7: Maneuver icon parsing
  assert(parseManeuverIcon("turn-left", "Turn left onto Anna Salai") === "turn-left", "Parse turn-left correctly");
  assert(parseManeuverIcon("fork-right", "Keep right at fork") === "fork-right", "Parse fork-right correctly");
  assert(parseManeuverIcon("roundabout-left", "Enter roundabout") === "roundabout", "Parse roundabout correctly");
  assert(parseManeuverIcon("", "In 200m destination will be on the left") === "arrive", "Parse destination arrival correctly");

  // TEST 8: Step progression
  const testSteps = [
    { instruction: "Head north on Grand Southern Trunk Rd", distance: "2.0 km", duration: "4 mins" },
    { instruction: "Turn left onto Kathipara Flyover", distance: "800 m", duration: "2 mins" },
    { instruction: "Merge onto Mount Poonamallee High Rd", distance: "5.0 km", duration: "10 mins" }
  ];
  const manResult1 = getCurrentAndNextManeuver(testSteps, 500);
  assert(manResult1.currentManeuver?.stepIndex === 1, "At 500m, step index is 1");
  assert(manResult1.nextManeuver?.stepIndex === 2, "Next step index is 2");

  const manResult2 = getCurrentAndNextManeuver(testSteps, 2500);
  assert(manResult2.currentManeuver?.stepIndex === 2, "At 2.5km, step index is 2");

  console.log(`\n=== TEST SUMMARY: ${passed}/${total} TESTS PASSED ===\n`);
}

runTests();
