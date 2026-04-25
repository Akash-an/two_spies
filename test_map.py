import cv2
import numpy as np

# Load image
img = cv2.imread('stitch-frontend/public/assets/plain-map.png')
h, w, _ = img.shape

# Cities and my estimated coordinates
cities = {
    "nyc":          (0.22, 0.32),
    "havana":       (0.21, 0.42),
    "buenos_aires": (0.30, 0.72),
    "london":       (0.47, 0.24),
    "berlin":       (0.50, 0.24),
    "moscow":       (0.55, 0.20),
    "cairo":        (0.55, 0.38),
    "tel-aviv":     (0.57, 0.36),
    "dubai":        (0.62, 0.40),
    "bangalore":    (0.69, 0.50),
    "singapore":    (0.75, 0.58),
    "beijing":      (0.81, 0.32),
    "tokyo":        (0.88, 0.32),
    "sydney":       (0.88, 0.75)
}

for name, (nx, ny) in cities.items():
    x = int(nx * w)
    y = int(ny * h)
    cv2.circle(img, (x, y), 10, (0, 0, 255), -1)
    cv2.putText(img, name, (x+15, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

cv2.imwrite('map_test.png', img)
