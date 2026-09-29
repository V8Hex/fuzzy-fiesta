const { withDangerousMod, withGradleProperties } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

// Recover any empty output left by a failed image conversion during prebuild.
module.exports = function withSplashRepair(config) {
  // Keep the complete linked resources in the release APK. Some AAPT/AGP
  // combinations can report optimization success without writing its output.
  config = withGradleProperties(config, mod => {
    mod.modResults = mod.modResults.filter(entry => entry.key !== 'android.enableResourceOptimizations');
    mod.modResults.push({ type:'property', key:'android.enableResourceOptimizations', value:'false' });
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const original = PNG.sync.read(fs.readFileSync(path.join(mod.modRequest.projectRoot, 'assets/splash.png')));
    for (const [density, factor] of Object.entries({ mdpi:1, hdpi:1.5, xhdpi:2, xxhdpi:3, xxxhdpi:4 })) {
      const folder = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res', `drawable-${density}`);
      const target = path.join(folder, 'splashscreen_logo.png');
      if (!fs.existsSync(target) || fs.statSync(target).size > 32) continue;
      const size = Math.round(288 * factor);
      const resized = new PNG({ width:size, height:size });
      for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
        const sourceOffset = (Math.min(original.height-1, Math.floor(y*original.height/size))*original.width + Math.min(original.width-1, Math.floor(x*original.width/size)))*4;
        original.data.copy(resized.data,(y*size+x)*4,sourceOffset,sourceOffset+4);
      }
      fs.writeFileSync(target, PNG.sync.write(resized));
    }
    return mod;
  }]);
};
