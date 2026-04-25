from PIL import Image

img = Image.open('stitch-frontend/public/assets/plain-map.png').convert('RGB')
w, h = img.size

# old coordinates
cities = {
    "nyc":          (0.294, 0.273),
    "havana":       (0.271, 0.371),
    "buenos_aires": (0.338, 0.692),
    "london":       (0.499, 0.214),
    "berlin":       (0.537, 0.208),
    "moscow":       (0.604, 0.190),
    "cairo":        (0.586, 0.333),
    "tel-aviv":     (0.596, 0.322),
    "dubai":        (0.653, 0.360),
    "bangalore":    (0.715, 0.428),
    "singapore":    (0.788, 0.492),
    "beijing":      (0.823, 0.278),
    "tokyo":        (0.887, 0.302),
    "sydney":       (0.920, 0.687)
}

# Find the background color (top left pixel)
bg_color = img.getpixel((0, 0))

print("Background color:", bg_color)

# For each city, let's keep X constant, and search Y downwards for land
# land is anything not bg_color
for name, (x_norm, y_norm) in cities.items():
    x = int(x_norm * w)
    
    # scan y from top to bottom at this x
    land_y_start = -1
    for y in range(h):
        if img.getpixel((x, y)) != bg_color:
            land_y_start = y
            break
            
    print(f"{name}: Old Y = {y_norm:.3f}. Land starts at Y = {land_y_start/h:.3f} (Pixel {land_y_start})")
