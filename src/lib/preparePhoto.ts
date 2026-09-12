import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

// These cache files can be copied into local storage or uploaded by a repository.
export async function preparePhoto(uri: string) {
  const context = ImageManipulator.manipulate(uri);
  let original: ImageRef | undefined;
  const outputs: { uri: string; bytes: number }[] = [];
  try {
    original = await context.renderAsync();
    for (const [maxEdge, compress] of [[1200, 0.7], [360, 0.65]]) {
      if (Math.max(original.width, original.height) > maxEdge) {
        context.resize(original.width >= original.height ? { width: maxEdge } : { height: maxEdge });
      }
      const rendered = await context.renderAsync();
      try {
        const saved = await rendered.saveAsync({ compress, format: SaveFormat.JPEG });
        const output = { uri: saved.uri, bytes: 0 };
        outputs.push(output);
        output.bytes = new File(saved.uri).size;
      } finally {
        rendered.release();
      }
    }
    return { image: outputs[0], thumbnail: outputs[1] };
  } catch (error) {
    for (const output of outputs) {
      try { new File(output.uri).delete(); } catch { /* OS cache cleanup is the fallback. */ }
    }
    throw error;
  } finally {
    original?.release();
    context.release();
  }
}
