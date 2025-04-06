import fillInPrediction from "./imageRecognition/tensorflow";
import getLargestConnectedComponent, {
  Point,
} from "./imageProcessing/getLargestConnectedComponent";
import findHomographicTransform, {
  Transform,
  transformPoint,
} from "./imageProcessing/findHomographicTransform";
import captureImage from "./imageProcessing/captureImage";
import adaptiveThreshold from "./imageProcessing/adaptiveThreshold";
import getCornerPoints from "./imageProcessing/getCornerPoints";
import extractSquareFromRegion from "./imageProcessing/applyHomographicTransform";
import extractBoxes, { PuzzleBox } from "./imageProcessing/extractBoxes";
import Image from "./imageProcessing/Image";

// size of image to use for processing
const PROCESSING_SIZE = 900;

type SolvedBox = {
  // was this a known digit?
  isKnown: boolean;
  // the digit for this box
  digit: number;
  // a guess at how tall it should be drawn
  digitHeight: number;
  // a guess at the rotation to draw it at
  digitRotation: number;
  // where to draw it
  position: Point;
};

export default class Processor {
  // are we in the middle of processing a frame?
  isProcessing: boolean = false;
  // the detected corners of the puzzle in video space
  corners: {
    topLeft: Point;
    topRight: Point;
    bottomLeft: Point;
    bottomRight: Point;
  } | null = null;

  greyscale: Image | null = null;
  thresholded: Image | null = null;
  extractedImageThresholded: Image | null = null;
  boxes: PuzzleBox[] = [];

  // the calculated grid lines in the video space
  gridLines: { p1: Point; p2: Point }[] | null = null;
  // performance stats
  captureTime: number = 0;
  thresholdTime: number = 0;
  connectedComponentTime: number = 0;
  cornerPointTime: number = 0;
  extractPuzzleTime: number = 0;
  extractBoxesTime: number = 0;
  neuralNetTime: number = 0;
  solveTime: number = 0;
  /**
   * Process a frame of video
   */
  async processFrame(img: HTMLImageElement) {
    if (this.isProcessing) {
      // we're already processing a frame. Don't kill the computer!
      return;
    }
    try {
      // grab an image from the video camera
      let startTime = performance.now();
      const image = captureImage(img);
      this.greyscale = image;
      this.captureTime =
        0.1 * (performance.now() - startTime) + this.captureTime * 0.9;

      // apply adaptive thresholding to the image
      startTime = performance.now();
      const thresholded = adaptiveThreshold(image.clone(), 8, 20);
      this.thresholded = thresholded;
      this.thresholdTime =
        0.1 * (performance.now() - startTime) + this.thresholdTime * 0.9;

      // extract the most likely candidate connected region from the image
      startTime = performance.now();
      const largestConnectedComponent = getLargestConnectedComponent(
        thresholded,
        {
          minAspectRatio: 0.5,
          maxAspectRatio: 1.5,
          minSize:
            Math.min(img.width, img.height) * 0.1,
          maxSize:
            Math.max(img.width, img.height),
        }
      );
      this.connectedComponentTime =
        0.1 * (performance.now() - startTime) +
        this.connectedComponentTime * 0.9;

      // if we actually found something
      if (largestConnectedComponent) {
        // make a guess at where the corner points are using manhattan distance
        startTime = performance.now();
        const potentialCorners = getCornerPoints(largestConnectedComponent);
        this.cornerPointTime =
          0.1 * (performance.now() - startTime) + this.cornerPointTime * 0.9;

        if (this.sanityCheckCorners(potentialCorners)) {
          this.corners = potentialCorners;

          // compute the transform to go from a square puzzle of size PROCESSING_SIZE to the detected corner points
          startTime = performance.now();
          const transform = findHomographicTransform(
            PROCESSING_SIZE,
            this.corners
          );

          // we've got the transform so we can show where the gridlines are
          this.gridLines = this.createGridLines(transform);

          // extract the square puzzle from the original grey image
          const extractedImageGreyScale = extractSquareFromRegion(
            image,
            PROCESSING_SIZE,
            transform
          );
          // extract the square puzzle from the thresholded image - we'll use the thresholded image for determining where the digits are in the cells
          const extractedImageThresholded = extractSquareFromRegion(
            thresholded,
            PROCESSING_SIZE,
            transform
          );
          this.extractedImageThresholded = extractedImageThresholded;
          this.extractPuzzleTime =
            0.1 * (performance.now() - startTime) +
            this.extractPuzzleTime * 0.9;

          // extract the boxes that should contain the numbers
          startTime = performance.now();
          const boxes = extractBoxes(
            extractedImageGreyScale,
            extractedImageThresholded
          );
          this.boxes = boxes;
          this.extractBoxesTime =
            0.1 * (performance.now() - startTime) + this.extractBoxesTime * 0.9;

          // apply the neural network to the found boxes and work out what the digits are
          startTime = performance.now();
          await fillInPrediction(boxes);
          this.neuralNetTime =
            0.1 * (performance.now() - startTime) + this.neuralNetTime * 0.9;
        } else {
          this.corners = null;
          this.gridLines = null;
        }
      } else {
        this.corners = null;
        this.gridLines = null;
      }
    } catch (error) {
      console.error(error);
    }
    this.isProcessing = false;
  }

