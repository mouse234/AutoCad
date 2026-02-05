// Cylindrical Electronics Enclosure - Body Only
// Dimensions: 80mm OD, 72mm ID, 50mm Height
// Features: M75x2.0 Internal Thread, Ventilation Slots
// Units: mm

$fn = 100; // High resolution for smooth curves and threads

// --- Parameters ---
// Main Dimensions
height_total = 50;
dia_outer_base = 80;
dia_inner = 72;
thickness_base = 5;
wall_thickness = 4;

// Manufacturing Features
fillet_radius = 1.5;
draft_angle = 1; // Degrees outward

// Ventilation
slot_count = 8;
slot_height = 20;
slot_width = 4;
slot_elevation = 8; // From inside floor (base thickness + this)

// Thread Specs (M75 x 2.0)
thread_nominal_dia = 75;
thread_pitch = 2.0;
thread_length = 10;
thread_depth_ratio = 0.541; // Standard ISO metric depth factor

// Epsilon for boolean overlap
eps = 0.05;

// --- Main Construction ---

difference() {
    // 1. Positive Volume: Outer Shell with Draft and Fillets
    outer_shell();

    // 2. Negative Volume: Main Internal Bore
    translate([0, 0, thickness_base])
        cylinder(h = height_total, d = dia_inner, center = false);
    
    // 3. Negative Volume: Threads
    translate([0, 0, height_total - thread_length])
        generate_internal_thread();

    // 4. Negative Volume: Ventilation Slots
    generate_vents();
}

// --- Modules ---

module outer_shell() {
    radius_base = dia_outer_base / 2;
    
    // Calculate top radius based on draft angle
    // tan(angle) = opposite / adjacent -> opposite = h * tan(angle)
    radius_top = radius_base + (height_total * tan(draft_angle));

    rotate_extrude() {
        // We use offset() to create the fillets. 
        // To maintain precise dimensions, we define a smaller polygon
        // and let offset expand it back to the target dimensions.
        offset(r = fillet_radius) {
            polygon(points = [
                [0.1, 0], // Center-ish bottom (keeps X>0 rule)
                [radius_base - fillet_radius, 0], // Bottom right
                [radius_top - fillet_radius, height_total - fillet_radius], // Top right (drafted)
                [0.1, height_total - fillet_radius] // Top center-ish
            ]);
        }
    }
}

module generate_internal_thread() {
    // M75 x 2.0 Internal Thread Logic
    // We create a "tap" object to subtract from the body
    
    major_r = thread_nominal_dia / 2;
    // For internal threads, we cut slightly larger than nominal to ensure fit, 
    // but here we stick to nominal ISO profile subtraction.
    
    thread_depth = thread_pitch * thread_depth_ratio;
    
    union() {
        // A. Thread Relief / Lead-in (Cylindrical cutout for the minor diameter)
        // Minor diameter approx = Major - 2 * thread_depth
        // We ensure the area is cleared for the thread teeth
        translate([0, 0, -eps])
            cylinder(h = thread_length + eps*2, r = major_r - thread_depth + 0.1);

        // B. The Helix Cutter
        intersection() {
            // Constrain thread to the cylinder height
            translate([0, 0, -eps])
                cylinder(h = thread_length + eps, r = major_r + 1);
            
            // Generate the spiral
            translate([0, 0, -thread_pitch]) // Start lower to cut fully
                metric_thread_helix(
                    pitch = thread_pitch, 
                    length = thread_length + thread_pitch * 2, 
                    major_r = major_r
                );
        }
        
        // C. Top Chamfer (45 degree lead-in)
        translate([0, 0, thread_length - 1.5])
            cylinder(h = 1.5 + eps, r1 = major_r - thread_depth, r2 = major_r + 0.5);
    }
}

module metric_thread_helix(pitch, length, major_r) {
    turns = length / pitch;
    h_tooth = pitch * 0.866025; // Height of equilateral triangle
    
    // Create the spiral profile
    linear_extrude(height = length, twist = -360 * turns, slices = 72 * turns) {
        translate([major_r, 0])
            rotate([0, 0, -90]) // Align tooth to radial direction
                polygon(points = [
                    [0, -pitch/2],           // Bottom of tooth root
                    [-h_tooth, 0],           // Tip of tooth (pointing inward)
                    [0, pitch/2]             // Top of tooth root
                ]);
    }
}

module generate_vents() {
    // Start height relative to global Z
    z_start = thickness_base + slot_elevation;
    
    for(i = [0 : slot_count-1]) {
        rotate([0, 0, i * (360 / slot_count)]) {
            translate([dia_inner/2 - 5, -slot_width/2, z_start]) {
                // Use hull for rounded slot ends
                hull() {
                    cube([20, slot_width, eps]); // Bottom
                    translate([0, 0, slot_height - slot_width]) // Top is offset by width for full radius
                        cube([20, slot_width, eps]);
                    
                    // Add cylinders for perfectly round ends (optional, cube hull is faster/cleaner for simple slots)
                    // Here we just use a cube that cuts through the wall
                    // To make it fully rounded ends:
                    translate([0, slot_width/2, slot_width/2])
                        rotate([0, 90, 0])
                        cylinder(h=20, d=slot_width);
                        
                    translate([0, slot_width/2, slot_height - slot_width/2])
                        rotate([0, 90, 0])
                        cylinder(h=20, d=slot_width);
                }
            }
        }
    }
}