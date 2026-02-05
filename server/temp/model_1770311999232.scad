// Electronics Enclosure Body - Main Unit
// Dimensions: 80mm OD, 72mm ID, 50mm Height
// Features: M75x2.0 Internal Thread, Drafted Walls, Ventilation

/* [Dimensions] */
outer_diameter = 80;
inner_diameter = 72;
total_height = 50;
wall_thickness = 4;
base_thickness = 5;

/* [Features] */
fillet_radius = 1.5;
draft_angle = 1; // Degrees outward
vent_slots = 8;
slot_height = 20;
slot_width = 4;
slot_elevation = 8; // Height from bottom

/* [Thread Settings] */
thread_diameter = 75; // M75
thread_pitch = 2.0;
thread_length = 10;

/* [Rendering] */
$fn = 100; // Resolution for smoothness

module main_body() {
    difference() {
        // 1. Positive Body (Outer Shell)
        outer_shell();

        // 2. Subtract Inner Volume
        translate([0, 0, base_thickness])
            cylinder(h = total_height, d = inner_diameter);

        // 3. Subtract Threads at the top
        translate([0, 0, total_height - thread_length])
            iso_thread_cut(d=thread_diameter, pitch=thread_pitch, len=thread_length + 1); // +1 for overlap

        // 4. Subtract Ventilation Slots
        ventilation_slots();
    }
}

module outer_shell() {
    // We create a 2D profile and rotate_extrude it to create the drafted, filleted cylinder.
    // To maintain precise dimensions with fillets, we define a smaller polygon and offset it.
    
    r_base = outer_diameter / 2;
    // Calculate top radius expansion due to draft: tan(theta) = opp/adj
    draft_offset = total_height * tan(draft_angle); 
    r_top = r_base + draft_offset;

    rotate_extrude() {
        offset(r = fillet_radius) {
            // Polygon is inset by fillet_radius to ensure final dim is correct after offset
            polygon(points = [
                [0, 0], // Center bottom
                [r_base - fillet_radius, 0], // Bottom right (inset)
                [r_top - fillet_radius, total_height - fillet_radius], // Top right (inset)
                [0, total_height - fillet_radius] // Center top
            ]);
        }
    }
}

module ventilation_slots() {
    slot_angle_step = 360 / vent_slots;
    
    // Z position is strictly from base bottom (z=0) + elevation
    z_pos = slot_elevation + (slot_height / 2); 
    
    for (i = [0 : vent_slots - 1]) {
        rotate([0, 0, i * slot_angle_step]) {
            translate([(outer_diameter / 2), 0, z_pos]) {
                rotate([0, 90, 0]) {
                    // Using hull of two cylinders for rounded slot ends (better printability)
                    hull() {
                        translate([-(slot_height/2) + (slot_width/2), 0, -10])
                            cylinder(h=20, d=slot_width);
                        translate([(slot_height/2) - (slot_width/2), 0, -10])
                            cylinder(h=20, d=slot_width);
                    }
                }
            }
        }
    }
}

// Minimalistic Metric Thread Cutter Module
module iso_thread_cut(d, pitch, len) {
    // ISO thread profile is 60 degrees. 
    // Basic triangular cutting tool spiraled around.
    
    major_r = d / 2;
    // Depth of thread (approximate for printing tolerance)
    thread_depth = 0.6134 * pitch; 
    
    translate([0,0,-pitch]) // Start slightly lower to ensure clean cut
    intersection() {
        // Bound the thread generation to a cylinder
        cylinder(h=len+pitch, r=major_r + 1);
        
        // Generate helix
        // Using linear_extrude with twist is the standard OpenSCAD way for threads
        linear_extrude(height = len + pitch, twist = -360 * ((len + pitch) / pitch), slices = (len/pitch)*20) {
            translate([major_r - (thread_depth/2), 0])
            circle(r=thread_depth, $fn=3); // Simplified cutter profile
             
            // Note: For a true ISO profile, a polygon is better, but a triangle
            // works excellent for 3D printing internal threads due to overhangs.
            // Using a circle(fn=3) creates a triangle pointing outwards.
            // We adjust position to cut into the wall.
        }
    }
}

// Render the part
main_body();