  /**
   * Creates a set of grid lines mapped onto video space
   * @param transform The homographic transform to video space
   */
  createGridLines(transform: Transform) {
    const boxSize = PROCESSING_SIZE / 9;
    const gridLines = [];
    for (let l = 1; l < 9; l++) {
      // horizonal line
      gridLines.push({
        p1: transformPoint({ x: 0, y: l * boxSize }, transform),
        p2: transformPoint({ x: PROCESSING_SIZE, y: l * boxSize }, transform),
      });
      // vertical line
      gridLines.push({
        p1: transformPoint({ y: 0, x: l * boxSize }, transform),
        p2: transformPoint({ y: PROCESSING_SIZE, x: l * boxSize }, transform),
      });
    }
    return gridLines;
  }

  /**
   * Create a set of cells with coordinates in video space for drawing digits
   * @param x Cell X
   * @param y Cell Y
   * @param digit The digit
   * @param isKnown Is it a known digit?
   * @param transform The homographic transform to video space
   */
  getTextDetailsForBox(
    x: number,
    y: number,
    digit: number,
    isKnown: boolean,
    transform: Transform
  ): SolvedBox {
    const boxSize = PROCESSING_SIZE / 9;
    // work out the line that runs vertically through the box in the original image space
    const p1 = transformPoint(
      { x: (x + 0.5) * boxSize, y: y * boxSize },
      transform
    );
    const p2 = transformPoint(
      { x: (x + 0.5) * boxSize, y: (y + 1) * boxSize },
      transform
    );
    // the center of the box
    const textPosition = transformPoint(
      { x: (x + 0.5) * boxSize, y: (y + 0.5) * boxSize },
      transform
    );
    // approximate angle of the text in the box
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const digitRotation = Math.atan2(dx, dy);

    // appriximate height of the text in the box
    const digitHeight = 0.8 * Math.sqrt(dx * dx + dy * dy);

    return {
      digit,
      digitHeight,
      digitRotation,
      isKnown: isKnown,
      position: textPosition,
    };
  }

  sanityCheckCorners({
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
  }: {
    topLeft: Point;
    topRight: Point;
    bottomLeft: Point;
    bottomRight: Point;
  }) {
    function length(p1: Point, p2: Point) {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
    const topLineLength = length(topLeft, topRight);
    const leftLineLength = length(topLeft, bottomLeft);
    const rightLineLength = length(topRight, bottomRight);
    const bottomLineLength = length(bottomLeft, bottomRight);
    if (
      topLineLength < 0.5 * bottomLineLength ||
      topLineLength > 1.5 * bottomLineLength
    )
      return false;
    if (
      leftLineLength < 0.7 * rightLineLength ||
      leftLineLength > 1.3 * rightLineLength
    )
      return false;
    if (
      leftLineLength < 0.5 * bottomLineLength ||
      leftLineLength > 1.5 * bottomLineLength
    )
      return false;
    return true;
  }
}
