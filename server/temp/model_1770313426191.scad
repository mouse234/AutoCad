// Filename: enclosure_m75.scad
// Description: Cylindrical electronics enclosure with M75x2.0 internal threads
// Units: Millimeters

$fn = 80; // Resolution for smooth curves (increase to 150 for final export)

/* [Dimensions] */
// Base Outer Diameter
body_od = 80; 
// Inner Diameter
body_id = 72; 
// Total Height
height = 50; 
// Wall thickness
wall_thick = 4;
// Solid base thickness
base_thick = 5;

/* [Manufacturing] */
// External edge fillet radius
fillet_r = 1.5; 
// Draft angle (degrees outward)
draft_angle = 1; 

/* [Threads] */
// Thread nominal size (e.g., 75 for M75)
thread_dia = 75; 
// Thread pitch
thread_pitch = 2.0; 
// Length of threaded section
thread_len = 10; 
// Clearance for 3D printing fit
tolerance = 0.2; 

/* [Vents] */
num_vents = 8;
vent_h = 20;
vent_w = 4;
vent_offset = 8; // From base floor (inside)

// Slight overlap for boolean operations
epsilon = 0.02;

module main() {
    difference() {
        // 1. Positive Body
        enclosure_body();

        // 2. Inner Chamber
        translate([0, 0, base_thick])
            cylinder(h = height, d = body_id);

        // 3. Ventilation Slots
        create_vents();

        // 4. Internal Thread (Top)
        // Move to top, subtract thread tool
        translate([0, 0, height - thread_len])
            metric_thread_tool_internal(dia=thread_dia, pitch=thread_pitch, length=thread_len + 1);
    }
}

module enclosure_body() {
    // Calculate top radius based on draft angle
    // tan(angle) = opposite/adjacent -> opp = tan(angle)*adj
    draft_delta = height * tan(draft_angle);
    r_base = body_od / 2;
    r_top = r_base + draft_delta;

    rotate_extrude() {
        // We use offset() to create the fillet.
        // We define the shape *smaller* by the fillet radius, 
        // then offset *outwards* by the radius.
        
        offset(r = fillet_r) {
            // Polygon for the wall cross-section
            // We use intersection with square to ensure no points go X < 0
            // during the offset operation, though logical points here are safe.
            
            polygon(points=[
                [0, 0], // Center bottom
                [r_base - fillet_r, 0], // Bottom corner (inset)
                [r_top - fillet_r, height - fillet_r], // Top outer corner (inset)
                [0, height - fillet_r] // Top center (inset for height)
            ]);
        }
    }
}

module create_vents() {
    // Calculate Z position (global)
    // Starts at base_thick + offset
    z_pos = base_thick + vent_offset + (vent_h / 2);
    
    // Radius to position the cutter (center of wall)
    cut_r = body_od/2;

    for (i = [0 : num_vents-1]) {
        rotate([0, 0, i * (360 / num_vents)]) {
            translate([cut_r, 0, z_pos]) {
                rotate([0, 90, 0]) { // Rotate to face outward
                    hull() {
                        // Top circle of slot
                        translate([vent_h/2 - vent_w/2, 0, 0])
                            cylinder(d=vent_w, h=wall_thick*3, center=true);
                        // Bottom circle of slot
                        translate([-(vent_h/2 - vent_w/2), 0, 0])
                            cylinder(d=vent_w, h=wall_thick*3, center=true);
                    }
                }
            }
        }
    }
}

// Parametric Thread Cutter
// Generates a "bolt" shape to be subtracted from the body
module metric_thread_tool_internal(dia, pitch, length) {
    major_r = (dia + tolerance) / 2;
    
    // Metric thread depth approximation
    // h = 0.866 * P, but we cut 5/8H usually. 
    // For 3D printing, a simpler 60-deg triangle works best.
    thread_depth = 0.6 * pitch; 
    
    // Number of turns
    turns = length / pitch;
    
    intersection() {
        // Bounds to cut clean top/bottom
        translate([0,0, -epsilon])
            cylinder(h=length+epsilon*2, r=dia);
            
        union() {
            // The Helix
            linear_extrude(height = length, twist = -360 * turns, slices = turns * 72) {
                translate([major_r - thread_depth/1.5, 0]) {
                    rotate([0, 0, -90]) // Orient triangle
                    polygon(points=[
                        [-pitch/1.8, 0],      // Bottom
                        [0, thread_depth],    // Tip (pointing out)
                        [pitch/1.8, 0]        // Top
                    ]);
                }
            }
            
            // Solid center for the cutter (removes the core material)
            cylinder(r = major_r - thread_depth/1.5, h = length);
        }
    }
    
    // Add a chamfer cylinder at the top for lead-in
    translate([0, 0, length - pitch])
        cylinder(h=pitch, r1=major_r - 0.5, r2=major_r + 0.5);
}

// Render
main();