/**
 * @fileoverview The file contains the required math for raycasting.
 * @package
 * @module math/Raycasting
 * @author gv-sh
 * @version 1.0.0
 */

/**
 * This function checks if a point is inside a polygon.
 * @param {Object} point - The point to check.
 * @param {Object[]} vertices - The vertices of the polygon.
 * @returns {boolean} Whether the point is inside the polygon.
 */
export const isPointInsidePolygon = (point, vertices) => {
    let intersections = 0;

    for (let i = 0; i < vertices.length; i++) {
        const vertex1 = vertices[i];
        const vertex2 = vertices[(i + 1) % vertices.length];  // This ensures the last point connects to the first

        // Check if point is on an horizontal boundary
        if (vertex1.y === point.y && vertex2.y === point.y && point.x > Math.min(vertex1.x, vertex2.x) && point.x < Math.max(vertex1.x, vertex2.x)) {
            return true;
        }

        // Check if point is on a vertex
        if (point.x === vertex1.x && point.y === vertex1.y) {
            return true;
        }

        // Check if ray is intersecting edge (excluding endpoints)
        if (point.y > Math.min(vertex1.y, vertex2.y) && point.y <= Math.max(vertex1.y, vertex2.y) && point.x <= Math.max(vertex1.x, vertex2.x) && vertex1.y !== vertex2.y) {
            const xinters = (point.y - vertex1.y) * (vertex2.x - vertex1.x) / (vertex2.y - vertex1.y) + vertex1.x;
            if (xinters === point.x) {  // Check if point is on the polygon boundary (other than horizontal)
                return true;
            }
            if (vertex1.x === vertex2.x || point.x <= xinters) {
                intersections++;
            }
        }
    }

    // If the number of edges we passed through is odd, then it's in the polygon.
    return intersections % 2 !== 0;
}
