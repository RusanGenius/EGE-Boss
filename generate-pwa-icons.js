import { Jimp } from 'jimp';
import path from 'path';

async function generateIcons() {
  try {
    const srcPath = path.join(process.cwd(), 'public', 'icon.png');
    console.log('Loading source icon from:', srcPath);
    
    const originalImage = await Jimp.read(srcPath);
    console.log(`Original image size: ${originalImage.width}x${originalImage.height}`);
    
    // We will generate two standard sizes for the manifest: 192x192 and 512x512
    // To make it maskable, the logo itself should occupy about 60% of the canvas.
    const sizes = [192, 512];
    
    for (const size of sizes) {
      // Create a solid background image with the app's brand theme color (#111112)
      const bg = new Jimp({
        width: size,
        height: size,
        color: 0x111112ff // RGBA format
      });
      
      // Calculate scaled size of the logo (48% of total size to fit safe zone circle perfectly)
      const logoSize = Math.round(size * 0.48);
      
      // Clone original image and resize it
      const logo = originalImage.clone().resize({ w: logoSize, h: logoSize });
      
      // Composite (draw) the logo in the center of the background
      const x = Math.round((size - logoSize) / 2);
      const y = Math.round((size - logoSize) / 2);
      bg.composite(logo, x, y);
      
      // Save the resulting image
      const destName = `icon-pwa-${size}.png`;
      const destPath = path.join(process.cwd(), 'public', destName);
      await bg.write(destPath);
      console.log(`Successfully generated safe PWA icon: ${destName}`);
    }
    
    console.log('PWA icon generation completed successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
