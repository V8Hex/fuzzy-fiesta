import { requireOptionalNativeModule } from 'expo-modules-core';
const native = requireOptionalNativeModule<{recognize:(uri:string)=>Promise<string>}>('FridgefulOcr');
export const canScan = !!native;
export async function recognizeReceipt(uri: string): Promise<string> {
  if(!native) throw new Error('Photo scanning is available in the installed Fridgeful app. For this preview, paste receipt text below.');
  return native.recognize(uri);
}
