import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import './App.scss'
import Processor from './augmentedReality/Processor';
import Image from './augmentedReality/imageProcessing/Image';
import { PuzzleBox } from './augmentedReality/imageProcessing/extractBoxes';
import { row } from 'mathjs';
const processor = new Processor();

const drawImage = (image: HTMLImageElement, thresholded: Image, context: CanvasRenderingContext2D) => {
  const byteArray = thresholded!.bytes;
  const width = image.width;  // Example width (you can change it)
  const height = image.height; // Example height (you can change it)

  // Ensure that your byte array has the correct size for the canvas
  // The byte array should contain width * height values for a grayscale image
  if (byteArray.length !== width * height) {
    console.error("Byte array size does not match canvas dimensions!");
  }

  const imageData = context.createImageData(width, height);

  // Loop through each pixel and set the RGBA values
  for (let i = 0; i < byteArray.length; i++) {
    const grayscaleValue = byteArray[i];
    const pixelIndex = i * 4; // Each pixel has 4 values (R, G, B, A)

    // Set the red, green, blue, and alpha channels
    imageData.data[pixelIndex] = grayscaleValue;     // Red
    imageData.data[pixelIndex + 1] = grayscaleValue; // Green
    imageData.data[pixelIndex + 2] = grayscaleValue; // Blue
    imageData.data[pixelIndex + 3] = 255;           // Alpha (fully opaque)
  }

  // Put the image data onto the canvas
  context.putImageData(imageData, 0, 0);
}

const drawExtractedImage = (image: Image, context: CanvasRenderingContext2D) => {
  const byteArray = image!.bytes;
  const width = 900;  // Example width (you can change it)
  const height = 900; // Example height (you can change it)

  // Ensure that your byte array has the correct size for the canvas
  // The byte array should contain width * height values for a grayscale image
  if (byteArray.length !== width * height) {
    console.error("Byte array size does not match canvas dimensions!");
  }

  const imageData = context.createImageData(width, height);

  // Loop through each pixel and set the RGBA values
  for (let i = 0; i < byteArray.length; i++) {
    const grayscaleValue = byteArray[i];
    const pixelIndex = i * 4; // Each pixel has 4 values (R, G, B, A)

    // Set the red, green, blue, and alpha channels
    imageData.data[pixelIndex] = grayscaleValue;     // Red
    imageData.data[pixelIndex + 1] = grayscaleValue; // Green
    imageData.data[pixelIndex + 2] = grayscaleValue; // Blue
    imageData.data[pixelIndex + 3] = 255;           // Alpha (fully opaque)
  }

  // Put the image data onto the canvas
  context.putImageData(imageData, 0, 0);
}

function App() {
  const [image, setImage] = useState<string>();
  const imageRef = useRef<HTMLImageElement>(null);
  const [puzzleBoxes, setPuzzleBoxes] = useState<PuzzleBox[]>([])

  const onFileChanged = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImage(file ? URL.createObjectURL(file) : undefined);
  }, []);

  const processImage = useCallback(async () => {
    if (imageRef.current) {
      (await processor.processFrame(imageRef.current))!;
      if (processor.boxes) {
        setPuzzleBoxes(processor.boxes);
      }
    }
  }, [imageRef.current]);

  const solveSudoku = useCallback(() => {
    let rows = [];
    for (let rowIndex = 0; rowIndex < 9; rowIndex++) {
      let row: (number | null)[] = [];
      for (let colIndex = 0; colIndex < 9; colIndex++) {
        const detectedDigit = puzzleBoxes.find(pb => pb.y === rowIndex && pb.x == colIndex);
        row.push(detectedDigit?.contents || null);
      }
      rows.push(row);
    }
    const body = JSON.stringify(rows);
    fetch(import.meta.env.VITE_APP_SOLVE_ENDPOINT, { method: 'post', body: body })
      .then(res => console.log(res.json()));
  }, [puzzleBoxes]);

  let detectedSudoku = <></>
  if (puzzleBoxes.length > 0) {
    let rows = [];
    for (let rowIndex = 0; rowIndex < 9; rowIndex++) {
      let row = [];
      for (let colIndex = 0; colIndex < 9; colIndex++) {
        const detectedDigit = puzzleBoxes.find(pb => pb.y === rowIndex && pb.x == colIndex);
        row.push(<td key={`td-${rowIndex}-${colIndex}`} className={`border text-xl [&:nth-child(3n):not(:last-child)]:border-r-4`}>{detectedDigit?.contents}</td>);
      }
      rows.push(row);
    }

    detectedSudoku = <table className='h-[300px] w-[300px] border-4'>
      <tbody>
        {rows.map((r, i) => {
          return <tr key={i} className='[&:nth-child(3n):not(:last-child)]:border-b-4'>
            {r}
          </tr>;
        })}
      </tbody>
    </table>;
  }

  return (
    <>
      <input
        type='file'
        accept='image/*'
        onChange={onFileChanged}
      />
      <div className="">

        <div className='flex flex-col'>
          {image &&
            <>
              <div className='flex gap-4 items-center'>
                <div className='flex-1 flex items-center justify-center'>
                  <img className='w-[300px]' ref={imageRef} src={image} onLoad={processImage} />
                </div>
                <div className='flex-1'>
                  {detectedSudoku}
                </div>
              </div>
              {puzzleBoxes.length > 0 && <button onClick={solveSudoku}>Solve</button>}
            </>
          }

        </div>
      </div>
    </>
  )
}

export default App
