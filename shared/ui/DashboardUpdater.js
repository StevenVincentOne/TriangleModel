export class DashboardUpdater {
    constructor(rulesModule) {
        this.rulesModule = rulesModule;
    }

    update() {
        if (!this.rulesModule) {
            console.log('RulesModule not yet available, skipping dashboard update.');
            return;
        }
        try {
            if (!this.rulesModule.isSystemInitialized()) {
                console.log('System not fully initialized, skipping dashboard update');
                return;
            }

            // Initialize altitudePoints if not already set
            if (!this.altitudePoints) {
                this.altitudePoints = Array(3).fill({ x: 0, y: 0 });
            }

            // Try to calculate new altitude points only if system is properly initialized
            if (this.system && this.system.n1 && this.system.n2 && this.system.n3) {
                const altitudes = this.calculateAltitudes();
                if (altitudes) {
                    this.altitudePoints = [
                        altitudes.α1 || { x: 0, y: 0 },
                        altitudes.α2 || { x: 0, y: 0 },
                        altitudes.α3 || { x: 0, y: 0 }
                    ];
                }
            }

            // Update Altitudes panel values with defensive checks
            ['1', '2', '3'].forEach(i => {
                const altitudeCoordsId = `altitude${i}-coords`;
                const altitudeCoordsElement = document.getElementById(altitudeCoordsId);
                
                if (altitudeCoordsElement) {
                    const point = this.altitudePoints[i-1] || { x: 0, y: 0 };
                    const x = isNaN(point.x) ? 0 : point.x;
                    const y = isNaN(point.y) ? 0 : point.y;
                    altitudeCoordsElement.value = `${x.toFixed(1)}, ${y.toFixed(1)}`;
                }
            });

            // Helper function to set element value and handle missing elements
            const setElementValue = (selector, value, precision = 2) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.value = typeof value === 'number' ? value.toFixed(precision) : value;
                }
            };

            // Calculate system values
            const area = this.calculateArea();
            const perimeter = this.calculatePerimeter();
            
            // Calculate and display inradius (rIN)
            const semiperimeter = perimeter / 2;
            const inradius = area / semiperimeter;
            setElementValue('#inradius', inradius);

            // Calculate and display incircle capacity (CIN = π * rIN²)
            const incircleCapacity = Math.PI * inradius * inradius;
            setElementValue('#incircle-capacity', incircleCapacity);

            // Calculate and display incircle entropy (HIN = 2π * rIN)
            const incircleEntropy = 2 * Math.PI * inradius;
            setElementValue('#incircle-entropy', incircleEntropy);

            

            // Update both dashboard and Information Panel
            
            setElementValue('#system-c', area.toFixed(2));  // Keep original ID
            setElementValue('#system-sph', perimeter);  // Perimeter is now shown as 'SPH'

            // Calculate and set SPH/A ratio
            if (area !== 0) {
                const sphAreaRatio = perimeter / area;
                setElementValue('#sph-area-ratio', sphAreaRatio.toFixed(4));  // Changed from #sph-b-ratio
                setElementValue('#b-sph-ratio', (1 / sphAreaRatio).toFixed(4));
            }

            // Nodes Panel
            const angles = this.calculateAngles();
            setElementValue('#node-n1-angle', angles.n1);
            setElementValue('#node-n2-angle', angles.n2);
            setElementValue('#node-n3-angle', angles.n3);

            // Channels (Edges) Panel
            const lengths = this.calculateLengths();
            setElementValue('#channel-1', lengths.l1); // NC1 (Red): N1 to N3
            setElementValue('#channel-2', lengths.l2); // NC2 (Blue): N1 to N2
            setElementValue('#channel-3', lengths.l3); // NC3 (Green): N2 to N3

            // Position Panel
            const centroid = {
                x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
                y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
            };
            
            // Update vertex coordinates
            setElementValue('#node1-coords', `${this.system.n1.x.toFixed(1)}, ${this.system.n1.y.toFixed(1)}`);
            setElementValue('#node2-coords', `${this.system.n2.x.toFixed(1)}, ${this.system.n2.y.toFixed(1)}`);
            setElementValue('#node3-coords', `${this.system.n3.x.toFixed(1)}, ${this.system.n3.y.toFixed(1)}`);
            
            setElementValue('#centroid-coords', `${centroid.x.toFixed(1)}, ${centroid.y.toFixed(1)}`);
            
            if (this.system.incenter) {
                setElementValue('#incenter-coords', 
                    `${this.system.incenter.x.toFixed(1)}, ${this.system.incenter.y.toFixed(1)}`);
                
                // Update Information Panel distances and ratios
                setElementValue('#d-i-ic', this.calculateDistance(
                    { x: 0, y: 0 }, // Intelligence point is at origin
                    this.system.incenter
                ));
                setElementValue('#r-i-ic', this.calculateDistance(
                    { x: 0, y: 0 }, // Intelligence point is at origin
                    this.system.incenter
                ) / perimeter);
            }

            // Update subsystem metrics
            const subsystemAngles = this.calculateSubsystemAngles();
            const subsystemPerimeters = this.calculateSubsystemPerimeters();
            this.subsystemAreas = this.calculateSubsystemAreas();  // Update the class property
            
            for (let i = 1; i <= 3; i++) {
                const area = this.subsystemAreas[i-1];
                const perimeter = subsystemPerimeters[i-1];
                
                // Calculate both ratios (if perimeter is not zero)
                const ratio = area !== 0 ? perimeter / area : 0;
                const inverseRatio = perimeter !== 0 ? area / perimeter : 0;
                
                // Update displays
                setElementValue(`#subsystem-${i}-angle`, subsystemAngles[i-1].toFixed(2));
                setElementValue(`#subsystem-${i}-area`, area.toFixed(2));
                setElementValue(`#subsystem-${i}-perimeter`, perimeter.toFixed(2));
                setElementValue(`#subsystem-${i}-ratio`, ratio.toFixed(4));
                setElementValue(`#subsystem-${i}-inverse-ratio`, inverseRatio.toFixed(4));
            }

            // Panel Updates
            const { n1, n2, n3, incenter } = this.system;
            
            // Calculate midpoints (M) for each edge
            const midpoints = this.calculateMidpoints();
            
            // Calculate tangent points (T)
            const tangentPoints = this.calculateTangents();
            
            // Calculate d(M,T) distances for each node
            const dMT = {
                n1: this.calculateDistance(midpoints.m1, tangentPoints[0]), // For NC1
                n2: this.calculateDistance(midpoints.m2, tangentPoints[1]), // For NC2
                n3: this.calculateDistance(midpoints.m3, tangentPoints[2])  // For NC3
            };

            // Calculate r(M,T) ratios (distance divided by total perimeter)
            const rMT = {
                n1: perimeter !== 0 ? dMT.n1 / perimeter : 0,
                n2: perimeter !== 0 ? dMT.n2 / perimeter : 0,
                n3: perimeter !== 0 ? dMT.n3 / perimeter : 0
            };

            // Update Information Panel
            setElementValue('#d-m-t-n1', dMT.n1.toFixed(2));
            setElementValue('#d-m-t-n2', dMT.n2.toFixed(2));
            setElementValue('#d-m-t-n3', dMT.n3.toFixed(2));
            
            setElementValue('#r-m-t-n1', rMT.n1.toFixed(4));
            setElementValue('#r-m-t-n2', rMT.n2.toFixed(4));
            setElementValue('#r-m-t-n3', rMT.n3.toFixed(4));

            this.updateManualFields();

            // Update vertex coordinates in Position panel
            document.getElementById('node1-coords').value = `${n1.x.toFixed(1)}, ${n1.y.toFixed(1)}`;
            document.getElementById('node2-coords').value = `${n2.x.toFixed(1)}, ${n2.y.toFixed(1)}`;
            document.getElementById('node3-coords').value = `${n3.x.toFixed(1)}, ${n3.y.toFixed(1)}`;

            // Update circumcenter coordinates
            if (this.system.circumcenter) {
                const { x, y } = this.system.circumcenter;
                document.getElementById('circumcenter-coords').value = `${x.toFixed(1)}, ${y.toFixed(1)}`;
            }

            // Update orthocenter coordinates
            const orthocenter = this.calculateOrthocenter();
            if (orthocenter) {
                setElementValue('#orthocenter-coords', 
                    `${orthocenter.x.toFixed(1)}, ${orthocenter.y.toFixed(1)}`);
            }

            // Update nine-point center coordinates
            const ninePointCircle = this.calculateNinePointCircle();
            if (ninePointCircle && ninePointCircle.center) {
                setElementValue('#nine-point-coords', 
                    `${ninePointCircle.center.x.toFixed(1)}, ${ninePointCircle.center.y.toFixed(1)}`);
            }

            // Get the subsystem area (which is already calculated as system area / 3)
            const subsystemArea = area / 3;  // Using the existing 'area' variable

            // Update subsystem areas
            setElementValue('#subsystem-1-area', subsystemArea.toFixed(2));
            setElementValue('#subsystem-2-area', subsystemArea.toFixed(2));
            setElementValue('#subsystem-3-area', subsystemArea.toFixed(2));

            // Add CSS dynamically to ensure input fields are wide enough
            const style = document.createElement('style');
            style.textContent = `
                .subsystems-table input[type="text"] {
                    min-width: 90px !important;  /* Increased from current width */
                    width: auto !important;
                    text-align: right;
                }
            `;
            document.head.appendChild(style);

            // Calculate and update subsystem centroids
            const centroids = this.calculateSubsystemCentroids();
            const formatCoord = (x, y) => {
                const xStr = x.toFixed(1);  // Remove padStart
                const yStr = y.toFixed(1);  // Remove padStart
                return `${xStr},${yStr}`;   // No spaces, just comma
            };

            // Get the elements first with null checks
            const sphAreaRatioElement = document.getElementById('sph-area-ratio');
            const areaSphRatioElement = document.getElementById('area-sph-ratio');

            // Only proceed if both elements exist
            if (sphAreaRatioElement && areaSphRatioElement) {
                // Use the system's existing values instead of reading from DOM
                const sphValue = this.system.sph;
                const areaValue = this.system.area;
                
                if (sphValue && areaValue && areaValue !== 0) {
                    const ratio = sphValue / areaValue;
                    sphAreaRatioElement.value = ratio.toFixed(4);
                    areaSphRatioElement.value = (1 / ratio).toFixed(4);
                }
            }    
        
            // Calculate IC values (distances from centroid to vertices)
            const ic1 = this.calculateDistance(centroid, this.system.n1);
            const ic2 = this.calculateDistance(centroid, this.system.n2);
            const ic3 = this.calculateDistance(centroid, this.system.n3);
        
            // Log IC values for debugging
            console.log('Calculated IC values:', { ic1, ic2, ic3 });
        
            // Calculate I-Channel Entropy (HIC) as the sum of IC values
            const hic = ic1 + ic2 + ic3;
            console.log('Calculated HIC total:', hic);
        
            // Set IC values in the input fields
            setElementValue('#ic-1', ic1.toFixed(2));
            setElementValue('#ic-2', ic2.toFixed(2));
            setElementValue('#ic-3', ic3.toFixed(2));
        
            // Set HIC value in the dashboard
            setElementValue('#system-mch', hic.toFixed(2)); // Set the main HIC value
            setElementValue('#mc-h', hic.toFixed(2));       // Set the alternative HIC display
        
            // Get System Perimeter Entropy (HP)
            const hp = parseFloat(document.querySelector('#system-sph')?.value) || 0;
            console.log('System Perimeter Entropy (HP):', hp);
                        
            // Get system capacity (C)
            const capacity = this.calculateArea();
            console.log('System Capacity (C):', capacity);
        
            // Calculate and set the ratios only if HIC is not zero
            if (hic !== 0) {
                if (capacity !== 0) {
                    // HIC/C ratio
                    setElementValue('#mch-b-ratio', (hic / capacity).toFixed(4));
                    setElementValue('#b-mch-ratio', (capacity / hic).toFixed(4));
                    console.log('Set HIC/C and C/HIC ratios');
                }
                            
                if (hp !== 0) {
                    // HIC/HP ratio
                    setElementValue('#hic-hp-ratio', (hic / hp).toFixed(4));
                    setElementValue('#hp-hic-ratio', (hp / hic).toFixed(4));
                    console.log('Set HIC/HP and HP/HIC ratios');
                }
            } else {
                console.warn('HIC is zero. Ratios dependent on HIC will not be calculated.');
            }
        
            // Optionally, set Total System Entropy (H = HP + HIC)
            const totalSystemEntropy = hp + hic;
            setElementValue('#system-h', totalSystemEntropy.toFixed(2));
            console.log('Total System Entropy (H):', totalSystemEntropy);

            

            // Get system capacity (C) value - Update selector to match HTML
            const systemCapacity = parseFloat(document.querySelector('#system-c')?.value) || 0;

            

            // Calculate and update ssh/H ratios for each subsystem
            for (let i = 1; i <= 3; i++) {
                const perimeter = subsystemPerimeters[i-1];
                const sshHRatio = totalSystemEntropy !== 0 ? perimeter / totalSystemEntropy : 0;
                setElementValue(`#subsystem-${i}-entropy-ratio`, sshHRatio.toFixed(4));
            }

            // Only try to update mc-h if it exists
            const mcHElement = document.querySelector('#mc-h');
            if (mcHElement) {
                setElementValue('#mc-h', hic.toFixed(2));
            }

            // Calculate subchannels (distances between centroids)
            const subchannels = {
                sc1: this.calculateDistance(centroids.ss1, centroids.ss3), // SS1 to SS3
                sc2: this.calculateDistance(centroids.ss1, centroids.ss2), // SS1 to SS2
                sc3: this.calculateDistance(centroids.ss2, centroids.ss3)  // SS2 to SS3
            };

            // Add subchannel calculations right after the existing centroid updates
            setElementValue('#subchannel-1', this.calculateDistance(centroids.ss1, centroids.ss3).toFixed(2)); // SS1 to SS3
            setElementValue('#subchannel-2', this.calculateDistance(centroids.ss1, centroids.ss2).toFixed(2)); // SS1 to SS2
            setElementValue('#subchannel-3', this.calculateDistance(centroids.ss2, centroids.ss3).toFixed(2)); // SS2 to SS3

            // Calculate HST (Entropy of Subtriangle) - sum of SC values
            const sc1 = parseFloat(document.querySelector('#subchannel-1').value) || 0;
            const sc2 = parseFloat(document.querySelector('#subchannel-2').value) || 0;
            const sc3 = parseFloat(document.querySelector('#subchannel-3').value) || 0;
            const subtrianglePerimeter = sc1 + sc2 + sc3;

            // Update HST values
            setElementValue('#subsystem-1-hst', subtrianglePerimeter.toFixed(2));
            setElementValue('#subsystem-2-hst', subtrianglePerimeter.toFixed(2));
            setElementValue('#subsystem-3-hst', subtrianglePerimeter.toFixed(2));

            // Update subcenter coordinates using existing calculateSubcircle method
            const subcircle = this.calculateSubcircle();
            if (subcircle && subcircle.center) {
                setElementValue('#subcenter-coords', 
                    `${subcircle.center.x.toFixed(1)}, ${subcircle.center.y.toFixed(1)}`);
            }

            
            
            // Update capacity value in System Entropy and Capacity panel
            setElementValue('#system-c', capacity.toFixed(2));  // Keep original ID

            // Calculate and update ratios using the new capacity value
            if (capacity !== 0) {
                // H/C and C/H ratios
                if (totalSystemEntropy !== 0) {
                    setElementValue('#sh-b-ratio', (totalSystemEntropy / capacity).toFixed(4));
                    setElementValue('#b-sh-ratio', (capacity / totalSystemEntropy).toFixed(4));
                }
                
                // HP/C and C/HP ratios
                if (hp !== 0 && systemCapacity !== 0) {
                    setElementValue('#sph-area-ratio', (hp / capacity).toFixed(4));
                    setElementValue('#b-sph-ratio', (systemCapacity / hp).toFixed(4));
                }
                
                // HMC/C and C/HMC ratios
                if (hic !== 0) {
                    setElementValue('#mch-b-ratio', (hic / capacity).toFixed(4));
                    setElementValue('#b-mch-ratio', (capacity / hic).toFixed(4));
                }
            }

            // Update Subtriangle Panel
            // Calculate centroids for each subsystem and store them
            const subtriangleCentroids = {
                ss1: this.calculateSubsystemCentroid(1),
                ss2: this.calculateSubsystemCentroid(2),
                ss3: this.calculateSubsystemCentroid(3)
            };

            // Only update if we have valid centroids
            if (subtriangleCentroids.ss1.x !== 0 || subtriangleCentroids.ss1.y !== 0) {
                // Update centroid coordinates display
                setElementValue('#subsystem-1-centroid', 
                    `${subtriangleCentroids.ss1.x.toFixed(1)}, ${subtriangleCentroids.ss1.y.toFixed(1)}`);
                setElementValue('#subsystem-2-centroid', 
                    `${subtriangleCentroids.ss2.x.toFixed(1)}, ${subtriangleCentroids.ss2.y.toFixed(1)}`);
                setElementValue('#subsystem-3-centroid', 
                    `${subtriangleCentroids.ss3.x.toFixed(1)}, ${subtriangleCentroids.ss3.y.toFixed(1)}`);

                // Calculate subchannels (distances between centroids)
                const subchannelDistances = {
                    sc1: this.calculateDistance(subtriangleCentroids.ss2, subtriangleCentroids.ss3),
                    sc2: this.calculateDistance(subtriangleCentroids.ss1, subtriangleCentroids.ss3),
                    sc3: this.calculateDistance(subtriangleCentroids.ss1, subtriangleCentroids.ss2)
                };

                // Update subchannel values
                setElementValue('#subchannel-1', subchannelDistances.sc1.toFixed(2));
                setElementValue('#subchannel-2', subchannelDistances.sc2.toFixed(2));
                setElementValue('#subchannel-3', subchannelDistances.sc3.toFixed(2));

                // Calculate HST and CST
                const subtriangle_hst = subchannelDistances.sc1 + 
                                          subchannelDistances.sc2 + 
                                          subchannelDistances.sc3;
                const subtriangle_cst = this.calculateSubtriangleArea(subtriangleCentroids);

                setElementValue('#subtriangle-hst', subtriangle_hst.toFixed(2));
                setElementValue('#subtriangle-cst', subtriangle_cst.toFixed(2));

                // Update ratios
                if (subtriangle_cst !== 0 && subtriangle_hst !== 0) {
                    setElementValue('#hst-cst-ratio', (subtriangle_hst / subtriangle_cst).toFixed(4));
                    setElementValue('#cst-hst-ratio', (subtriangle_cst / subtriangle_hst).toFixed(4));
                }
            }

            // Add Euler Line measurements with proper element selection
            const eulerMetrics = this.calculateEulerLineMetrics();
            if (eulerMetrics) {
                // Existing Euler Line metric updates
                document.getElementById('euler-line-length').value = eulerMetrics.eulerLineLength;
                document.getElementById('euler-line-slope').value = eulerMetrics.eulerLineSlope;
                document.getElementById('euler-line-angle').value = eulerMetrics.eulerLineAngle;
                document.getElementById('o-i-ratio').value = eulerMetrics.oToIRatio;
                document.getElementById('i-sp-ratio').value = eulerMetrics.iToSPRatio;
                document.getElementById('sp-np-ratio').value = eulerMetrics.spToNPRatio;
                document.getElementById('np-ho-ratio').value = eulerMetrics.npToHORatio;

                // Add new intersection angle updates
                if (eulerMetrics.intersectionAngles) {
                    document.getElementById('nc1-acute').value = eulerMetrics.intersectionAngles.nc1_acute;
                    document.getElementById('nc1-obtuse').value = eulerMetrics.intersectionAngles.nc1_obtuse;
                    document.getElementById('nc2-acute').value = eulerMetrics.intersectionAngles.nc2_acute;
                    document.getElementById('nc2-obtuse').value = eulerMetrics.intersectionAngles.nc2_obtuse;
                    document.getElementById('nc3-acute').value = eulerMetrics.intersectionAngles.nc3_acute;
                    document.getElementById('nc3-obtuse').value = eulerMetrics.intersectionAngles.nc3_obtuse;
                }
            }

            // Inside updateDashboard() method, where other ratios are calculated
            if (hp !== 0 && hic !== 0) {
                // HP/HIC and HIC/HP ratios
                setElementValue('#hp-hic-ratio', (hp / hic).toFixed(4));
                setElementValue('#hic-hp-ratio', (hic / hp).toFixed(4));
            }

            // Add HIC/C ratio calculation
            if (capacity !== 0 && hic !== 0) {
                setElementValue('#mch-b-ratio', (hic / capacity).toFixed(4));
            }

            // HIC/HP ratio is already being set above, but let's ensure it's visible
            if (hp !== 0 && hic !== 0) {
                setElementValue('#hic-hp-ratio', (hic / hp).toFixed(4));
            }

            if (totalSystemEntropy !== 0) {
                // HP/H and H/HP ratios
                setElementValue('#hp-h-ratio', (hp / totalSystemEntropy).toFixed(4));
                setElementValue('#h-hp-ratio', (totalSystemEntropy / hp).toFixed(4));
                
                // HIC/H and H/HIC ratios
                setElementValue('#hic-h-ratio', (hic / totalSystemEntropy).toFixed(4));
                setElementValue('#h-hic-ratio', (totalSystemEntropy / hic).toFixed(4));
            }

            // Calculate d(I,IN) - distance between centroid and incenter
            if (this.system.incenter) {
            const centroid = this.calculateCentroid();
                const dIIN = this.calculateDistance(centroid, this.system.incenter);
                setElementValue('#d-i-in', dIIN.toFixed(2));

                // Calculate distances between Incenter and Subsystem centroids
                const subsystemCentroids = this.calculateSubsystemCentroids();
                
                // Calculate and set distances between Incenter and each subsystem centroid
                const dINssi1 = this.calculateDistance(this.system.incenter, subsystemCentroids.ss1);
                const dINssi2 = this.calculateDistance(this.system.incenter, subsystemCentroids.ss2);
                const dINssi3 = this.calculateDistance(this.system.incenter, subsystemCentroids.ss3);

                setElementValue('#d-in-ssi1', dINssi1.toFixed(2));
                setElementValue('#d-in-ssi2', dINssi2.toFixed(2));
                setElementValue('#d-in-ssi3', dINssi3.toFixed(2));
            }

            this.updateICFields();
            this.updateRNCMTFields();  // Add this line

            // Add after line 1177 (after calculating incircleEntropy)
            // Calculate Incircle ratios
            if (incircleEntropy !== 0) {
                // CIN/HIN and HIN/CIN ratios
                setElementValue('#cin-hin-ratio', (incircleCapacity / incircleEntropy).toFixed(4));
                setElementValue('#hin-cin-ratio', (incircleEntropy / incircleCapacity).toFixed(4));
                
                // Add CIN/C ratio (using systemCapacity)
                if (systemCapacity !== 0) {
                    setElementValue('#cin-c-ratio', (incircleCapacity / systemCapacity).toFixed(4));
                }
                
                // Add HIN/H ratio (using totalSystemEntropy)
                if (totalSystemEntropy !== 0) {
                    setElementValue('#hin-h-ratio', (incircleEntropy / totalSystemEntropy).toFixed(4));
                }
            }

            // Update subsystems table
            for (let i = 1; i <= 3; i++) {
                const centroid = this.calculateCentroid();
                
                // Calculate ssh (subsystem entropy/perimeter) first
                let ssh;
                if (i === 1) {
                    // SS1 (red): NC1 + IC1 + IC3
                    ssh = this.calculateDistance(this.system.n1, this.system.n3) +  // NC1
                         this.calculateDistance(this.system.n1, centroid) +         // IC1
                         this.calculateDistance(this.system.n3, centroid);          // IC3
                } else if (i === 2) {
                    // SS2 (blue): NC2 + IC1 + IC2
                    ssh = this.calculateDistance(this.system.n1, this.system.n2) +  // NC2
                         this.calculateDistance(this.system.n1, centroid) +         // IC1
                         this.calculateDistance(this.system.n2, centroid);          // IC2
                } else {
                    // SS3 (green): NC3 + IC2 + IC3
                    ssh = this.calculateDistance(this.system.n2, this.system.n3) +  // NC3
                         this.calculateDistance(this.system.n2, centroid) +         // IC2
                         this.calculateDistance(this.system.n3, centroid);          // IC3
                }
                
                // Update ssh value
                setElementValue(`#subsystem-${i}-perimeter`, ssh.toFixed(4));
                
                // Calculate capacity (ssc)
                const capacity = this.calculateSubsystemCapacity(i);
                setElementValue(`#subsystem-${i}-area`, capacity.toFixed(4));
                
                // Update ratios only if capacity is not zero
                if (capacity !== 0) {
                    // Update ssh/ssc ratio
                    const sshSscRatio = ssh / capacity;
                    setElementValue(`#subsystem-${i}-ratio`, sshSscRatio.toFixed(4));
                    
                    // Update ssc/ssh ratio
                    const sscSshRatio = capacity / ssh;
                    setElementValue(`#subsystem-${i}-inverse-ratio`, sscSshRatio.toFixed(4));
                }
                
                // Update entropy ratios separately
                if (totalSystemEntropy !== 0 && ssh !== 0) {
                    // Update ssh/H ratio (System Entropy Ratio)
                    setElementValue(`#subsystem-${i}-system-ratio`, (ssh/totalSystemEntropy).toFixed(4));
                    
                    // Update H/ssh ratio (Inverse System entropy ratio)
                    setElementValue(`#subsystem-${i}-entropy-ratio`, (totalSystemEntropy/ssh).toFixed(4));
                }
            }

            // Draw IC lines if enabled (after drawing nodes but before special centers)
            if (this.showIC) {
                this.drawICLines(this.ctx);
            }

            // Update altitude coordinates and lengths
            const altitudes = this.calculateAltitudes();
            ['1', '2', '3'].forEach(i => {
                const foot = altitudes[`α${i}`];
                const length = altitudes.lengths[`α${i}`];
                
                setElementValue(
                    `#altitude${i}-coords`,
                    `${foot.x.toFixed(1)}, ${foot.y.toFixed(1)}`
                );
                setElementValue(
                    `#altitude${i}-length`,
                    length.toFixed(2)
                );
            });

            // Update Medians panel - Display Full Medians
            const fullMedians = this.calculateFullMedians();
            ['1', '2', '3'].forEach(i => {
                const m = fullMedians[`m${i}`];
                if (m) {
                    // Update median coordinates
                    setElementValue(
                        `#mid${i}-coords`,
                        `${m.point.x.toFixed(1)}, ${m.point.y.toFixed(1)}`
                    );
                    
                    
                    // Update median lengths with correct mapping
                    let medianLengthId;
                    switch(i) {
                        case '1':
                            medianLengthId = '#median2-length'; // N2 to M1
                            break;
                        case '2':
                            medianLengthId = '#median3-length'; // N3 to M2
                            break;
                        case '3':
                            medianLengthId = '#median1-length'; // N1 to M3
                            break;
                    }
                    
                    setElementValue(medianLengthId, m.length.toFixed(2));
                    
                } else {
                    console.warn(`Full median data not found for m${i}`);
                }
            });

            // Draw altitudes if enabled
            if (this.showAltitudes) {
                const altitudes = this.calculateAltitudes();
                
                // Set up the dotted line style
                this.ctx.setLineDash([5, 5]);
                this.ctx.strokeStyle = '#b600ff';  // Purple color
                this.ctx.lineWidth = 2;

                // Draw altitude lines
                this.ctx.beginPath();
                // Altitude from N1
                this.ctx.moveTo(this.system.n1.x, this.system.n1.y);
                this.ctx.lineTo(altitudes.α1.x, altitudes.α1.y);
                // Altitude from N2
                this.ctx.moveTo(this.system.n2.x, this.system.n2.y);
                this.ctx.lineTo(altitudes.α2.x, altitudes.α2.y);
                // Altitude from N3
                this.ctx.moveTo(this.system.n3.x, this.system.n3.y);
                this.ctx.lineTo(altitudes.α3.x, altitudes.α3.y);
                this.ctx.stroke();

                // Reset line dash and draw feet points
                this.ctx.setLineDash([]);
                this.ctx.fillStyle = '#b600ff';
                
                // Draw feet points
                ['α1', 'α2', 'α3'].forEach(foot => {
                    this.ctx.beginPath();
                    this.ctx.arc(altitudes[foot].x, altitudes[foot].y, 4, 0, 2 * Math.PI);
                    this.ctx.fill();
                });
            }

            // Update the display value
            this.updateDisplayValue();

            // Update Altitudes panel values
            ['1', '2', '3'].forEach(i => {
                const altitudeCoordsId = `altitude${i}-coords`;
                const altitudeCoordsElement = document.getElementById(altitudeCoordsId);
                
                if (altitudeCoordsElement) {
                    // Check if altitudePoints exists and has the required index
                    if (this.altitudePoints && this.altitudePoints[i-1]) {
                        const point = this.altitudePoints[i-1];
                        const x = isNaN(point.x) ? 0 : point.x;
                        const y = isNaN(point.y) ? 0 : point.y;
                        altitudeCoordsElement.value = `${x.toFixed(1)}, ${y.toFixed(1)}`;
                    } else {
                        // If no valid altitude point exists, display zeros
                        altitudeCoordsElement.value = '0.0, 0.0';
                    }
                }
            });

            // Update subsystem sc values - make these optional
            for (let i = 1; i <= 3; i++) {
                const scElement = document.getElementById(`subsystem-${i}-sc`);
                if (scElement) {  // Only update if element exists
                    const ic = this.calculateDistance(centroid, this.system[`n${i}`]);
                    scElement.value = ic.toFixed(2);
                }
            }

            // Example line that might cause the error
            const firstArea = this.subsystemAreas[0];

            // Update tangent point coordinates
            if (this.tangentPoints || this.system.tangentPoints) {
                const points = this.tangentPoints || this.system.tangentPoints;
                ['1', '2', '3'].forEach(i => {
                    const inputElement = document.getElementById(`tan${i}-coords`);
                    
                    if (inputElement && points[i-1]) {
                        const point = points[i-1];
                        // Remove parentheses, just use comma-separated values
                        const coordString = `${this.formatValue(point.x)}, ${this.formatValue(point.y)}`;
                        inputElement.value = coordString;
                        
                    } else {
                        if (inputElement) {
                            inputElement.value = '-, -';
                        }
                        console.warn(`Issue with T${i}`);
                    }
                });
                
            } else {
                console.warn('No tangent points available');
                ['1', '2', '3'].forEach(i => {
                    const inputElement = document.getElementById(`tan${i}-coords`);
                    if (inputElement) {
                        inputElement.value = '-, -';
                    }
                });
            }

            // Initialize CircleMetrics if not already done
            if (!this.circleMetrics) {
                this.circleMetrics = new CircleMetrics(this);
            }

            // Calculate and display circumcircle metrics
            const circumcircleMetrics = this.circleMetrics.calculateCircumcircleMetrics();
            let externalMetrics = this.circleMetrics.calculateExternalRegions(); // Changed const to let

            if (circumcircleMetrics && externalMetrics) {
                // Total Capacity
                const totalCapacity = circumcircleMetrics.area;
                const totalUtilization = this.rulesModule.capacityModule.calculateUtilization(totalCapacity);
                setElementValue('#circumcircle-area', totalCapacity.toFixed(2));
                setElementValue('#circumcircle-utilization', `${totalUtilization.toFixed(1)}%`);

                // CC1 Region
                const cc1Capacity = externalMetrics.cc1;
                const cc1Utilization = this.rulesModule.capacityModule.calculateRegionUtilization('cc1', cc1Capacity);
                setElementValue('#cc1-area', cc1Capacity.toFixed(2));
                setElementValue('#cc1-utilization', `${cc1Utilization.toFixed(1)}%`);

                // CC2 Region
                const cc2Capacity = externalMetrics.cc2;
                const cc2Utilization = this.rulesModule.capacityModule.calculateRegionUtilization('cc2', cc2Capacity);
                setElementValue('#cc2-area', cc2Capacity.toFixed(2));
                setElementValue('#cc2-utilization', `${cc2Utilization.toFixed(1)}%`);

                // CC3 Region
                const cc3Capacity = externalMetrics.cc3;
                const cc3Utilization = this.rulesModule.capacityModule.calculateRegionUtilization('cc3', cc3Capacity);
                setElementValue('#cc3-area', cc3Capacity.toFixed(2));
                setElementValue('#cc3-utilization', `${cc3Utilization.toFixed(1)}%`);
            }

            // Calculate and display external regions for circumcircle (duplicate declaration removed)
            if (externalMetrics) {
                this.setElementValue('#cc1-area', externalMetrics.cc1.toFixed(2));
                this.setElementValue('#cc2-area', externalMetrics.cc2.toFixed(2));
                this.setElementValue('#cc3-area', externalMetrics.cc3.toFixed(2));
            }

            // Calculate and display nine-point circle metrics
            const metrics = this.circleMetrics.calculateNinePointCircleMetrics();
            const regions = this.circleMetrics.calculateNinePointExternalRegions();

            console.log('Received Nine-Point Circle Metrics:', metrics);
            console.log('Updating dashboard with metrics:', { metrics, regions });

            if (metrics && typeof metrics === 'object') {
                // Update total area
                if (metrics.area !== undefined) {
                    this.setElementValue('#nine-point-area', metrics.area.toFixed(2));
                }

                // Update external and internal areas
                if (regions && regions.totalExternal !== undefined) {
                    this.setElementValue('#nine-point-external', regions.totalExternal.toFixed(2));
                    
                    // Calculate internal area as total - external
                    const internalArea = metrics.area - regions.totalExternal;
                    this.setElementValue('#nine-point-internal', internalArea.toFixed(2));
                    
                    // Calculate and display the ratio
                    if (internalArea === 0) {
                        this.setElementValue('#nine-point-ratio', '0.000');
                    } else {
                        const ratio = regions.totalExternal / internalArea;
                        this.setElementValue('#nine-point-ratio', ratio.toFixed(3));
                    }
                }

                // Debug check for HTML elements
                console.log('Found elements:', {
                    totalArea: document.querySelector('#nine-point-area') ? 'yes' : 'no',
                    externalArea: document.querySelector('#nine-point-external') ? 'yes' : 'no',
                    internalArea: document.querySelector('#nine-point-internal') ? 'yes' : 'no',
                    areaRatio: document.querySelector('#nine-point-ratio') ? 'yes' : 'no'
                });
            }

        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }
} 