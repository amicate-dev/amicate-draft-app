import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

export type CropMode = 'square' | 'rect4x3';

/**
 * Center-crops a local image URI to the given aspect (square or 4:3 landscape).
 */
export async function cropLocalImage(uri: string, mode: CropMode): Promise<string> {
  const { width: W, height: H } = await getImageSize(uri);
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
    ],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  );

  return result.uri;
}
