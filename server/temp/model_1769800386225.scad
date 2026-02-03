// Cuboid with holes and a central cylinder

// Dimensions
cuboid_length = 100;
cuboid_width  = 80;
cuboid_height = 20;
hole_diameter = 5;
hole_offset   = 5;
cylinder_diameter = 20;
cylinder_height = 50;

module cuboid_with_features() {
    // Create the cuboid
    cube([cuboid_length, cuboid_width, cuboid_height]);

    // Create holes
    translate([hole_offset, hole_offset, -1])
    cylinder(h = cuboid_height + 2, d = hole_diameter); // Ensure hole goes all the way through

    translate([cuboid_length - hole_offset, hole_offset, -1])
    cylinder(h = cuboid_height + 2, d = hole_diameter);

    translate([hole_offset, cuboid_width - hole_offset, -1])
    cylinder(h = cuboid_height + 2, d = hole_diameter);

    translate([cuboid_length - hole_offset, cuboid_width - hole_offset, -1])
    cylinder(h = cuboid_height + 2, d = hole_diameter);

    // Create the cylinder on top
    translate([cuboid_length/2, cuboid_width/2, cuboid_height])
    cylinder(h = cylinder_height, d = cylinder_diameter);
}

cuboid_with_features();