import os
from PIL import Image

# We may need to install pillow_avif_plugin to read avif format in Pillow
# Let's try to open the image and sample the top-left pixel color.
img_path = r"c:\Users\skdha\Downloads\ASM-staging\ASM-staging\frontend\public\asm_loginpage_img.avif"

try:
    # Check if pillow-avif-plugin is available, import it
    try:
        import pillow_avif
    except ImportError:
        pass

    with Image.open(img_path) as im:
        rgb_im = im.convert('RGB')
        # Sample the top-left pixel
        color = rgb_im.getpixel((0, 0))
        # Also sample a few pixels to find a common color
        colors = []
        for x in range(0, min(im.width, 10)):
            for y in range(0, min(im.height, 10)):
                colors.append(rgb_im.getpixel((x, y)))
        most_common = max(set(colors), key=colors.count)
        print(f"Top-left color: {color}")
        print(f"Most common top-left color: {most_common}")
        print(f"Hex: #{most_common[0]:02x}{most_common[1]:02x}{most_common[2]:02x}")
except Exception as e:
    print(f"Error reading image: {e}")
