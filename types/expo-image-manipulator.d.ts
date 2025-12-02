declare module 'expo-image-manipulator' {
  export enum SaveFormat {
    JPEG = 'jpeg',
    PNG = 'png',
    WEBP = 'webp'
  }

  export type ManipulateAction =
    | { resize: { width: number; height?: number } }
    | { rotate: number }
    | { flip: 'horizontal' | 'vertical' }
    | { crop: { originX: number; originY: number; width: number; height: number } };

  export interface ManipulateResult {
    uri: string;
    width: number;
    height: number;
    base64?: string;
  }

  export function manipulateAsync(
    uri: string,
    actions: ManipulateAction[],
    options?: { compress?: number; format?: SaveFormat; base64?: boolean }
  ): Promise<ManipulateResult>;

  const ImageManipulator: {
    manipulateAsync: typeof manipulateAsync;
    SaveFormat: typeof SaveFormat;
  };

  export default ImageManipulator;
}
