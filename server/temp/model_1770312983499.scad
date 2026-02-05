// Filename: enclosure_body.scad
// Description: Cylindrical electronics enclosure body with M75x2.0 threads
// Units: mm

$fn = 100; // Resolution for smooth curves

// --- Dimensions & Parameters ---
body_od = 80;
body_id = 72;
body_height = 50;
wall_thickness = 4;
base_thickness = 5;

// Manufacturing
fillet_radius = 1.5;
draft_angle = 1; // degrees outward

// Features
thread_d = 75; // M75
thread_pitch = 2.0;
thread_length = 10;

// Vents
vent_count = 8;
vent_height = 20;
vent_width = 4;
vent_bottom_offset = 8;

module main_enclosure() {
    difference() {
        // 1. Positive Geometry: Main Body Shell
        generate_outer_shell();

        // 2. Negative Geometry: Inner Chamber
        // Start slightly below base_thickness to ensure clean boolean
        translate([0, 0, base_thickness])
            cylinder(h = body_height, d = body_id);
            
        // 3. Negative Geometry: Ventilation Slots
        generate_vents();
        
        // 4. Negative Geometry: Internal Threads
        // Positioned at the top of the cylinder
        translate([0, 0, body_height - thread_length])
            iso_thread_cut(d=thread_d, pitch=thread_pitch, len=thread_length + 0.1); 
            // +0.1 to ensure it cuts through the top face
    }
}

module generate_outer_shell() {
    // We construct the profile in 2D then rotate extrude.
    // We use offset() to create the fillets, so we must calculate
    // the core shape dimensions by subtracting the fillet radius.
    
    r_base_outer = body_od / 2;
    
    // Calculate draft offset: tan(theta) = opposite / adjacent
    // delta_r = height * tan(draft)
    draft_offset = body_height * tan(draft_angle);
    
    r_top_outer = r_base_outer + draft_offset;

    // To compensate for the offset(r=fillet_radius), we shrink the polygon points
    // inwards by the fillet amount.
    p_r_base = r_base_outer - fillet_radius;
    p_r_top  = r_top_outer - fillet_radius;
    p_h      = body_height - fillet_radius; 
    
    // We treat the bottom Z as 0 (but shifted up by fillet for the hull)
    
    rotate_extrude() {
        offset(r = fillet_radius) {
            polygon(points=[
                [0, 0],                             // Center bottom
                [p_r_base, 0],                      // Outer bottom edge
                [p_r_top, p_h],                     // Outer top edge
                [0, p_h]                            // Center top
            ]);
        }
    }
}

module generate_vents() {
    // Calculate Z position relative to global origin
    // Base thickness + Offset
    z_start = base_thickness + vent_bottom_offset;
    
    // Radius to push vents out to (just needs to be wider than wall)
    cut_radius = body_od / 2;

    for (i = [0 : vent_count - 1]) {
        angle = i * (360 / vent_count);
        rotate([0, 0, angle]) {
            translate([body_od/2, 0, z_start + vent_height/2])
                rotate([0, 90, 0]) // Lay flat to punch through wall
                    hull() {
                        // Create a "stadium" shape slot for better printability
                        // Top of slot
                        translate([vent_height/2 - vent_width/2, 0, 0])
                            cylinder(h=20, d=vent_width, center=true);
                        // Bottom of slot
                        translate([-(vent_height/2 - vent_width/2), 0, 0])
                            cylinder(h=20, d=vent_width, center=true);
                    }
        }
    }
}

// --- Thread Generation Module ---
// Generates a triangular spiral to subtract from the body
module iso_thread_cut(d, pitch, len) {
    // Standard ISO Metric thread params
    // Internal thread depth is usually ~0.54 * P to 0.61 * P
    // We use a simplified triangular cutter 
    
    h_iso = 0.866025 * pitch;
    h_cut = 5/8 * h_iso; // Standard depth
    
    // Create a single turn and loop it
    // Using a high segment count for the spiral ensures smoothness
    steps_per_turn = 72; 
    turns = len / pitch;
    total_steps = turns * steps_per_turn;
    step_angle = 360 / steps_per_turn;
    
    union() {
        for(i = [0:total_steps]) {
            angle = i * step_angle;
            z_pos = (i / steps_per_turn) * pitch;
            
            // Render only if within length (plus a bit for overlap)
            if (z_pos < len + pitch) {
                translate([0, 0, z_pos])
                rotate([0, 0, angle])
                translate([d/2, 0, 0]) // Move to major diameter
                rotate([90, 0, 0])     // Orient cutter
                rotate([0, 0, 180])    // Face inwards
                
                // Create a small segment of the thread
                linear_extrude(height = (3.14159 * d) / steps_per_turn * 1.1, center=true)
                    polygon(points=[
                        [0, 0], // Tip of thread (at Major Dia)
                        [-h_cut, -pitch/2.2], // Root top
                        [-h_cut, pitch/2.2]   // Root bottom
                    ]);
            }
        }
        
        // Chamfer the entry of the thread for easier assembly
        translate([0,0, len])
            cylinder(h=pitch, r1=d/2, r2=d/2 + 1);
    }
}

// Render the part
main_enclosure();