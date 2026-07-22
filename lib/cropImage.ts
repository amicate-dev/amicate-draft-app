import * as ImageManipulator from 'expo-image-manipulator';

export type CropMode = 'square' | 'rect4x3';

export async function cropLocalImage(uri: string, mode: CropMode): Promise<string> {
  const meta = await ImageManipulator.manipulateAsync(uri, []);
  const { width: W, height: H } = meta;

  let cropW: number;
  let cropH: number;
  let originX: number;
  let originY: number;

  if (mode === 'square') {
    const side = Math.min(W, H);
    cropW = side;
    cropH = side;
    originX = (W - side) / 2;
    originY = (H - side) / 2;
  } else {
    const targetAspect = 4 / 3;
    const imageAspect = W / H;
    if (imageAspect > targetAspect) {
      cropH = H;
      cropW = H * targetAspect;
      originX = (W - cropW) / 2;
      originY = 0;
    } else {
      cropW = W;
      cropH = W / targetAspect;
      originX = 0;
      originY = (H - cropH) / 2;
    }
  }

  const finalWidth = Math.min(1080, cropW)

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: Math.max(0, originX),
          originY: Math.max(0, originY),
          width: cropW,
          height: cropH,
        },
      },
      { resize: { width: finalWidth }}
    ],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG}
  );

  return result.uri;
}