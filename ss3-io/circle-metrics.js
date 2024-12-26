export class CircleMetrics {
    constructor(triangleSystem) {
        this.triangleSystem = triangleSystem;
        if (typeof paper === 'undefined') {
            console.error('Paper.js library not loaded!');
            return;
        }
        const canvas = document.createElement('canvas');
        paper.setup(canvas);
    }

    calculateCircumcircleMetrics() {
        try {
            const circumcircle = this.triangleSystem.calculateCircumcircle();
            if (!circumcircle || !circumcircle.radius) {
                return null;
            }
            
            // Get external regions
            const externalRegions = this.calculateExternalRegions();
            if (!externalRegions) {
                return null;
            }

            return {
                // Total external area (CC) is the sum of CC1, CC2, CC3
                area: externalRegions.totalExternal,
                circumference: 2 * Math.PI * circumcircle.radius,
                // Include individual regions for reference
                cc1: externalRegions.cc1,
                cc2: externalRegions.cc2,
                cc3: externalRegions.cc3
            };
        } catch (error) {
            console.error('Error calculating circumcircle metrics:', error);
            return null;
        }
    }

    calculateExternalRegions() {
        try {
            const circumcircle = this.triangleSystem.calculateCircumcircle();
            if (!circumcircle || !circumcircle.radius) {
                return null;
            }

            const { n1, n2, n3 } = this.triangleSystem.system;

            // Create circle and triangle paths
            const circle = new paper.Path.Circle({
                center: circumcircle.center,
                radius: circumcircle.radius,
                fillColor: new paper.Color(1, 0, 0, 0.5)
            });

            const triangle = new paper.Path({
                segments: [n1, n2, n3],
                closed: true,
                fillColor: new paper.Color(0, 0, 1, 0.5)
            });

            if (triangle.clockwise) {
                triangle.reverse();
            }

            // Calculate total external area
            const totalCircleArea = Math.abs(circle.area);
            const intersection = triangle.intersect(circle);
            const internalArea = intersection ? Math.abs(intersection.area) : 0;
            const externalArea = totalCircleArea - internalArea;

            // Calculate angles maintaining vertex order
            const angles = this.calculateAngles(n1, n2, n3);
            const totalAngle = angles.a1 + angles.a2 + angles.a3;

            // Map external regions to edges
            const cc1 = (angles.a2 / totalAngle) * externalArea;
            const cc2 = (angles.a3 / totalAngle) * externalArea;
            const cc3 = (angles.a1 / totalAngle) * externalArea;

            // Clean up
            circle.remove();
            triangle.remove();
            if (intersection) intersection.remove();

            return {
                totalExternal: externalArea,
                cc1: cc1,
                cc2: cc2,
                cc3: cc3
            };
        } catch (error) {
            console.error('Error calculating external regions:', error);
            return null;
        }
    }

    calculateAngles(n1, n2, n3) {
        const v1 = { x: n2.x - n1.x, y: n2.y - n1.y };
        const v2 = { x: n3.x - n2.x, y: n3.y - n2.y };
        const v3 = { x: n1.x - n3.x, y: n1.y - n3.y };

        const a1 = Math.abs(Math.atan2(
            v1.x * (-v3.y) - v1.y * (-v3.x),
            v1.x * (-v3.x) + v1.y * (-v3.y)
        ));

        const a2 = Math.abs(Math.atan2(
            v2.x * (-v1.y) - v2.y * (-v1.x),
            v2.x * (-v1.x) + v2.y * (-v1.y)
        ));

        const a3 = Math.abs(Math.atan2(
            v3.x * (-v2.y) - v3.y * (-v2.x),
            v3.x * (-v2.x) + v3.y * (-v2.y)
        ));

        return { a1, a2, a3 };
    }

    calculateNinePointCircleMetrics() {
        try {
            const { n1, n2, n3 } = this.triangleSystem.system;
            
            // Calculate midpoints of the sides
            const midpoint1 = {
                x: (n2.x + n3.x) / 2,
                y: (n2.y + n3.y) / 2
            };
            const midpoint2 = {
                x: (n1.x + n3.x) / 2,
                y: (n1.y + n3.y) / 2
            };
            const midpoint3 = {
                x: (n1.x + n2.x) / 2,
                y: (n1.y + n2.y) / 2
            };

            // Calculate the radius of the nine-point circle
            // The radius is half the radius of the circumscribed circle
            const circumcircle = this.triangleSystem.calculateCircumcircle();
            if (!circumcircle || !circumcircle.radius) {
                return null;
            }

            const radius = circumcircle.radius / 2;
            const area = Math.PI * Math.pow(radius, 2);

            return {
                radius: radius,
                area: area,
                circumference: 2 * Math.PI * radius,
                midpoints: [midpoint1, midpoint2, midpoint3]
            };
        } catch (error) {
            console.error('Error calculating nine-point circle metrics:', error);
            return null;
        }
    }

    calculateNinePointExternalRegions() {
        try {
            const ninePointCircle = this.calculateNinePointCircleMetrics();
            if (!ninePointCircle) {
                return null;
            }

            const { n1, n2, n3 } = this.triangleSystem.system;
            const circumcircle = this.triangleSystem.calculateCircumcircle();

            if (!circumcircle || !circumcircle.center) {
                return null;
            }

            // Create nine-point circle path (centered at the centroid of the triangle)
            const centroid = {
                x: (n1.x + n2.x + n3.x) / 3,
                y: (n1.y + n2.y + n3.y) / 3
            };

            const circle = new paper.Path.Circle({
                center: centroid,
                radius: ninePointCircle.radius,
                fillColor: new paper.Color(1, 0, 0, 0.5)
            });

            const triangle = new paper.Path({
                segments: [n1, n2, n3],
                closed: true,
                fillColor: new paper.Color(0, 0, 1, 0.5)
            });

            if (triangle.clockwise) {
                triangle.reverse();
            }

            // Calculate total external area
            const totalCircleArea = Math.abs(circle.area);
            const intersection = triangle.intersect(circle);
            const internalArea = intersection ? Math.abs(intersection.area) : 0;
            let externalArea = totalCircleArea - internalArea;

            // Check if the external area is very small (likely due to floating point precision)
            // For an equilateral triangle, the nine-point circle should be entirely inside
            const EPSILON = 0.1; // Threshold for considering the area as effectively zero
            if (externalArea < EPSILON) {
                externalArea = 0;
            }

            // Calculate angles maintaining vertex order
            const angles = this.calculateAngles(n1, n2, n3);
            const totalAngle = angles.a1 + angles.a2 + angles.a3;

            // Map external regions to edges (only if there is actual external area)
            const np1 = externalArea === 0 ? 0 : (angles.a2 / totalAngle) * externalArea;
            const np2 = externalArea === 0 ? 0 : (angles.a3 / totalAngle) * externalArea;
            const np3 = externalArea === 0 ? 0 : (angles.a1 / totalAngle) * externalArea;

            // Clean up
            circle.remove();
            triangle.remove();
            if (intersection) intersection.remove();

            return {
                totalExternal: externalArea,
                np1: np1,
                np2: np2,
                np3: np3
            };
        } catch (error) {
            console.error('Error calculating nine-point external regions:', error);
            return null;
        }
    }
} 