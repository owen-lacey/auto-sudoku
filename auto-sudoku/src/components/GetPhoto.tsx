import { ChangeEvent, useCallback, useRef } from "react";
import Webcam from "react-webcam";

function GetPhoto({ setImage }: { setImage: (src: string | undefined) => void }) {
  const cameraRef = useRef<Webcam>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const onFileChanged = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImage(file ? URL.createObjectURL(file) : undefined);
  }, []);

  const takePhoto = useCallback(() => {
    if (cameraRef.current) {
      const screenshot = cameraRef.current!.getScreenshot();
      setImage(screenshot || undefined);
    }
  }, [cameraRef.current]);
  const videoConstraints: MediaTrackConstraints = {
    facingMode: { ideal: 'environment' }
  };

  return <div className='flex-1 flex flex-col'>
    <h3 className="font-mono">Auto Sudoku</h3>
    <div className='flex-1'>
      <Webcam
        ref={cameraRef}
        videoConstraints={videoConstraints}
        className='w-auto' />
    </div>
    <div className='flex gap-4'>
      <input
        className='hidden'
        ref={imageInputRef}
        type='file'
        accept='image/*'
        onChange={onFileChanged}
      />
      <button className='flex-1' onClick={takePhoto}>Take photo</button>
      <button className='flex-1' onClick={() => imageInputRef.current!.click()}>Select photo</button>

    </div>
  </div>;
}

export default GetPhoto;