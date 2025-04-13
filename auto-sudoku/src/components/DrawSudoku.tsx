import { useRef, useCallback, useState, useEffect } from "react";
import { PuzzleBox } from "../augmentedReality/imageProcessing/extractBoxes";
import Processor from "../augmentedReality/Processor";
import { Point } from "../augmentedReality/imageProcessing/getLargestConnectedComponent";
import { Dialog, DialogPanel, DialogTitle, Button, DialogBackdrop } from "@headlessui/react";
const processor = new Processor();

function calculateCanvasPath(vertices: Point[]) {
  const pointsToDraw = 60;
  const pointsPerVertex = pointsToDraw / vertices.length;
  var waypoints = [];
  for (var i = 1; i < vertices.length; i++) {
    var pt0 = vertices[i - 1];
    var pt1 = vertices[i];
    var dx = pt1.x - pt0.x;
    var dy = pt1.y - pt0.y;
    for (var j = 0; j <= pointsPerVertex; j++) {
      var x = pt0.x + dx * j / pointsPerVertex;
      var y = pt0.y + dy * j / pointsPerVertex;
      waypoints.push({
        x: x,
        y: y
      });
    }
  }
  return (waypoints);
}

function animate(index: number, points: Point[], context: CanvasRenderingContext2D, callback: () => void) {
  if (index < points.length - 1) {
    requestAnimationFrame(() => animate(index, points, context, callback));
  } else {
    callback();
  }
  context.beginPath();
  context.moveTo(points[index - 1].x, points[index - 1].y);
  context.lineTo(points[index].x, points[index].y);
  context.stroke();
  index++;
}

function getDigits(puzzleBoxes: PuzzleBox[]): (number | null)[][] {
  let rows: (number | null)[][] = [];
  for (let rowIndex = 0; rowIndex < 9; rowIndex++) {
    let row: (number | null)[] = [];
    for (let colIndex = 0; colIndex < 9; colIndex++) {
      const detectedDigit = puzzleBoxes.find(pb => pb.y === rowIndex && pb.x == colIndex);
      row.push(detectedDigit?.contents || null);
    }
    rows.push(row);
  }
  return rows;
}

function DrawSudoku({ image, onReadyToSolve, onTryAgain }: { image: string, onReadyToSolve: (boxes: (number | null)[][]) => void, onTryAgain: () => void }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [puzzleBoxes, setPuzzleBoxes] = useState<PuzzleBox[]>([]);
  const [imageDims, setImageDims] = useState<{ w: number, h: number }>();
  const [sudokuFound, setSudokuFound] = useState(false);
  const [processedImage, setProcessedImage] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const processImage = useCallback(async () => {
    if (imageRef.current) {
      (await processor.processFrame(imageRef.current))!;

      // https://www.technologyreview.com/2012/01/06/188520/mathematicians-solve-minimum-sudoku-problem/
      if (processor.boxes.length >= 17) {
        setPuzzleBoxes(processor.boxes);
      } else {
        setProcessedImage(true);
      }
    }
  }, [imageRef.current]);

  useEffect(() => {
    if (imageRef.current) {
      setImageDims({ w: imageRef.current!.width, h: imageRef.current!.height })
    }
  }, [imageRef.current]);


  useEffect(() => {
    const context = canvasRef?.current?.getContext('2d');
    if (context && imageDims) {

      context.strokeStyle = "rgba(0,200,0,0.5)";
      context.lineWidth = 3;
      if (processor.corners) {
        const points: Point[] = [];
        const {
          topLeft,
          topRight,
          bottomLeft,
          bottomRight,
        } = processor.corners;
        points.push(topLeft);
        points.push(topRight);
        points.push(bottomRight);
        points.push(bottomLeft);
        points.push(topLeft);

        window.requestAnimationFrame(() => animate(1, calculateCanvasPath(points), context, () => {
          if (puzzleBoxes.length > 0) {
            setSudokuFound(true);
            setProcessedImage(true);
            setTimeout(() => onReadyToSolve(getDigits(puzzleBoxes)), 1000);
          }
        }));
        if (processor.gridLines) {

          processor.gridLines.forEach((line) => {
            const points: Point[] = [];
            points.push(line.p1);
            points.push(line.p2);
            window.requestAnimationFrame(() => animate(1, calculateCanvasPath(points), context, () => { }));
          });
        }
      }
    }
  }, [puzzleBoxes, imageDims]);

  useEffect(() => {
    if (processedImage && !sudokuFound) {
      setErrorDialogOpen(true);
    }
  }, [sudokuFound, processedImage]);

  const dialogClosed = useCallback(() => {
    setErrorDialogOpen(false);
    onTryAgain();
  }, [])

  return <div className='flex-1 flex flex-col'>
    <h3 className="font-mono">{!sudokuFound ? 'Analysing image...' : 'Sudoku found'}</h3>
    {image &&
      <div className='flex-1 flex items-center justify-center'>
        <div className={`relative flex items-center justify-center transition duration-1000 ${sudokuFound ? 'opacity-0' : ''}`}>
          <img
            ref={imageRef}
            src={image}
            onLoad={processImage} />
          {imageDims && <canvas
            height={imageDims!.h}
            width={imageDims!.w}
            ref={canvasRef}
            className={`absolute top-0 left-0`}></canvas>}
        </div>
      </div>
    }

    <Dialog open={errorDialogOpen} as="div" className="relative z-10 focus:outline-none" onClose={close}>
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-md rounded-xl bg-white/5 p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
          >
            <DialogTitle as="h3" className="text-base/7 font-medium text-white">
              Couldn't find Sudoku
            </DialogTitle>
            <p className="mt-2 text-sm/6 text-white/50">
              Unfortunately, we couldn't find a Sudoku in your image.
              Make sure you use an image with good lighting, with your Sudoku as close to portrait as possible.
            </p>
            <div className="mt-4">
              <Button
                className="inline-flex items-center gap-2 rounded-md bg-gray-700 py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-600 data-[focus]:outline-1 data-[focus]:outline-white data-[open]:bg-gray-700"
                onClick={dialogClosed}
              >
                Try again
              </Button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  </div>;
}

export default DrawSudoku;